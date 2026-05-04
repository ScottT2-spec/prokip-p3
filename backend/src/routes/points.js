const express = require('express');
const { body, validationResult } = require('express-validator');
const prisma = require('../config/db');
const { authenticate, authorize } = require('../middleware/auth');
const { calculateGrade } = require('../utils/gradeCalculator');
const { sendPointChangeEmail, sendPlatinumHighFive } = require('../services/emailService');

const router = express.Router();

// POST /api/points - Add/deduct points (Admin/Lead only)
router.post('/', authenticate, authorize('ADMIN', 'LEAD'), [
  body('userId').isUUID().withMessage('Valid user ID required'),
  body('policyId').optional().isUUID(),
  body('points').isInt().withMessage('Points must be an integer'),
  body('reason').notEmpty().withMessage('Reason is required'),
  body('ticketLink').optional().isString(),
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    const { userId, policyId, points, reason, ticketLink } = req.body;

    // Get target user
    const targetUser = await prisma.user.findUnique({ where: { id: userId } });
    if (!targetUser) {
      return res.status(404).json({ error: 'User not found.' });
    }

    // Admins cannot receive points — only Leads and Members
    if (targetUser.role === 'ADMIN') {
      return res.status(400).json({ error: 'Admins are not part of the points system.' });
    }

    // Leads can only update their own department members
    if (req.user.role === 'LEAD' && targetUser.departmentId !== req.user.departmentId) {
      return res.status(403).json({ error: 'Can only update points for your department members.' });
    }

    // If policyId provided, use the policy's point value
    let pointValue = points;
    if (policyId) {
      const policy = await prisma.policy.findUnique({ where: { id: policyId } });
      if (policy) {
        pointValue = policy.pointImpact;
      }
    }

    const newTotal = targetUser.points + pointValue;
    // Admins are not graded — only Leads and Members
    const newGrade = targetUser.role === 'ADMIN' ? targetUser.grade : calculateGrade(newTotal);
    const previousGrade = targetUser.grade;

    // Transaction: create log + update user points
    const [pointLog, updatedUser] = await prisma.$transaction([
      prisma.pointLog.create({
        data: {
          userId,
          givenById: req.user.id,
          policyId: policyId || null,
          points: pointValue,
          reason,
          ticketLink: ticketLink || null,
        },
      }),
      prisma.user.update({
        where: { id: userId },
        data: {
          points: newTotal,
          grade: newGrade,
        },
        include: { department: true },
      }),
    ]);

    // Send point change email
    sendPointChangeEmail(updatedUser, pointValue, newTotal, reason, req.user);

    // Send Platinum High-Five if crossed into A+
    if (newGrade === 'A_PLUS' && previousGrade !== 'A_PLUS') {
      sendPlatinumHighFive(updatedUser, newTotal);
    }

    const { password: _, ...userWithoutPassword } = updatedUser;

    res.status(201).json({
      pointLog,
      user: userWithoutPassword,
      gradeChanged: previousGrade !== newGrade,
    });
  } catch (error) {
    console.error('Add points error:', error);
    res.status(500).json({ error: 'Server error.' });
  }
});

// GET /api/points/history/:userId - Point history for a user
router.get('/history/:userId', authenticate, async (req, res) => {
  try {
    // Members can only view their own history
    if (req.user.role === 'MEMBER' && req.user.id !== req.params.userId) {
      return res.status(403).json({ error: 'Insufficient permissions.' });
    }

    const { page = 1, limit = 20 } = req.query;

    const [logs, total] = await Promise.all([
      prisma.pointLog.findMany({
        where: { userId: req.params.userId },
        include: {
          givenBy: { select: { firstName: true, lastName: true } },
          policy: { select: { name: true, description: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: parseInt(limit),
      }),
      prisma.pointLog.count({ where: { userId: req.params.userId } }),
    ]);

    res.json({ logs, total, page: parseInt(page), limit: parseInt(limit) });
  } catch (error) {
    console.error('Point history error:', error);
    res.status(500).json({ error: 'Server error.' });
  }
});

module.exports = router;
