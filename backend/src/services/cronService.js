/**
 * Cron Service
 * Schedules automated tasks like Jira ghosting checks
 */

const { checkGhostingAll } = require('./jiraService');

// Simple interval-based scheduler (no external cron dependency)
let ghostingInterval = null;

/**
 * Start all scheduled jobs
 */
function startCronJobs() {
  console.log('[Cron] Starting scheduled jobs...');

  // Run ghosting check daily at 5PM (every 24 hours)
  // On startup, schedule first check
  const now = new Date();
  const nextRun = new Date();
  nextRun.setHours(17, 0, 0, 0); // 5:00 PM

  // If 5PM already passed today, schedule for tomorrow
  if (now > nextRun) {
    nextRun.setDate(nextRun.getDate() + 1);
  }

  const msUntilFirstRun = nextRun - now;
  console.log(`[Cron] Ghosting check scheduled in ${Math.round(msUntilFirstRun / 1000 / 60)} minutes (at 5:00 PM)`);

  // First run at 5PM
  setTimeout(() => {
    runGhostingCheck();

    // Then every 24 hours
    ghostingInterval = setInterval(runGhostingCheck, 24 * 60 * 60 * 1000);
  }, msUntilFirstRun);
}

/**
 * Run the ghosting check (skips weekends)
 */
async function runGhostingCheck() {
  const day = new Date().getDay();

  // Skip weekends
  if (day === 0 || day === 6) {
    console.log('[Cron] Skipping ghosting check — weekend');
    return;
  }

  try {
    console.log('[Cron] Running automated ghosting check...');
    const result = await checkGhostingAll();
    console.log(`[Cron] Ghosting check done: ${result.deductionCount} deductions`);
  } catch (error) {
    console.error('[Cron] Ghosting check failed:', error.message);
  }
}

/**
 * Stop all scheduled jobs
 */
function stopCronJobs() {
  if (ghostingInterval) {
    clearInterval(ghostingInterval);
    ghostingInterval = null;
  }
  console.log('[Cron] All jobs stopped.');
}

module.exports = { startCronJobs, stopCronJobs };
