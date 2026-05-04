const express = require('express');
const { body, param, query, validationResult } = require('express-validator');
const prisma = require('../config/db');
const { authenticate, authorize } = require('../middleware/auth');
const { recordTaskActivity, getGhostingUsers, checkGhostingAll } = require('../services/taskBoardService');

const router = express.Router();

/**
 * POST /api/tasks
 * Create/assign a task to a user (Admin/Lead)
 */
router.post('/', authenticate, authorize('ADMIN', 'LEAD'), [
  body('userId').notEmpty().withMessage('User ID required'),
  body('title').notEmpty().withMessage('Task title required'),
  body('taskBoardId').optional(),
  body('dueDate').optional().isISO8601(),
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  try {
    const { userId, title, taskBoardId, description, dueDate } = req.body;

    // Leads can only assign to their department
    if (req.user.role === 'LEAD') {
      const targetUser = await prisma.user.findUnique({ where: { id: userId } });
      if (!targetUser || targetUser.departmentId !== req.user.departmentId) {
        return res.status(403).json({ error: 'Can only assign tasks to your department.' });
      }
    }

    const task = await prisma.task.create({
      data: {
        userId,
        title,
        taskBoardId: taskBoardId || null,
        description: description || null,
        dueDate: dueDate ? new Date(dueDate) : null,
        assignedById: req.user.id,
      },
      include: {
        user: { select: { firstName: true, lastName: true, email: true } },
      },
    });

    res.status(201).json(task);
  } catch (error) {
    console.error('Create task error:', error);
    res.status(500).json({ error: 'Failed to create task.' });
  }
});

/**
 * PUT /api/tasks/:taskId/status
 * Update a task's status (the user assigned to it, or Admin/Lead)
 * This also records activity — proves user is NOT ghosting
 */
router.put('/:taskId/status', authenticate, [
  body('status').isIn(['TODO', 'IN_PROGRESS', 'IN_REVIEW', 'DONE', 'CLOSED']).withMessage('Invalid status'),
  body('comment').optional(),
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  try {
    const task = await prisma.task.findUnique({ where: { id: req.params.taskId } });
    if (!task) return res.status(404).json({ error: 'Task not found.' });

    // Members can only update their own tasks
    if (req.user.role === 'MEMBER' && task.userId !== req.user.id) {
      return res.status(403).json({ error: 'Can only update your own tasks.' });
    }

    const updated = await prisma.task.update({
      where: { id: req.params.taskId },
      data: { status: req.body.status },
    });

    // Record activity to prevent ghosting flag
    await recordTaskActivity(
      task.userId,
      task.id,
      task.title,
      'status_update'
    );

    res.json({ message: 'Status updated.', task: updated });
  } catch (error) {
    console.error('Update task status error:', error);
    res.status(500).json({ error: 'Failed to update status.' });
  }
});

/**
 * POST /api/tasks/:taskId/activity
 * Record any task activity (comment, attachment, etc.) — prevents ghosting
 */
router.post('/:taskId/activity', authenticate, [
  body('activityType').optional().isIn(['comment', 'status_update', 'attachment', 'other']),
], async (req, res) => {
  try {
    const task = await prisma.task.findUnique({ where: { id: req.params.taskId } });
    if (!task) return res.status(404).json({ error: 'Task not found.' });

    if (req.user.role === 'MEMBER' && task.userId !== req.user.id) {
      return res.status(403).json({ error: 'Can only log activity on your own tasks.' });
    }

    const activity = await recordTaskActivity(
      task.userId,
      task.id,
      task.title,
      req.body.activityType || 'other'
    );

    res.json({ message: 'Activity recorded.', activity });
  } catch (error) {
    console.error('Record activity error:', error);
    res.status(500).json({ error: 'Failed to record activity.' });
  }
});

/**
 * GET /api/tasks/my
 * Get current user's tasks
 */
router.get('/my', authenticate, async (req, res) => {
  try {
    const tasks = await prisma.task.findMany({
      where: { userId: req.user.id },
      orderBy: { createdAt: 'desc' },
      include: {
        assignedBy: { select: { firstName: true, lastName: true } },
      },
    });
    res.json(tasks);
  } catch (error) {
    console.error('Get my tasks error:', error);
    res.status(500).json({ error: 'Failed to fetch tasks.' });
  }
});

/**
 * GET /api/tasks
 * Get all tasks (Admin sees all, Lead sees department, Member sees own)
 */
router.get('/', authenticate, async (req, res) => {
  try {
    const where = {};

    if (req.user.role === 'MEMBER') {
      where.userId = req.user.id;
    } else if (req.user.role === 'LEAD') {
      where.user = { departmentId: req.user.departmentId };
    }

    if (req.query.status) where.status = req.query.status;

    const tasks = await prisma.task.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        user: { select: { id: true, firstName: true, lastName: true, department: { select: { name: true } } } },
        assignedBy: { select: { firstName: true, lastName: true } },
      },
    });

    res.json(tasks);
  } catch (error) {
    console.error('Get tasks error:', error);
    res.status(500).json({ error: 'Failed to fetch tasks.' });
  }
});

/**
 * GET /api/tasks/ghosting-report
 * See who's ghosting their tasks (Admin/Lead)
 */
router.get('/ghosting-report', authenticate, authorize('ADMIN', 'LEAD'), async (req, res) => {
  try {
    const ghosting = await getGhostingUsers();

    // Filter to department for Leads
    const filtered = req.user.role === 'LEAD'
      ? ghosting.filter(g => g.user.departmentId === req.user.departmentId)
      : ghosting;

    res.json({
      totalGhosting: filtered.length,
      report: filtered.map(g => ({
        user: {
          id: g.user.id,
          name: `${g.user.firstName} ${g.user.lastName}`,
          points: g.user.points,
          grade: g.user.grade,
          department: g.user.department?.name,
        },
        activeTasks: g.activeTasks.map(t => ({
          id: t.id,
          title: t.title,
          taskBoardId: t.taskBoardId,
          status: t.status,
        })),
        lastActivity: g.lastActivity,
        hoursSinceUpdate: g.hoursSinceUpdate,
        pendingPenalty: -2 * g.activeTasks.length,
      })),
    });
  } catch (error) {
    console.error('Ghosting report error:', error);
    res.status(500).json({ error: 'Failed to generate report.' });
  }
});

/**
 * POST /api/tasks/check-ghosting
 * Manually trigger ghosting check (Admin only)
 */
router.post('/check-ghosting', authenticate, authorize('ADMIN'), async (req, res) => {
  try {
    const result = await checkGhostingAll();
    res.json({ message: 'Ghosting check completed.', ...result });
  } catch (error) {
    console.error('Manual ghosting check error:', error);
    res.status(500).json({ error: 'Ghosting check failed.' });
  }
});

module.exports = router;
