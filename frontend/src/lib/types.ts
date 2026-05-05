import { Grade } from "./grades";

export type Role = "ADMIN" | "LEAD" | "MEMBER";

export interface Department {
  id: string;
  name: string;
  _count?: { users: number };
  createdAt?: string;
}

export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: Role;
  points: number;
  grade: Grade;
  department?: Department | null;
  departmentId?: string | null;
  createdAt?: string;
}

export interface Policy {
  id: string;
  name: string;
  description: string;
  pointImpact: number;
  isGlobal: boolean;
  departmentId?: string | null;
  department?: Department | null;
}

export interface PointLog {
  id: string;
  userId: string;
  points: number;
  reason: string;
  ticketLink?: string | null;
  imageUrl?: string | null;
  createdAt: string;
  user?: { firstName: string; lastName: string };
  givenBy?: { firstName: string; lastName: string };
  policy?: { name: string; description?: string } | null;
}

export interface RecentActivity extends PointLog {
  user: { firstName: string; lastName: string };
  givenBy: { firstName: string; lastName: string };
}

export interface AdminDashboard {
  stats: {
    totalMembers: number;
    avgPoints: number;
    atRiskCount: number;
    topPerformerCount: number;
  };
  gradeDistribution: Record<string, number>;
  rankings: User[];
  total: number;
  page: number;
  limit: number;
  atRisk: User[];
  topPerformers: User[];
  recentActivity: RecentActivity[];
}

export interface MemberDashboard {
  points: number;
  grade: Grade;
  gradeInfo: {
    label: string;
    badge: string;
    color: string;
    reward?: string;
    consequence?: string;
  };
  department: Department | null;
  rank: number | null;
  recentLogs: PointLog[];
  pointsTrend: { points: number; createdAt: string }[];
  status: string;
}

export type TaskStatus = "TODO" | "IN_PROGRESS" | "IN_REVIEW" | "DONE" | "CLOSED";

export interface Task {
  id: string;
  title: string;
  description?: string | null;
  taskBoardId?: string | null;
  status: TaskStatus;
  dueDate?: string | null;
  userId: string;
  user?: { id: string; firstName: string; lastName: string; department?: { name: string } };
  assignedBy?: { firstName: string; lastName: string };
  createdAt: string;
}

export interface GhostingReport {
  totalGhosting: number;
  report: {
    user: {
      id: string;
      name: string;
      points: number;
      grade: Grade;
      department?: string;
    };
    activeTasks: { id: string; title: string; taskBoardId?: string; status: string }[];
    lastActivity: string | null;
    hoursSinceUpdate: number;
    pendingPenalty: number;
  }[];
}
