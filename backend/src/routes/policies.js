const express = require('express');
const { body, validationResult } = require('express-validator');
const prisma = require('../config/db');
const { authenticate, authorize } = require('../middleware/auth');

const router = express.Router();

// GET /api/policies - List all policies
router.get('/', authenticate, async (req, res) => {
  try {
    const where = {};

    // Show global policies + department-specific ones
    if (req.user.role === 'LEAD') {
      where.OR = [
        { isGlobal: true },
        { departmentId: req.user.departmentId },
      ];
    }

    const policies = await prisma.policy.findMany({
      where,
      include: { department: true },
      orderBy: { name: 'asc' },
    });

    res.json({ policies });
  } catch (error) {
    console.error('List policies error:', error);
    res.status(500).json({ error: 'Server error.' });
  }
});

// POST /api/policies - Create policy (Admin/Lead)
router.post('/', authenticate, authorize('ADMIN', 'LEAD'), [
  body('name').notEmpty().withMessage('Policy name required'),
  body('description').notEmpty().withMessage('Description required'),
  body('pointImpact').isInt().withMessage('Point impact must be an integer'),
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    const { name, description, pointImpact, departmentId } = req.body;

    // Leads can only create department-specific policies
    const isGlobal = req.user.role === 'ADMIN' && !departmentId;
    const deptId = req.user.role === 'LEAD' ? req.user.departmentId : departmentId;

    const policy = await prisma.policy.create({
      data: {
        name,
        description,
        pointImpact,
        isGlobal,
        departmentId: deptId || null,
      },
      include: { department: true },
    });

    res.status(201).json({ policy });
  } catch (error) {
    console.error('Create policy error:', error);
    res.status(500).json({ error: 'Server error.' });
  }
});

// PUT /api/policies/:id - Update policy (Admin/Lead)
router.put('/:id', authenticate, authorize('ADMIN', 'LEAD'), async (req, res) => {
  try {
    const { name, description, pointImpact } = req.body;

    const policy = await prisma.policy.update({
      where: { id: req.params.id },
      data: {
        ...(name && { name }),
        ...(description && { description }),
        ...(pointImpact !== undefined && { pointImpact }),
      },
      include: { department: true },
    });

    res.json({ policy });
  } catch (error) {
    console.error('Update policy error:', error);
    res.status(500).json({ error: 'Server error.' });
  }
});

// DELETE /api/policies/:id (Admin only)
router.delete('/:id', authenticate, authorize('ADMIN'), async (req, res) => {
  try {
    await prisma.policy.delete({ where: { id: req.params.id } });
    res.json({ message: 'Policy deleted.' });
  } catch (error) {
    console.error('Delete policy error:', error);
    res.status(500).json({ error: 'Server error.' });
  }
});

module.exports = router;
