/**
 * Work Hours Logic
 * SLA timers only count between 9:00 AM – 5:00 PM (8 hours per work day)
 * Weekends (Sat/Sun) are excluded
 */

const WORK_START_HOUR = 9;  // 9:00 AM
const WORK_END_HOUR = 17;   // 5:00 PM
const WORK_HOURS_PER_DAY = WORK_END_HOUR - WORK_START_HOUR; // 8 hours

/**
 * Check if a given date/time falls within work hours
 */
function isWorkHour(date) {
  const day = date.getDay(); // 0 = Sunday, 6 = Saturday
  const hour = date.getHours();

  // Exclude weekends
  if (day === 0 || day === 6) return false;

  // Check work hours
  return hour >= WORK_START_HOUR && hour < WORK_END_HOUR;
}

/**
 * Calculate elapsed work hours between two dates
 * Only counts time within 9AM-5PM on weekdays
 */
function calculateWorkHours(startDate, endDate) {
  if (endDate <= startDate) return 0;

  let workMinutes = 0;
  const current = new Date(startDate);

  // Iterate minute by minute (for precision)
  // For large spans, we optimize by skipping non-work periods
  while (current < endDate) {
    const day = current.getDay();
    const hour = current.getHours();

    // Skip weekends entirely
    if (day === 0 || day === 6) {
      // Jump to next Monday 9AM
      const daysToMonday = day === 0 ? 1 : 2;
      current.setDate(current.getDate() + daysToMonday);
      current.setHours(WORK_START_HOUR, 0, 0, 0);
      continue;
    }

    // Before work hours — jump to work start
    if (hour < WORK_START_HOUR) {
      current.setHours(WORK_START_HOUR, 0, 0, 0);
      continue;
    }

    // After work hours — jump to next day work start
    if (hour >= WORK_END_HOUR) {
      current.setDate(current.getDate() + 1);
      current.setHours(WORK_START_HOUR, 0, 0, 0);
      continue;
    }

    // We're in work hours — calculate remaining work minutes today
    const endOfWorkToday = new Date(current);
    endOfWorkToday.setHours(WORK_END_HOUR, 0, 0, 0);

    const effectiveEnd = endDate < endOfWorkToday ? endDate : endOfWorkToday;
    const minutesThisPeriod = Math.floor((effectiveEnd - current) / (1000 * 60));

    workMinutes += minutesThisPeriod;

    // Move to next work period
    current.setDate(current.getDate() + 1);
    current.setHours(WORK_START_HOUR, 0, 0, 0);
  }

  return workMinutes / 60; // Return hours
}

/**
 * Check if an SLA has been breached based on work hours
 * @param {Date} startTime - When the review was requested
 * @param {number} slaHours - SLA in work hours (e.g., 1, 2, 5)
 * @returns {object} { breached: boolean, elapsedWorkHours: number }
 */
function checkSlaBreach(startTime, slaHours) {
  const now = new Date();
  const elapsedWorkHours = calculateWorkHours(startTime, now);

  return {
    breached: elapsedWorkHours > slaHours,
    elapsedWorkHours: Math.round(elapsedWorkHours * 100) / 100,
    slaHours,
  };
}

module.exports = {
  isWorkHour,
  calculateWorkHours,
  checkSlaBreach,
  WORK_START_HOUR,
  WORK_END_HOUR,
  WORK_HOURS_PER_DAY,
};
