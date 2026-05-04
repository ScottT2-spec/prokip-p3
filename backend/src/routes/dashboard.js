const express = require('express');
const prisma = require('../config/db');
const { authenticate, authorize } = require('../middleware/auth');
const { getGradeInfo } = require('../utils/gradeCalculator');

const router = express.Router();

// GET /api/dashboard/admin - Admin/Lead overview
router.get('/admin', authenticate, authorize('ADMIN', 'LEAD'), async (req, res) => {
  try {
    const where = {};
    if (req.user.role === 'LEAD') {
      where.departmentId = req.user.departmentId;
    }

    // Get all users with their points
    const users = await prisma.user.findMany({
      where,
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        points: true,
        grade: true,
        role: true,
        department: true,
      },
      orderBy: { points: 'desc' },
    });

    // Calculate stats
    const totalMembers = users.length;
    const avgPoints = totalMembers > 0
      ? Math.round(users.reduce((sum, u) => sum + u.points, 0) / totalMembers)
      : 0;

    const atRisk = users.filter(u => u.grade === 'F');
    const topPerformers = users.filter(u => u.grade === 'A_PLUS');

    const gradeDistribution = {
      A_PLUS: users.filter(u => u.grade === 'A_PLUS').length,
      A: users.filter(u => u.grade === 'A').length,
      B: users.filter(u => u.grade === 'B').length,
      C: users.filter(u => u.grade === 'C').length,
      F: users.filter(u => u.grade === 'F').length,
    };

    // Recent point changes
    const recentActivity = await prisma.pointLog.findMany({
      where: req.user.role === 'LEAD'
        ? { user: { departmentId: req.user.departmentId } }
        : {},
      include: {
        user: { select: { firstName: true, lastName: true } },
        givenBy: { select: { firstName: true, lastName: true } },
        policy: { select: { name: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 20,
    });

    res.json({
      stats: {
        totalMembers,
        avgPoints,
        atRiskCount: atRisk.length,
        topPerformerCount: topPerformers.length,
      },
      gradeDistribution,
      rankings: users,
      atRisk,
      topPerformers,
      recentActivity,
    });
  } catch (error) {
    console.error('Admin dashboard error:', error);
    res.status(500).json({ error: 'Server error.' });
  }
});

// GET /api/dashboard/member - Personal dashboard
router.get('/member', authenticate, async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      include: { department: true },
    });

    const gradeInfo = getGradeInfo(user.grade);

    // Recent point history
    const recentLogs = await prisma.pointLog.findMany({
      where: { userId: req.user.id },
      include: {
        givenBy: { select: { firstName: true, lastName: true } },
        policy: { select: { name: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 10,
    });

    // Points trend (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const pointsTrend = await prisma.pointLog.findMany({
      where: {
        userId: req.user.id,
        createdAt: { gte: thirtyDaysAgo },
      },
      select: { points: true, createdAt: true },
      orderBy: { createdAt: 'asc' },
    });

    res.json({
      points: user.points,
      grade: user.grade,
      gradeInfo,
      department: user.department,
      recentLogs,
      pointsTrend,
      status: gradeInfo.consequence || gradeInfo.reward || 'Good standing',
    });
  } catch (error) {
    console.error('Member dashboard error:', error);
    res.status(500).json({ error: 'Server error.' });
  }
});

module.exports = router;
