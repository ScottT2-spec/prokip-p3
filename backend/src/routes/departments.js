const express = require('express');
const { body, validationResult } = require('express-validator');
const prisma = require('../config/db');
const { authenticate, authorize } = require('../middleware/auth');

const router = express.Router();

// GET /api/departments
router.get('/', authenticate, async (req, res) => {
  try {
    const departments = await prisma.department.findMany({
      include: { _count: { select: { users: true } } },
      orderBy: { name: 'asc' },
    });
    res.json({ departments });
  } catch (error) {
    console.error('List departments error:', error);
    res.status(500).json({ error: 'Server error.' });
  }
});

// POST /api/departments (Admin only)
router.post('/', authenticate, authorize('ADMIN'), [
  body('name').notEmpty().withMessage('Department name required'),
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    const department = await prisma.department.create({
      data: { name: req.body.name },
    });
    res.status(201).json({ department });
  } catch (error) {
    if (error.code === 'P2002') {
      return res.status(400).json({ error: 'Department already exists.' });
    }
    console.error('Create department error:', error);
    res.status(500).json({ error: 'Server error.' });
  }
});

// DELETE /api/departments/:id (Admin only)
router.delete('/:id', authenticate, authorize('ADMIN'), async (req, res) => {
  try {
    await prisma.department.delete({ where: { id: req.params.id } });
    res.json({ message: 'Department deleted.' });
  } catch (error) {
    console.error('Delete department error:', error);
    res.status(500).json({ error: 'Server error.' });
  }
});

module.exports = router;
