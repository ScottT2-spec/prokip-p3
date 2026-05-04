export type Grade = "A_PLUS" | "A" | "B" | "C" | "F";

export const GRADE_CONFIG: Record<
  Grade,
  { label: string; color: string; bg: string; textColor: string; badge: string }
> = {
  A_PLUS: {
    label: "A+",
    color: "#E5E4E2",
    bg: "bg-grade-platinum",
    textColor: "text-prokip-navy-dark",
    badge: "Platinum",
  },
  A: {
    label: "A",
    color: "#28a745",
    bg: "bg-grade-green",
    textColor: "text-white",
    badge: "Green",
  },
  B: {
    label: "B",
    color: "#007bff",
    bg: "bg-grade-blue",
    textColor: "text-white",
    badge: "Blue",
  },
  C: {
    label: "C",
    color: "#ffc107",
    bg: "bg-grade-yellow",
    textColor: "text-prokip-navy-dark",
    badge: "Yellow",
  },
  F: {
    label: "F",
    color: "#dc3545",
    bg: "bg-grade-red",
    textColor: "text-white",
    badge: "Red",
  },
};

export function getGradeConfig(grade: Grade) {
  return GRADE_CONFIG[grade] || GRADE_CONFIG.B;
}

export function formatPoints(points: number): string {
  return points > 0 ? `+${points}` : `${points}`;
}
