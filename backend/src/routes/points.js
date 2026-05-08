const express = require('express');
const { body, validationResult } = require('express-validator');
const prisma = require('../config/db');
const { authenticate, authorize } = require('../middleware/auth');
const { calculateGrade } = require('../utils/gradeCalculator');
const { sendPointChangeEmail, sendPlatinumHighFive } = require('../services/emailService');
const upload = require('../middleware/upload');

const router = express.Router();

// POST /api/points - Add/deduct points (Admin/Lead only)
// Accepts multipart/form-data (with optional image) or JSON
router.post('/', authenticate, authorize('ADMIN', 'LEAD'), upload.single('image'), async (req, res) => {
  try {
    const { userId, policyId, points, reason, ticketLink } = req.body;

    if (!userId || !reason || points === undefined) {
      return res.status(400).json({ error: 'userId, points, and reason are required.' });
    }

    const pointsInt = parseInt(points);
    if (isNaN(pointsInt)) {
      return res.status(400).json({ error: 'Points must be a number.' });
    }

    // Build image URL if file was uploaded
    const imageUrl = req.file ? `/uploads/${req.file.filename}` : null;

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
    let pointValue = pointsInt;
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
          imageUrl: imageUrl || null,
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

// POST /api/points/bulk - Bulk add/deduct points (Admin/Lead only)
router.post('/bulk', authenticate, authorize('ADMIN', 'LEAD'), async (req, res) => {
  try {
    const { entries } = req.body;

    if (!Array.isArray(entries) || entries.length === 0) {
      return res.status(400).json({ error: 'entries array is required and must not be empty.' });
    }
    if (entries.length > 20) {
      return res.status(400).json({ error: 'Maximum 20 entries per request.' });
    }

    const errors = [];
    const results = [];
    let success = 0;
    let failed = 0;

    // Validate all entries upfront
    for (let i = 0; i < entries.length; i++) {
      const entry = entries[i];
      const row = i + 1;

      if (!entry.userId) { errors.push({ row, message: 'userId is required.' }); failed++; continue; }
      if (entry.points === undefined || entry.points === null || isNaN(Number(entry.points))) {
        errors.push({ row, message: 'points must be a number.' }); failed++; continue;
      }
      if (!entry.reason || typeof entry.reason !== 'string' || !entry.reason.trim()) {
        errors.push({ row, message: 'reason is required.' }); failed++; continue;
      }
      if (!entry.type || !['Performance', 'Reward'].includes(entry.type)) {
        errors.push({ row, message: 'type must be "Performance" or "Reward".' }); failed++; continue;
      }

      const pointsInt = parseInt(entry.points);
      if (entry.type === 'Reward' && pointsInt <= 0) {
        errors.push({ row, message: 'Reward points must be positive.' }); failed++; continue;
      }

      // Get target user
      const targetUser = await prisma.user.findUnique({ where: { id: entry.userId } });
      if (!targetUser) {
        errors.push({ row, message: 'User not found.' }); failed++; continue;
      }

      // Admins cannot receive points
      if (targetUser.role === 'ADMIN') {
        errors.push({ row, message: 'Admins are not part of the points system.' }); failed++; continue;
      }

      // Leads can only update their own department
      if (req.user.role === 'LEAD' && targetUser.departmentId !== req.user.departmentId) {
        errors.push({ row, message: 'Can only update points for your department members.' }); failed++; continue;
      }

      try {
        const newTotal = targetUser.points + pointsInt;
        const newGrade = targetUser.role === 'ADMIN' ? targetUser.grade : calculateGrade(newTotal);
        const previousGrade = targetUser.grade;

        const [pointLog, updatedUser] = await prisma.$transaction([
          prisma.pointLog.create({
            data: {
              userId: entry.userId,
              givenById: req.user.id,
              points: pointsInt,
              reason: entry.reason.trim(),
            },
          }),
          prisma.user.update({
            where: { id: entry.userId },
            data: { points: newTotal, grade: newGrade },
            include: { department: true },
          }),
        ]);

        // Send emails (non-blocking)
        sendPointChangeEmail(updatedUser, pointsInt, newTotal, entry.reason.trim(), req.user);
        if (newGrade === 'A_PLUS' && previousGrade !== 'A_PLUS') {
          sendPlatinumHighFive(updatedUser, newTotal);
        }

        results.push({ userId: entry.userId, newPoints: newTotal, newGrade });
        success++;
      } catch (err) {
        console.error(`Bulk point entry ${row} error:`, err);
        errors.push({ row, message: 'Failed to process entry.' });
        failed++;
      }
    }

    res.json({ success, failed, errors, results });
  } catch (error) {
    console.error('Bulk points error:', error);
    res.status(500).json({ error: 'Server error.' });
  }
});

// POST /api/points/bulk-upload - Parse CSV/XLSX for bulk preview (Admin/Lead only)
router.post('/bulk-upload', authenticate, authorize('ADMIN', 'LEAD'), (req, res, next) => {
  // Custom multer for spreadsheet files
  const multer = require('multer');
  const path = require('path');
  const os = require('os');
  const spreadsheetUpload = multer({
    dest: os.tmpdir(),
    fileFilter: (req, file, cb) => {
      const ext = path.extname(file.originalname).toLowerCase();
      if (['.csv', '.xlsx'].includes(ext)) {
        cb(null, true);
      } else {
        cb(new Error('Only .csv and .xlsx files are allowed.'), false);
      }
    },
    limits: { fileSize: 10 * 1024 * 1024 },
  });
  spreadsheetUpload.single('file')(req, res, next);
}, async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded.' });
    }

    const XLSX = require('xlsx');
    const fs = require('fs');
    const path = require('path');
    const ext = path.extname(req.file.originalname).toLowerCase();

    let rows = [];
    try {
      const workbook = XLSX.readFile(req.file.path);
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      rows = XLSX.utils.sheet_to_json(sheet, { defval: '' });
    } catch (e) {
      return res.status(400).json({ error: 'Could not parse file.' });
    } finally {
      // Clean up temp file
      fs.unlink(req.file.path, () => {});
    }

    // Get all users for matching
    const users = await prisma.user.findMany({
      select: { id: true, firstName: true, lastName: true, email: true, role: true, departmentId: true },
    });

    const parsed = [];
    const errors = [];

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const rowNum = i + 2; // +2 for 1-indexed + header row

      // Find name/email column (case-insensitive header matching)
      const keys = Object.keys(row);
      const nameKey = keys.find(k => /^name$/i.test(k.trim()));
      const emailKey = keys.find(k => /^email$/i.test(k.trim()));
      const typeKey = keys.find(k => /^type$/i.test(k.trim()));
      const pointsKey = keys.find(k => /^points$/i.test(k.trim()));
      const reasonKey = keys.find(k => /^reason$/i.test(k.trim()));

      const nameVal = nameKey ? String(row[nameKey]).trim() : '';
      const emailVal = emailKey ? String(row[emailKey]).trim() : '';
      const typeVal = typeKey ? String(row[typeKey]).trim() : '';
      const pointsVal = pointsKey ? row[pointsKey] : '';
      const reasonVal = reasonKey ? String(row[reasonKey]).trim() : '';

      if (!nameVal && !emailVal) {
        errors.push({ row: rowNum, message: 'No Name or Email found.' });
        continue;
      }

      if (!typeVal || !['Performance', 'Reward'].includes(typeVal)) {
        errors.push({ row: rowNum, message: `Invalid type "${typeVal}". Must be "Performance" or "Reward".` });
        continue;
      }

      const pts = parseInt(pointsVal);
      if (isNaN(pts)) {
        errors.push({ row: rowNum, message: 'Points must be a number.' });
        continue;
      }

      if (!reasonVal) {
        errors.push({ row: rowNum, message: 'Reason is required.' });
        continue;
      }

      // Match user
      let matched = null;
      if (emailVal) {
        matched = users.find(u => u.email.toLowerCase() === emailVal.toLowerCase());
      }
      if (!matched && nameVal) {
        const nameLower = nameVal.toLowerCase();
        matched = users.find(u =>
          `${u.firstName} ${u.lastName}`.toLowerCase() === nameLower ||
          `${u.lastName} ${u.firstName}`.toLowerCase() === nameLower
        );
      }

      parsed.push({
        userId: matched ? matched.id : null,
        firstName: matched ? matched.firstName : nameVal.split(' ')[0] || '',
        lastName: matched ? matched.lastName : nameVal.split(' ').slice(1).join(' ') || '',
        type: typeVal,
        points: pts,
        reason: reasonVal,
        matched: !!matched,
      });
    }

    res.json({ parsed, errors });
  } catch (error) {
    console.error('Bulk upload parse error:', error);
    res.status(500).json({ error: 'Server error.' });
  }
});

module.exports = router;
