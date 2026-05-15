require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');

const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const departmentRoutes = require('./routes/departments');
const pointRoutes = require('./routes/points');
const dashboardRoutes = require('./routes/dashboard');
const slaRoutes = require('./routes/sla');
const gradeRoutes = require('./routes/grades');
const leaderboardRoutes = require('./routes/leaderboard');
const { router: notificationRoutes } = require('./routes/notifications');
// Ghosting detection via cronService (connects to external task board)
const { startCronJobs } = require('./services/cronService');

const app = express();
const PORT = process.env.PORT || 7860;

// Middleware
app.use(cors());
app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/departments', departmentRoutes);
app.use('/api/points', pointRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/sla', slaRoutes);
app.use('/api/grades', gradeRoutes);
app.use('/api/leaderboard', leaderboardRoutes);
app.use('/api/notifications', notificationRoutes);
// Task board ghosting integration handled via cronService (no standalone task CRUD)

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', service: 'Prokip P3 API' });
});

app.listen(PORT, async () => {
  console.log(`P3 API running on port ${PORT}`);

  // Auto-migrate: ensure new tables/columns exist
  try {
    const prisma = require('./config/db');
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "quarter_settings" (
        "id" TEXT NOT NULL DEFAULT gen_random_uuid(),
        "name" TEXT NOT NULL,
        "startDate" TIMESTAMP(3) NOT NULL,
        "endDate" TIMESTAMP(3) NOT NULL,
        "isActive" BOOLEAN NOT NULL DEFAULT true,
        "departmentId" TEXT,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "quarter_settings_pkey" PRIMARY KEY ("id"),
        CONSTRAINT "quarter_settings_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "departments"("id") ON DELETE SET NULL ON UPDATE CASCADE
      )
    `);

    // Add missing columns to reward_thresholds
    await prisma.$executeRawUnsafe(`ALTER TABLE "reward_thresholds" ADD COLUMN IF NOT EXISTS "reward" TEXT`).catch(() => {});
    await prisma.$executeRawUnsafe(`ALTER TABLE "reward_thresholds" ADD COLUMN IF NOT EXISTS "departmentId" TEXT REFERENCES "departments"("id") ON DELETE SET NULL`).catch(() => {});

    // Drop old unique on grade only, add composite unique (grade + departmentId)
    await prisma.$executeRawUnsafe(`ALTER TABLE "reward_thresholds" DROP CONSTRAINT IF EXISTS "reward_thresholds_grade_key"`).catch(() => {});
    await prisma.$executeRawUnsafe(`
      DO $$ BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'reward_thresholds_grade_departmentId_key') THEN
          ALTER TABLE "reward_thresholds" ADD CONSTRAINT "reward_thresholds_grade_departmentId_key" UNIQUE ("grade", "departmentId");
        END IF;
      END $$
    `).catch(() => {});

    // Add imageUrl to point_logs if missing
    await prisma.$executeRawUnsafe(`ALTER TABLE "point_logs" ADD COLUMN IF NOT EXISTS "imageUrl" TEXT`).catch(() => {});

    // Add category to point_logs if missing
    await prisma.$executeRawUnsafe(`DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'PointCategory') THEN CREATE TYPE "PointCategory" AS ENUM ('PERFORMANCE', 'REWARD'); END IF; END $$`).catch(() => {});
    await prisma.$executeRawUnsafe(`ALTER TABLE "point_logs" ADD COLUMN IF NOT EXISTS "category" "PointCategory" NOT NULL DEFAULT 'PERFORMANCE'`).catch(() => {});

    // Create notifications table if missing
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "notifications" (
        "id" TEXT NOT NULL DEFAULT gen_random_uuid(),
        "userId" TEXT NOT NULL,
        "type" TEXT NOT NULL DEFAULT 'POINT_UPDATE',
        "title" TEXT NOT NULL,
        "message" TEXT NOT NULL,
        "metadata" JSONB,
        "read" BOOLEAN NOT NULL DEFAULT false,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "notifications_pkey" PRIMARY KEY ("id"),
        CONSTRAINT "notifications_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE
      )
    `).catch(() => {});
    await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "notifications_userId_read_createdAt_idx" ON "notifications"("userId", "read", "createdAt" DESC)`).catch(() => {});
    await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "notifications_userId_createdAt_idx" ON "notifications"("userId", "createdAt" DESC)`).catch(() => {});

    // Create RewardType enum if missing
    await prisma.$executeRawUnsafe(`
      DO $$ BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'RewardType') THEN
          CREATE TYPE "RewardType" AS ENUM ('MONETARY', 'GROWTH', 'FLEXIBILITY', 'RECOGNITION', 'CONSEQUENCE');
        END IF;
      END $$
    `).catch(() => {});

    // Create reward_policies table with proper enum types
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "reward_policies" (
        "id" TEXT NOT NULL DEFAULT gen_random_uuid(),
        "grade" "Grade" NOT NULL,
        "title" TEXT NOT NULL,
        "description" TEXT NOT NULL,
        "type" "RewardType" NOT NULL DEFAULT 'RECOGNITION'::"RewardType",
        "isActive" BOOLEAN NOT NULL DEFAULT true,
        "departmentId" TEXT,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "reward_policies_pkey" PRIMARY KEY ("id"),
        CONSTRAINT "reward_policies_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "departments"("id") ON DELETE SET NULL ON UPDATE CASCADE
      )
    `).catch(() => {});

    // Fix existing reward_policies table if columns are TEXT instead of enum
    await prisma.$executeRawUnsafe(`
      DO $$ BEGIN
        IF EXISTS (
          SELECT 1 FROM information_schema.columns 
          WHERE table_name = 'reward_policies' AND column_name = 'grade' AND data_type = 'text'
        ) THEN
          ALTER TABLE "reward_policies" ALTER COLUMN "grade" TYPE "Grade" USING "grade"::"Grade";
        END IF;
        IF EXISTS (
          SELECT 1 FROM information_schema.columns 
          WHERE table_name = 'reward_policies' AND column_name = 'type' AND data_type = 'text'
        ) THEN
          ALTER TABLE "reward_policies" ALTER COLUMN "type" TYPE "RewardType" USING "type"::"RewardType";
          ALTER TABLE "reward_policies" ALTER COLUMN "type" SET DEFAULT 'RECOGNITION'::"RewardType";
        END IF;
      END $$
    `).catch(() => {});

    // Add avatarUrl to users if missing
    await prisma.$executeRawUnsafe(`ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "avatarUrl" TEXT`).catch(() => {});

    // Add indexes for reward_policies
    await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "reward_policies_grade_idx" ON "reward_policies"("grade")`).catch(() => {});
    await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "reward_policies_departmentId_idx" ON "reward_policies"("departmentId")`).catch(() => {});

    console.log('Schema migration complete');
  } catch (err) {
    console.error('Auto-migration error:', err.message);
  }

  // Start automated jobs (Jira ghosting checks, etc.)
  startCronJobs();
});

module.exports = app;
