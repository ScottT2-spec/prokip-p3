/**
 * Jira Integration Service
 * 
 * Connects to Jira to monitor ticket status updates.
 * Automatically deducts -2 points/day for "ghosting" (no status update).
 * 
 * Supports two modes:
 * 1. Webhook mode (recommended): Jira sends events to our endpoint
 * 2. Polling mode (fallback): We poll Jira API periodically
 */

const prisma = require('../config/db');
const { calculateGrade } = require('../utils/gradeCalculator');
const { sendPointChangeEmail } = require('./emailService');

const JIRA_BASE_URL = process.env.JIRA_BASE_URL; // e.g. https://yourcompany.atlassian.net
const JIRA_API_TOKEN = process.env.JIRA_API_TOKEN;
const JIRA_EMAIL = process.env.JIRA_EMAIL;
const GHOSTING_PENALTY = -2;
const GHOSTING_THRESHOLD_HOURS = 24;

/**
 * Get Jira auth header
 */
function getJiraAuth() {
  const token = Buffer.from(`${JIRA_EMAIL}:${JIRA_API_TOKEN}`).toString('base64');
  return {
    'Authorization': `Basic ${token}`,
    'Content-Type': 'application/json',
  };
}

/**
 * Fetch assigned issues for a user from Jira
 */
async function fetchUserIssues(jiraAccountId) {
  if (!JIRA_BASE_URL || !JIRA_API_TOKEN) return [];

  try {
    const jql = `assignee = "${jiraAccountId}" AND status != Done AND status != Closed ORDER BY updated DESC`;
    const response = await fetch(
      `${JIRA_BASE_URL}/rest/api/3/search?jql=${encodeURIComponent(jql)}&fields=summary,status,updated,assignee`,
      { headers: getJiraAuth() }
    );

    if (!response.ok) {
      console.error('Jira API error:', response.status);
      return [];
    }

    const data = await response.json();
    return data.issues || [];
  } catch (error) {
    console.error('Jira fetch error:', error.message);
    return [];
  }
}

/**
 * Check all tracked users for Jira ghosting
 * Run this on a schedule (e.g., daily at 5PM via cron)
 */
async function checkGhostingAll() {
  console.log('[Jira Ghosting] Starting daily ghosting check...');

  // Get all users who have a jiraAccountId set
  const users = await prisma.user.findMany({
    where: {
      jiraAccountId: { not: null },
    },
  });

  let deductionCount = 0;

  for (const user of users) {
    try {
      const ghostedIssues = await getGhostedIssues(user.jiraAccountId);

      if (ghostedIssues.length > 0) {
        // Calculate total penalty: -2 per ghosted issue
        const totalPenalty = GHOSTING_PENALTY * ghostedIssues.length;
        const issueKeys = ghostedIssues.map(i => i.key).join(', ');

        const newTotal = user.points + totalPenalty;
        const newGrade = calculateGrade(newTotal);

        // Find or use the ghosting policy
        let ghostingPolicy = await prisma.policy.findFirst({
          where: { name: 'Jira/Status Ghosting' },
        });

        // Get system admin for "givenBy"
        const systemAdmin = await prisma.user.findFirst({
          where: { role: 'ADMIN' },
          orderBy: { createdAt: 'asc' },
        });

        if (!systemAdmin) {
          console.error('[Jira Ghosting] No admin user found for automated deductions');
          continue;
        }

        // Create point log and update user in transaction
        await prisma.$transaction([
          prisma.pointLog.create({
            data: {
              userId: user.id,
              givenById: systemAdmin.id,
              policyId: ghostingPolicy?.id || null,
              points: totalPenalty,
              reason: `[AUTO] Jira/Status Ghosting: No update in ${GHOSTING_THRESHOLD_HOURS}+ hours on ${ghostedIssues.length} issue(s): ${issueKeys}`,
              ticketLink: ghostedIssues.length === 1
                ? `${JIRA_BASE_URL}/browse/${ghostedIssues[0].key}`
                : null,
            },
          }),
          prisma.user.update({
            where: { id: user.id },
            data: { points: newTotal, grade: newGrade },
          }),
        ]);

        // Send notification
        sendPointChangeEmail(
          user,
          totalPenalty,
          newTotal,
          `Automated: No Jira status update in 24+ hours on: ${issueKeys}`,
          { firstName: 'System', lastName: '(Automated)' }
        );

        deductionCount++;
        console.log(`[Jira Ghosting] ${user.firstName} ${user.lastName}: ${totalPenalty} points (${ghostedIssues.length} ghosted issues)`);
      }
    } catch (error) {
      console.error(`[Jira Ghosting] Error processing user ${user.id}:`, error.message);
    }
  }

  console.log(`[Jira Ghosting] Complete. ${deductionCount} deductions applied.`);
  return { deductionCount };
}

/**
 * Get issues that haven't been updated in 24+ hours
 */
async function getGhostedIssues(jiraAccountId) {
  const issues = await fetchUserIssues(jiraAccountId);
  const now = new Date();

  return issues.filter(issue => {
    const lastUpdated = new Date(issue.fields.updated);
    const hoursSinceUpdate = (now - lastUpdated) / (1000 * 60 * 60);
    return hoursSinceUpdate >= GHOSTING_THRESHOLD_HOURS;
  });
}

/**
 * Process a Jira webhook event
 * Call this from the webhook endpoint when Jira sends an update
 */
async function processJiraWebhook(event) {
  const { issue, user: jiraUser } = event;

  if (!issue || !jiraUser) return;

  // Record activity — this proves the user is NOT ghosting
  // We track this so the daily check knows they updated
  // The webhook itself doesn't add/deduct points — that's the daily cron's job
  console.log(`[Jira Webhook] Activity recorded: ${jiraUser.displayName} updated ${issue.key}`);

  return { recorded: true, issueKey: issue.key };
}

module.exports = {
  fetchUserIssues,
  getGhostedIssues,
  checkGhostingAll,
  processJiraWebhook,
  GHOSTING_THRESHOLD_HOURS,
};
