/**
 * Calculate grade based on points
 * A+ = 105+   (Platinum)
 * A  = 90-104 (Green)
 * B  = 75-89  (Blue)
 * C  = 60-74  (Yellow)
 * F  = <60    (Red)
 */
function calculateGrade(points) {
  if (points >= 105) return 'A_PLUS';
  if (points >= 90) return 'A';
  if (points >= 75) return 'B';
  if (points >= 60) return 'C';
  return 'F';
}

function getGradeInfo(grade) {
  const grades = {
    A_PLUS: {
      label: 'A+',
      badge: 'Platinum',
      color: '#E5E4E2',
      reward: 'Platinum High-Five Email + Priority on future projects.',
    },
    A: {
      label: 'A',
      badge: 'Green',
      color: '#28a745',
      reward: 'Standard High Performance; eligible for quarterly perks.',
    },
    B: {
      label: 'B',
      badge: 'Blue',
      color: '#007bff',
      reward: 'Baseline Reliability; no rewards, no penalties.',
    },
    C: {
      label: 'C',
      badge: 'Yellow',
      color: '#ffc107',
      consequence: 'Warning: Mandatory "Estimation Training" & peer review.',
    },
    F: {
      label: 'F',
      badge: 'Red',
      color: '#dc3545',
      consequence: 'Probation: Loss of remote work + Daily EOD micromanagement.',
    },
  };

  return grades[grade] || grades.B;
}

module.exports = { calculateGrade, getGradeInfo };
