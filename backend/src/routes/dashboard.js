const express = require('express');
const prisma = require('../config/db');
const { authenticate, authorize } = require('../middleware/auth');
const { getGradeInfo } = require('../utils/gradeCalculator');

const router = express.Router();

// GET /api/dashboard/admin - Admin/Lead overview
router.get('/admin', authenticate, authorize('ADMIN', 'LEAD'), async (req, res) => {
  try {
    const { page = 1, limit = 25, search, department, grade } = req.query;
    const pageNum = parseInt(page);
    const limitNum = Math.min(parseInt(limit) || 25, 100); // Cap at 100

    const where = { role: { not: 'ADMIN' } }; // Admins are not graded
    if (req.user.role === 'LEAD') {
      where.departmentId = req.user.departmentId;
    }
    if (search) {
      where.OR = [
        { firstName: { contains: search, mode: 'insensitive' } },
        { lastName: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
      ];
    }
    if (department) {
      where.departmentId = department;
    }
    if (grade) {
      where.grade = grade;
    }

    // Get paginated rankings (NOT all users)
    const [rankings, total] = await Promise.all([
      prisma.user.findMany({
        where,
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          points: true,
          grade: true,
          role: true,
          department: { select: { id: true, name: true } },
        },
        orderBy: { points: 'desc' },
        skip: (pageNum - 1) * limitNum,
        take: limitNum,
      }),
      prisma.user.count({ where }),
    ]);

    // Use DB aggregation for stats instead of loading all users
    const deptFilter = req.user.role === 'LEAD'
      ? { departmentId: req.user.departmentId, role: { not: 'ADMIN' } }
      : { role: { not: 'ADMIN' } }; // Exclude admins from all grade stats

    const [stats, gradeDistribution, atRisk, topPerformers, recentActivity] = await Promise.all([
      // Aggregate stats in DB
      prisma.user.aggregate({
        where: deptFilter,
        _avg: { points: true },
        _count: true,
      }),

      // Grade distribution via groupBy (DB-level, not JS)
      prisma.user.groupBy({
        by: ['grade'],
        where: deptFilter,
        _count: true,
      }),

      // At-risk members (Grade F) — top 10 only
      prisma.user.findMany({
        where: { ...deptFilter, grade: 'F' },
        select: {
          id: true, firstName: true, lastName: true,
          points: true, grade: true,
          department: { select: { name: true } },
        },
        orderBy: { points: 'asc' },
        take: 10,
      }),

      // Top performers (A+) — top 10 only
      prisma.user.findMany({
        where: { ...deptFilter, grade: 'A_PLUS' },
        select: {
          id: true, firstName: true, lastName: true,
          points: true, grade: true,
          department: { select: { name: true } },
        },
        orderBy: { points: 'desc' },
        take: 10,
      }),

      // Recent activity — last 20
      prisma.pointLog.findMany({
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
      }),
    ]);

    // Format grade distribution from groupBy result
    const gradeDist = { A_PLUS: 0, A: 0, B: 0, C: 0, F: 0 };
    gradeDistribution.forEach(g => {
      gradeDist[g.grade] = g._count;
    });

    res.json({
      stats: {
        totalMembers: stats._count,
        avgPoints: Math.round(stats._avg.points || 0),
        atRiskCount: gradeDist.F,
        topPerformerCount: gradeDist.A_PLUS,
      },
      gradeDistribution: gradeDist,
      rankings,
      total,
      page: pageNum,
      limit: limitNum,
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

    const gradeInfo = await getGradeInfo(user.grade, user.departmentId);

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

    // Rank among peers (same department)
    const rank = user.departmentId
      ? await prisma.user.count({
          where: {
            departmentId: user.departmentId,
            points: { gt: user.points },
          },
        }) + 1
      : null;

    res.json({
      points: user.points,
      grade: user.grade,
      gradeInfo,
      department: user.department,
      rank,
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
