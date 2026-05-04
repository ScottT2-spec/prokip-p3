const express = require('express');
const bcrypt = require('bcryptjs');
const { body, query, validationResult } = require('express-validator');
const prisma = require('../config/db');
const { authenticate, authorize } = require('../middleware/auth');
const { calculateGrade } = require('../utils/gradeCalculator');

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
          department: true,
          createdAt: true,
        },
        orderBy: { points: 'desc' },
        skip: (page - 1) * limit,
        take: parseInt(limit),
      }),
      prisma.user.count({ where }),
    ]);

    res.json({ users, total, page: parseInt(page), limit: parseInt(limit) });
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

module.exports = router;
