/**
 * Cron Service
 * Schedules automated tasks like ghosting checks on Prokip's task board
 */

const { checkGhostingAll } = require('./taskBoardService');

let ghostingInterval = null;

/**
 * Start all scheduled jobs
 */
function startCronJobs() {
  console.log('[Cron] Starting scheduled jobs...');

  const now = new Date();
  const nextRun = new Date();
  nextRun.setHours(17, 0, 0, 0); // 5:00 PM

  if (now > nextRun) {
    nextRun.setDate(nextRun.getDate() + 1);
  }

  const msUntilFirstRun = nextRun - now;
  console.log(`[Cron] Ghosting check scheduled in ${Math.round(msUntilFirstRun / 1000 / 60)} minutes (at 5:00 PM)`);

  setTimeout(() => {
    runGhostingCheck();
    ghostingInterval = setInterval(runGhostingCheck, 24 * 60 * 60 * 1000);
  }, msUntilFirstRun);
}

/**
 * Run the ghosting check (skips weekends)
 */
async function runGhostingCheck() {
  const day = new Date().getDay();
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
