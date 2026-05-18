const prisma = require('../config/db');

/**
 * Calculate grade based on points
 */
function calculateGrade(points) {
  if (points >= 105) return 'A_PLUS';
  if (points >= 90) return 'A';
  if (points >= 75) return 'B';
  if (points >= 60) return 'C';
  return 'F';
}

/**
 * Get grade info from the database (RewardThreshold).
 * Checks department-specific first, then falls back to global.
 * Only uses hardcoded fallback if nothing is in the DB at all.
 */
async function getGradeInfo(grade, departmentId = null) {
  // Try department-specific first, then global
  let definition = null;

  if (departmentId) {
    definition = await prisma.rewardThreshold.findFirst({
      where: { grade, departmentId },
    });
  }

  if (!definition) {
    definition = await prisma.rewardThreshold.findFirst({
      where: { grade, departmentId: null },
    });
  }

  if (definition) {
    const info = {
      label: gradeLabels[grade] || grade,
      badge: definition.title,
      color: gradeColors[grade] || '#007bff',
    };
    if (definition.reward) info.reward = definition.reward;
    if (definition.consequence) info.consequence = definition.consequence;
    return info;
  }

  // Hardcoded fallback (only if DB has no definitions at all)
  return hardcodedFallback[grade] || hardcodedFallback.B;
}

const gradeLabels = {
  A_PLUS: 'A+', A: 'A', B: 'B', C: 'C', F: 'F',
};

const gradeColors = {
  A_PLUS: '#E5E4E2', A: '#28a745', B: '#007bff', C: '#ffc107', F: '#dc3545',
};

const hardcodedFallback = {
  A_PLUS: { label: 'A+', badge: 'Platinum', color: '#E5E4E2', reward: 'Platinum High-Five Email + Priority on future projects.' },
  A: { label: 'A', badge: 'Green', color: '#28a745', reward: 'Standard High Performance; eligible for quarterly perks.' },
  B: { label: 'B', badge: 'Blue', color: '#007bff', reward: 'Baseline Reliability; no rewards, no penalties.' },
  C: { label: 'C', badge: 'Yellow', color: '#ffc107', consequence: 'Warning: Mandatory "Estimation Training" & peer review.' },
  F: { label: 'F', badge: 'Red', color: '#dc3545', consequence: 'Probation: Loss of remote work + Daily EOD micromanagement.' },
};

module.exports = { calculateGrade, getGradeInfo };
