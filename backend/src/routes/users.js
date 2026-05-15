const express = require('express');
const bcrypt = require('bcryptjs');
const { body, query, validationResult } = require('express-validator');
const prisma = require('../config/db');
const { authenticate, authorize } = require('../middleware/auth');
const { calculateGrade } = require('../utils/gradeCalculator');
const upload = require('../middleware/upload');

const router = express.Router();

// GET /api/users - List users (Admin/Lead only)
router.get('/', authenticate, authorize('ADMIN', 'LEAD'), async (req, res) => {
  try {
    const { search, department, grade, page = 1, limit = 20 } = req.query;

    const where = {};

    // Leads can only see their own department
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

    const { sortBy = 'points', sortOrder = 'desc' } = req.query;

    // Determine orderBy based on sortBy param (reward_points sorted client-side)
    let orderBy = { points: 'desc' };
    if (sortBy === 'points') {
      orderBy = { points: sortOrder === 'asc' ? 'asc' : 'desc' };
    } else if (sortBy === 'firstName') {
      orderBy = { firstName: sortOrder === 'asc' ? 'asc' : 'desc' };
    }

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          role: true,
          points: true,
          grade: true,
          avatarUrl: true,
          department: true,
          createdAt: true,
        },
        orderBy,
        skip: (page - 1) * limit,
        take: parseInt(limit),
      }),
      prisma.user.count({ where }),
    ]);

    // Aggregate reward points (positive points only) for each user
    const userIds = users.map(u => u.id);
    let rewardPointsMap = {};
    if (userIds.length > 0) {
      const rewardAggregates = await prisma.pointLog.groupBy({
        by: ['userId'],
        where: {
          userId: { in: userIds },
          points: { gt: 0 },
        },
        _sum: { points: true },
      });
      rewardPointsMap = Object.fromEntries(
        rewardAggregates.map(r => [r.userId, r._sum.points || 0])
      );
    }

    const usersWithRewards = users.map(u => ({
      ...u,
      rewardPoints: rewardPointsMap[u.id] || 0,
    }));

    // Sort by reward points if requested
    if (sortBy === 'rewardPoints') {
      usersWithRewards.sort((a, b) => {
        const diff = sortOrder === 'asc' ? a.rewardPoints - b.rewardPoints : b.rewardPoints - a.rewardPoints;
        return diff !== 0 ? diff : b.points - a.points; // tie-break by total points
      });
    }

    res.json({ users: usersWithRewards, total, page: parseInt(page), limit: parseInt(limit) });
  } catch (error) {
    console.error('List users error:', error);
    res.status(500).json({ error: 'Server error.' });
  }
});

// POST /api/users - Create user (Admin only)
router.post('/', authenticate, authorize('ADMIN'), [
  body('email').isEmail().withMessage('Valid email required'),
  body('firstName').notEmpty().withMessage('First name required'),
  body('lastName').notEmpty().withMessage('Last name required'),
  body('role').isIn(['ADMIN', 'LEAD', 'MEMBER']).withMessage('Invalid role'),
  body('departmentId').optional().isUUID(),
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    const { email, firstName, lastName, role, departmentId } = req.body;

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return res.status(400).json({ error: 'Email already registered.' });
    }

    // Generate temporary password
    const tempPassword = Math.random().toString(36).slice(-8);
    const hashedPassword = await bcrypt.hash(tempPassword, 10);

    const user = await prisma.user.create({
      data: {
        email,
        firstName,
        lastName,
        password: hashedPassword,
        role,
        departmentId: departmentId || null,
        points: 100,
        grade: 'A',
      },
      include: { department: true },
    });

    const { password: _, ...userWithoutPassword } = user;

    res.status(201).json({
      user: userWithoutPassword,
      tempPassword, // Send this to the user via email in production
    });
  } catch (error) {
    console.error('Create user error:', error);
    res.status(500).json({ error: 'Server error.' });
  }
});

// GET /api/users/:id - Get user details
router.get('/:id', authenticate, async (req, res) => {
  try {
    // Members can only view themselves
    if (req.user.role === 'MEMBER' && req.user.id !== req.params.id) {
      return res.status(403).json({ error: 'Insufficient permissions.' });
    }

    const user = await prisma.user.findUnique({
      where: { id: req.params.id },
      include: {
        department: true,
        pointLogs: {
          include: {
            givenBy: { select: { firstName: true, lastName: true } },
            policy: { select: { name: true } },
          },
          orderBy: { createdAt: 'desc' },
          take: 50,
        },
      },
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found.' });
    }

    const { password: _, ...userWithoutPassword } = user;
    res.json({ user: userWithoutPassword });
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ error: 'Server error.' });
  }
});

// PUT /api/users/:id - Update user (Admin only)
router.put('/:id', authenticate, authorize('ADMIN'), async (req, res) => {
  try {
    const { firstName, lastName, role, departmentId } = req.body;

    const user = await prisma.user.update({
      where: { id: req.params.id },
      data: {
        ...(firstName && { firstName }),
        ...(lastName && { lastName }),
        ...(role && { role }),
        ...(departmentId !== undefined && { departmentId: departmentId || null }),
      },
      include: { department: true },
    });

    const { password: _, ...userWithoutPassword } = user;
    res.json({ user: userWithoutPassword });
  } catch (error) {
    console.error('Update user error:', error);
    res.status(500).json({ error: 'Server error.' });
  }
});

// POST /api/users/avatar - Upload profile picture (authenticated user)
router.post('/avatar', authenticate, upload.single('avatar'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No image file provided.' });
    }

    const avatarUrl = `/uploads/${req.file.filename}`;

    const user = await prisma.user.update({
      where: { id: req.user.id },
      data: { avatarUrl },
      include: { department: true },
    });

    const { password: _, ...userWithoutPassword } = user;
    res.json({ user: userWithoutPassword });
  } catch (error) {
    console.error('Avatar upload error:', error);
    res.status(500).json({ error: 'Failed to upload avatar.' });
  }
});

module.exports = router;
