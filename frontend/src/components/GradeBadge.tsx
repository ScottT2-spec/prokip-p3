"use client";

import { Grade, getGradeConfig } from "@/lib/grades";

interface Props {
  grade: Grade;
  size?: "sm" | "md" | "lg";
}

export default function GradeBadge({ grade, size = "md" }: Props) {
  const config = getGradeConfig(grade);

  const sizeClasses = {
    sm: "px-2 py-0.5 text-xs",
    md: "px-3 py-1 text-sm",
    lg: "px-4 py-2 text-base",
  };

  return (
    <span
      className={`inline-flex items-center font-bold rounded-full ${sizeClasses[size]} ${
        grade === "A_PLUS" ? "badge-platinum" : ""
      }`}
      style={{
        backgroundColor: grade !== "A_PLUS" ? config.color : undefined,
        color: grade === "A_PLUS" ? "#0F1C32" : config.textColor === "text-prokip-navy-dark" ? "#0F1C32" : "#fff",
      }}
    >
      {config.label}
    </span>
  );
}
