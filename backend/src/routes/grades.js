const express = require('express');
const { body, validationResult } = require('express-validator');
const prisma = require('../config/db');
const { authenticate, authorize } = require('../middleware/auth');

const router = express.Router();

const VALID_GRADES = ['A_PLUS', 'A', 'B', 'C', 'F'];

// ============================================================
// GRADE DEFINITIONS (Reward Thresholds)
// ============================================================

/**
 * GET /api/grades/definitions
 * Get all grade definitions. 
 * - Admin sees global + all departments
 * - Lead sees global + their department only
 * - Member sees global + their department only
 */
router.get('/definitions', authenticate, async (req, res) => {
  try {
    const { departmentId } = req.query;

    const where = {};

    if (req.user.role === 'LEAD' || req.user.role === 'MEMBER') {
      // Only see global (null) + own department
      where.OR = [
        { departmentId: null },
        { departmentId: req.user.departmentId },
      ];
    } else if (departmentId) {
      // Admin filtering by specific department
      where.OR = [
        { departmentId: null },
        { departmentId },
      ];
    }

    const definitions = await prisma.rewardThreshold.findMany({
      where,
      include: {
        department: { select: { id: true, name: true } },
      },
      orderBy: [
        { departmentId: 'asc' },
        { minPoints: 'desc' },
      ],
    });

    // Group by: global vs department-specific
    const global = definitions.filter(d => !d.departmentId);
    const byDepartment = {};
    definitions.filter(d => d.departmentId).forEach(d => {
      const deptName = d.department?.name || 'Unknown';
      if (!byDepartment[deptName]) byDepartment[deptName] = [];
      byDepartment[deptName].push(d);
    });

    res.json({ global, byDepartment, all: definitions });
  } catch (error) {
    console.error('Get grade definitions error:', error);
    res.status(500).json({ error: 'Failed to load grade definitions.' });
  }
});

/**
 * POST /api/grades/definitions
 * Create or update a grade definition (Admin, or Lead for their dept)
 */
router.post('/definitions', authenticate, authorize('ADMIN', 'LEAD'), [
  body('grade').isIn(VALID_GRADES).withMessage('Invalid grade'),
  body('minPoints').isInt().withMessage('Min points required'),
  body('maxPoints').optional({ nullable: true }).isInt(),
  body('title').notEmpty().withMessage('Title required'),
  body('description').notEmpty().withMessage('Description required'),
  body('reward').optional({ nullable: true }).isString(),
  body('consequence').optional({ nullable: true }).isString(),
  body('departmentId').optional({ nullable: true }).isString(),
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  try {
    const { grade, minPoints, maxPoints, title, description, reward, consequence, departmentId } = req.body;

    // Leads can only define for their department
    if (req.user.role === 'LEAD') {
      if (!departmentId || departmentId !== req.user.departmentId) {
        return res.status(403).json({ error: 'Leads can only define grades for their own department.' });
      }
    }

    const deptId = departmentId || null;

    // Upsert: update if exists for this grade+department, otherwise create
    const existing = await prisma.rewardThreshold.findFirst({
      where: { grade, departmentId: deptId },
    });

    let definition;
    if (existing) {
      definition = await prisma.rewardThreshold.update({
        where: { id: existing.id },
        data: { minPoints, maxPoints: maxPoints ?? null, title, description, reward: reward || null, consequence: consequence || null },
        include: { department: { select: { id: true, name: true } } },
      });
    } else {
      definition = await prisma.rewardThreshold.create({
        data: { grade, minPoints, maxPoints: maxPoints ?? null, title, description, reward: reward || null, consequence: consequence || null, departmentId: deptId },
        include: { department: { select: { id: true, name: true } } },
      });
    }

    res.status(existing ? 200 : 201).json({ definition });
  } catch (error) {
    console.error('Upsert grade definition error:', error);
    res.status(500).json({ error: 'Failed to save grade definition.' });
  }
});

/**
 * DELETE /api/grades/definitions/:id
 * Delete a grade definition (Admin, or Lead for their dept)
 */
router.delete('/definitions/:id', authenticate, authorize('ADMIN', 'LEAD'), async (req, res) => {
  try {
    const definition = await prisma.rewardThreshold.findUnique({
      where: { id: req.params.id },
    });

    if (!definition) return res.status(404).json({ error: 'Definition not found.' });

    // Leads can only delete their department's definitions
    if (req.user.role === 'LEAD' && definition.departmentId !== req.user.departmentId) {
      return res.status(403).json({ error: 'Can only manage your department definitions.' });
    }

    // Don't allow deleting global definitions if user is Lead
    if (req.user.role === 'LEAD' && !definition.departmentId) {
      return res.status(403).json({ error: 'Only admins can modify global grade definitions.' });
    }

    await prisma.rewardThreshold.delete({ where: { id: req.params.id } });
    res.json({ message: 'Definition deleted.' });
  } catch (error) {
    console.error('Delete grade definition error:', error);
    res.status(500).json({ error: 'Failed to delete definition.' });
  }
});

// ============================================================
// QUARTER SETTINGS
// ============================================================

/**
 * GET /api/grades/quarters
 * Get quarter settings
 */
router.get('/quarters', authenticate, async (req, res) => {
  try {
    const where = {};

    if (req.user.role === 'LEAD' || req.user.role === 'MEMBER') {
      where.OR = [
        { departmentId: null },
        { departmentId: req.user.departmentId },
      ];
    }

    const quarters = await prisma.quarterSettings.findMany({
      where,
      include: { department: { select: { id: true, name: true } } },
      orderBy: { endDate: 'desc' },
    });

    const active = quarters.find(q => q.isActive);
    res.json({ quarters, activeQuarter: active || null });
  } catch (error) {
    console.error('Get quarters error:', error);
    res.status(500).json({ error: 'Failed to load quarter settings.' });
  }
});

/**
 * POST /api/grades/quarters
 * Create/update a quarter period (Admin, or Lead for their dept)
 */
router.post('/quarters', authenticate, authorize('ADMIN', 'LEAD'), [
  body('name').notEmpty().withMessage('Quarter name required (e.g., Q2 2026)'),
  body('startDate').isISO8601().withMessage('Valid start date required'),
  body('endDate').isISO8601().withMessage('Valid end date required'),
  body('departmentId').optional({ nullable: true }).isString(),
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  try {
    const { name, startDate, endDate, departmentId } = req.body;

    if (req.user.role === 'LEAD') {
      if (!departmentId || departmentId !== req.user.departmentId) {
        return res.status(403).json({ error: 'Leads can only set quarters for their own department.' });
      }
    }

    const deptId = departmentId || null;

    // Deactivate other active quarters for this scope
    await prisma.quarterSettings.updateMany({
      where: { isActive: true, departmentId: deptId },
      data: { isActive: false },
    });

    const quarter = await prisma.quarterSettings.create({
      data: {
        name,
        startDate: new Date(startDate),
        endDate: new Date(endDate),
        isActive: true,
        departmentId: deptId,
      },
      include: { department: { select: { id: true, name: true } } },
    });

    res.status(201).json({ quarter });
  } catch (error) {
    console.error('Create quarter error:', error);
    res.status(500).json({ error: 'Failed to create quarter.' });
  }
});

/**
 * DELETE /api/grades/quarters/:id
 */
router.delete('/quarters/:id', authenticate, authorize('ADMIN', 'LEAD'), async (req, res) => {
  try {
    const quarter = await prisma.quarterSettings.findUnique({ where: { id: req.params.id } });
    if (!quarter) return res.status(404).json({ error: 'Quarter not found.' });

    if (req.user.role === 'LEAD' && quarter.departmentId !== req.user.departmentId) {
      return res.status(403).json({ error: 'Can only manage your department quarters.' });
    }

    await prisma.quarterSettings.delete({ where: { id: req.params.id } });
    res.json({ message: 'Quarter deleted.' });
  } catch (error) {
    console.error('Delete quarter error:', error);
    res.status(500).json({ error: 'Failed to delete quarter.' });
  }
});

module.exports = router;
