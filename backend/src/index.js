require('dotenv').config();
const express = require('express');
const cors = require('cors');

const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const departmentRoutes = require('./routes/departments');
const policyRoutes = require('./routes/policies');
const pointRoutes = require('./routes/points');
const dashboardRoutes = require('./routes/dashboard');
const slaRoutes = require('./routes/sla');
// Ghosting detection via cronService (connects to external task board)
const { startCronJobs } = require('./services/cronService');

const app = express();
const PORT = process.env.PORT || 7860;

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/departments', departmentRoutes);
app.use('/api/policies', policyRoutes);
app.use('/api/points', pointRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/sla', slaRoutes);
// Task board ghosting integration handled via cronService (no standalone task CRUD)

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', service: 'Prokip P3 API' });
});

app.listen(PORT, () => {
  console.log(`P3 API running on port ${PORT}`);
  // Start automated jobs (Jira ghosting checks, etc.)
  startCronJobs();
});

module.exports = app;
