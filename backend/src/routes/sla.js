const express = require('express');
const { body, validationResult } = require('express-validator');
const prisma = require('../config/db');
const { authenticate, authorize } = require('../middleware/auth');
const { checkSlaBreach } = require('../utils/workHours');

const router = express.Router();

/**
 * POST /api/sla/check - Check if a review SLA has been breached
 * Used by Admin/Lead to verify SLA compliance before applying points
 */
router.post('/check', authenticate, authorize('ADMIN', 'LEAD'), [
  body('startTime').isISO8601().withMessage('Valid start time required (ISO 8601)'),
  body('slaType').isIn(['urgent', 'medium', 'low']).withMessage('SLA type must be urgent, medium, or low'),
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { startTime, slaType } = req.body;

  const slaHours = {
    urgent: 1,
    medium: 2,
    low: 5,
  };

  const result = checkSlaBreach(new Date(startTime), slaHours[slaType]);

  res.json({
    slaType,
    slaLimit: `${slaHours[slaType]} work hour(s)`,
    elapsedWorkHours: result.elapsedWorkHours,
    breached: result.breached,
    pointDeduction: result.breached ? {
      urgent: -10,
      medium: -5,
      low: -3,
    }[slaType] : 0,
  });
});

module.exports = router;
