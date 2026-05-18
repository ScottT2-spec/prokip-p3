/**
 * Task Board Integration Service
 * 
 * Connects to Prokip's internal task board to monitor status updates.
 * Automatically deducts -2 points/day for "ghosting" (no status update in 24h).
 * 
 * Supports two modes:
 * 1. Webhook mode: Task board sends events to our endpoint on status change
 * 2. Internal tracking: Tasks tracked directly in P3 database
 */

const prisma = require('../config/db');
const { calculateGrade } = require('../utils/gradeCalculator');
const { sendPointChangeEmail } = require('./emailService');

const GHOSTING_PENALTY = -2;
const GHOSTING_THRESHOLD_HOURS = 24;

/**
 * Record a task activity (status update, comment, etc.)
 * Called when a user updates their task on the Prokip board
 */
async function recordTaskActivity(userId, taskId, taskTitle, activityType = 'status_update') {
  return prisma.taskActivity.create({
    data: {
      userId,
      taskId,
      taskTitle,
      activityType,
    },
  });
}

/**
 * Get users who haven't updated any task in 24+ hours
 * Only considers users with active (non-completed) tasks
 */
async function getGhostingUsers() {
  const threshold = new Date(Date.now() - GHOSTING_THRESHOLD_HOURS * 60 * 60 * 1000);

  // Get all users with assigned tasks
  const usersWithTasks = await prisma.user.findMany({
    where: {
      role: { not: 'ADMIN' }, // Admins are not graded
      tasks: {
        some: {
          status: { notIn: ['DONE', 'CLOSED'] },
        },
      },
    },
    include: {
      tasks: {
        where: { status: { notIn: ['DONE', 'CLOSED'] } },
        select: { id: true, title: true, taskBoardId: true, status: true },
      },
      department: { select: { name: true } },
    },
  });

  const ghosting = [];

  for (const user of usersWithTasks) {
    // Find last activity for this user
    const lastActivity = await prisma.taskActivity.findFirst({
      where: { userId: user.id },
      orderBy: { createdAt: 'desc' },
    });

    const lastUpdate = lastActivity?.createdAt || new Date(0);

    if (lastUpdate < threshold) {
      const hoursSince = Math.round((Date.now() - lastUpdate.getTime()) / (1000 * 60 * 60));
      ghosting.push({
        user,
        activeTasks: user.tasks,
        lastActivity: lastActivity?.createdAt || null,
        hoursSinceUpdate: hoursSince,
      });
    }
  }

  return ghosting;
}

/**
 * Check all users for ghosting and apply deductions
 * Run daily at 5PM via cron
 */
async function checkGhostingAll() {
  console.log('[Task Board] Starting daily ghosting check...');

  const ghostingUsers = await getGhostingUsers();
  let deductionCount = 0;

  for (const { user, activeTasks, hoursSinceUpdate } of ghostingUsers) {
    try {
      const totalPenalty = GHOSTING_PENALTY * activeTasks.length;
      const taskNames = activeTasks.map(t => t.taskBoardId || t.title).join(', ');

      const newTotal = user.points + totalPenalty;
      const newGrade = calculateGrade(newTotal);

      // Find the ghosting policy
      const ghostingPolicy = await prisma.policy.findFirst({
        where: { name: 'Jira/Status Ghosting' }, // keeping policy name from PRD
      });

      // System admin for automated deductions
      const systemAdmin = await prisma.user.findFirst({
        where: { role: 'ADMIN' },
        orderBy: { createdAt: 'asc' },
      });

      if (!systemAdmin) {
        console.error('[Task Board] No admin user found for automated deductions');
        continue;
      }

      await prisma.$transaction([
        prisma.pointLog.create({
          data: {
            userId: user.id,
            givenById: systemAdmin.id,
            policyId: ghostingPolicy?.id || null,
            points: totalPenalty,
            reason: `[AUTO] Status Ghosting: No task update in ${hoursSinceUpdate}+ hours on ${activeTasks.length} task(s): ${taskNames}`,
            ticketLink: null,
          },
        }),
        prisma.user.update({
          where: { id: user.id },
          data: { points: newTotal, grade: newGrade },
        }),
      ]);

      sendPointChangeEmail(
        user,
        totalPenalty,
        newTotal,
        `Automated: No task board update in ${hoursSinceUpdate}+ hours on: ${taskNames}`,
        { firstName: 'System', lastName: '(Automated)' }
      );

      deductionCount++;
      console.log(`[Task Board] ${user.firstName} ${user.lastName}: ${totalPenalty} points (${activeTasks.length} ghosted tasks)`);
    } catch (error) {
      console.error(`[Task Board] Error processing user ${user.id}:`, error.message);
    }
  }

  console.log(`[Task Board] Complete. ${deductionCount} deductions applied.`);
  return { deductionCount };
}

module.exports = {
  recordTaskActivity,
  getGhostingUsers,
  checkGhostingAll,
  GHOSTING_THRESHOLD_HOURS,
};
