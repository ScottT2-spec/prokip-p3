const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');

  // Create departments
  const engineering = await prisma.department.create({ data: { name: 'Engineering' } });
  const sales = await prisma.department.create({ data: { name: 'Sales' } });
  const product = await prisma.department.create({ data: { name: 'Product' } });

  // Create admin user
  const adminPassword = await bcrypt.hash('admin123', 10);
  await prisma.user.create({
    data: {
      email: 'admin@prokip.africa',
      password: adminPassword,
      firstName: 'Super',
      lastName: 'Admin',
      role: 'ADMIN',
      points: 100,
      grade: 'A',
      departmentId: engineering.id,
    },
  });

  // Create default policies
  const policies = [
    { name: 'Early Delivery', description: '+5 per 24 hours ahead of schedule', pointImpact: 5, isGlobal: true },
    { name: 'Urgent Review SLA Met', description: '+5 for meeting urgent review SLA (Reviewer)', pointImpact: 5, isGlobal: true },
    { name: 'Zero-Bug Release', description: '+10 awarded after 48hrs in production with no bugs', pointImpact: 10, isGlobal: true },
    { name: 'Proactive Warning', description: '+5 for flagging a delay >72 hours in advance', pointImpact: 5, isGlobal: true },
    { name: 'Documentation Hero', description: '+5 for creating technical guides for features', pointImpact: 5, isGlobal: true },
    { name: 'Missed Deadline', description: '-15 for missing an agreed-upon deadline', pointImpact: -15, isGlobal: true },
    { name: 'Urgent Review SLA Missed (1hr)', description: '-10 for missing urgent review SLA (Reviewer)', pointImpact: -10, isGlobal: true },
    { name: 'Medium Review SLA Missed (2hrs)', description: '-5 for missing medium review SLA (Reviewer)', pointImpact: -5, isGlobal: true },
    { name: 'Low Review SLA Missed (5hrs)', description: '-3 for missing low review SLA (Reviewer)', pointImpact: -3, isGlobal: true },
    { name: 'Critical Bug Released (Author)', description: '-20 for releasing a critical bug (Author)', pointImpact: -20, isGlobal: true },
    { name: 'Critical Bug Released (Reviewer)', description: '-15 for passing a critical bug in review', pointImpact: -15, isGlobal: true },
    { name: 'Jira/Status Ghosting', description: '-2 per day of no status update', pointImpact: -2, isGlobal: true },
  ];

  for (const policy of policies) {
    await prisma.policy.create({ data: policy });
  }

  // Create reward thresholds
  const thresholds = [
    { grade: 'A_PLUS', minPoints: 105, maxPoints: null, title: 'Platinum', description: 'Elite Performance', consequence: null },
    { grade: 'A', minPoints: 90, maxPoints: 104, title: 'High Performer', description: 'Standard High Performance', consequence: null },
    { grade: 'B', minPoints: 75, maxPoints: 89, title: 'Reliable', description: 'Baseline Reliability', consequence: null },
    { grade: 'C', minPoints: 60, maxPoints: 74, title: 'Warning', description: 'Needs Improvement', consequence: 'Mandatory Estimation Training & peer review' },
    { grade: 'F', minPoints: 0, maxPoints: 59, title: 'Probation', description: 'Critical Performance', consequence: 'Loss of remote work + Daily EOD micromanagement' },
  ];

  for (const threshold of thresholds) {
    await prisma.rewardThreshold.create({ data: threshold });
  }

  console.log('Seed complete!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
