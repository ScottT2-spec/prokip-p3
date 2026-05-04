const express = require('express');
const { body, validationResult } = require('express-validator');
const prisma = require('../config/db');
const { authenticate, authorize } = require('../middleware/auth');
const { checkGhostingAll, processJiraWebhook, getGhostedIssues } = require('../services/jiraService');

const router = express.Router();

/**
 * POST /api/jira/webhook
 * Jira sends events here when issues are updated
 * No auth required (Jira webhooks use a shared secret)
 */
router.post('/webhook', async (req, res) => {
  const webhookSecret = req.headers['x-jira-webhook-secret'];

  if (process.env.JIRA_WEBHOOK_SECRET && webhookSecret !== process.env.JIRA_WEBHOOK_SECRET) {
    return res.status(401).json({ error: 'Invalid webhook secret.' });
  }

  try {
    const result = await processJiraWebhook(req.body);
    res.json({ ok: true, ...result });
  } catch (error) {
    console.error('Jira webhook error:', error);
    res.status(500).json({ error: 'Webhook processing failed.' });
  }
});

/**
 * POST /api/jira/check-ghosting
 * Manually trigger the ghosting check (Admin only)
 * Also runs automatically via cron
 */
router.post('/check-ghosting', authenticate, authorize('ADMIN'), async (req, res) => {
  try {
    const result = await checkGhostingAll();
    res.json({
      message: 'Ghosting check completed.',
      ...result,
    });
  } catch (error) {
    console.error('Manual ghosting check error:', error);
    res.status(500).json({ error: 'Ghosting check failed.' });
  }
});

/**
 * GET /api/jira/ghosting-report
 * View which users are currently ghosting (Admin/Lead)
 */
router.get('/ghosting-report', authenticate, authorize('ADMIN', 'LEAD'), async (req, res) => {
  try {
    const where = { jiraAccountId: { not: null } };
    if (req.user.role === 'LEAD') {
      where.departmentId = req.user.departmentId;
    }

    const users = await prisma.user.findMany({
      where,
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        points: true,
        grade: true,
        jiraAccountId: true,
        department: { select: { name: true } },
      },
    });

    const report = [];

    for (const user of users) {
      const ghostedIssues = await getGhostedIssues(user.jiraAccountId);
      if (ghostedIssues.length > 0) {
        report.push({
          user: {
            id: user.id,
            name: `${user.firstName} ${user.lastName}`,
            points: user.points,
            grade: user.grade,
            department: user.department?.name,
          },
          ghostedIssues: ghostedIssues.map(i => ({
            key: i.key,
            summary: i.fields.summary,
            status: i.fields.status?.name,
            lastUpdated: i.fields.updated,
          })),
          pendingPenalty: -2 * ghostedIssues.length,
        });
      }
    }

    res.json({
      totalGhosting: report.length,
      report,
    });
  } catch (error) {
    console.error('Ghosting report error:', error);
    res.status(500).json({ error: 'Failed to generate report.' });
  }
});

/**
 * PUT /api/jira/link-account/:userId
 * Link a user's P3 account to their Jira account ID (Admin/Lead)
 */
router.put('/link-account/:userId', authenticate, authorize('ADMIN', 'LEAD'), [
  body('jiraAccountId').notEmpty().withMessage('Jira Account ID required'),
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    const user = await prisma.user.update({
      where: { id: req.params.userId },
      data: { jiraAccountId: req.body.jiraAccountId },
      select: {
        id: true, firstName: true, lastName: true,
        email: true, jiraAccountId: true,
      },
    });

    res.json({ message: 'Jira account linked.', user });
  } catch (error) {
    console.error('Link Jira account error:', error);
    res.status(500).json({ error: 'Failed to link account.' });
  }
});

module.exports = router;
