"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { Task, TaskStatus, User, GhostingReport } from "@/lib/types";
import api from "@/lib/api";
import AppShell from "@/components/AppShell";
import Modal from "@/components/Modal";
import GradeBadge from "@/components/GradeBadge";
import { TableSkeleton } from "@/components/LoadingSkeleton";
import { Plus, AlertTriangle, Calendar, Filter } from "lucide-react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";

const STATUS_COLORS: Record<TaskStatus, { bg: string; text: string; label: string }> = {
  TODO: { bg: "bg-gray-100", text: "text-gray-800", label: "To Do" },
  IN_PROGRESS: { bg: "bg-blue-100", text: "text-blue-800", label: "In Progress" },
  IN_REVIEW: { bg: "bg-yellow-100", text: "text-yellow-800", label: "In Review" },
  DONE: { bg: "bg-green-100", text: "text-green-800", label: "Done" },
  CLOSED: { bg: "bg-purple-100", text: "text-purple-800", label: "Closed" }
};

export default function TasksPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [ghostingModalOpen, setGhostingModalOpen] = useState(false);
  const [ghostingReport, setGhostingReport] = useState<GhostingReport | null>(null);
  const [submitLoading, setSubmitLoading] = useState(false);

  // Filters
  const [statusFilter, setStatusFilter] = useState<TaskStatus | "">("");

  // Create task form
  const [taskForm, setTaskForm] = useState({
    title: "",
    description: "",
    userId: "",
    dueDate: "",
    taskBoardId: ""
  });

  const canCreateTasks = user?.role === "ADMIN" || user?.role === "LEAD";
  const canViewGhosting = user?.role === "ADMIN" || user?.role === "LEAD";

  useEffect(() => {
    if (!user) return;
    loadTasks();
    if (canCreateTasks) {
      loadUsers();
    }
  }, [user, statusFilter]);

  const loadTasks = async () => {
    try {
      const response = await api.get("/api/tasks");
      let filteredTasks = response.data || [];
      
      // Filter by user role
      if (user?.role === "MEMBER") {
        filteredTasks = filteredTasks.filter((task: Task) => task.userId === user.id);
      } else if (user?.role === "LEAD") {
        // Leads see tasks from their department
        filteredTasks = filteredTasks.filter((task: Task) => 
          task.user?.department?.name === user.department?.name
        );
      }

      // Filter by status
      if (statusFilter) {
        filteredTasks = filteredTasks.filter((task: Task) => task.status === statusFilter);
      }

      setTasks(filteredTasks);
    } catch (error) {
      toast.error("Failed to load tasks");
    } finally {
      setLoading(false);
    }
  };

  const loadUsers = async () => {
    try {
      const response = await api.get("/api/users");
      setUsers(response.data.users || []);
    } catch (error) {
      console.error("Failed to load users");
    }
  };

  const loadGhostingReport = async () => {
    try {
      const response = await api.get("/api/tasks/ghosting-report");
      setGhostingReport(response.data);
      setGhostingModalOpen(true);
    } catch (error) {
      toast.error("Failed to load ghosting report");
    }
  };

  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!taskForm.title.trim() || !taskForm.userId) return;

    setSubmitLoading(true);
    try {
      await api.post("/api/tasks", {
        title: taskForm.title.trim(),
        description: taskForm.description.trim() || undefined,
        userId: taskForm.userId,
        dueDate: taskForm.dueDate || undefined,
        taskBoardId: taskForm.taskBoardId.trim() || undefined
      });

      toast.success("Task created successfully");
      setCreateModalOpen(false);
      setTaskForm({
        title: "",
        description: "",
        userId: "",
        dueDate: "",
        taskBoardId: ""
      });
      loadTasks();
    } catch (error: any) {
      toast.error(error.response?.data?.error || "Failed to create task");
    } finally {
      setSubmitLoading(false);
    }
  };

  const handleStatusChange = async (taskId: string, newStatus: TaskStatus) => {
    try {
      await api.put(`/api/tasks/${taskId}/status`, {
        status: newStatus
      });

      toast.success("Task status updated");
      loadTasks();
    } catch (error: any) {
      toast.error(error.response?.data?.error || "Failed to update task status");
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString();
  };

  const isOverdue = (dueDateString?: string) => {
    if (!dueDateString) return false;
    const dueDate = new Date(dueDateString);
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    dueDate.setHours(0, 0, 0, 0);
    return dueDate < now;
  };

  if (!user) return null;

  return (
    <AppShell title="Tasks">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative">
              <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as TaskStatus | "")}
                className="input-field pl-10"
              >
                <option value="">All Statuses</option>
                {Object.entries(STATUS_COLORS).map(([status, config]) => (
                  <option key={status} value={status}>
                    {config.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex gap-3">
            {canViewGhosting && (
              <button
                onClick={loadGhostingReport}
                className="btn-secondary flex items-center gap-2"
              >
                <AlertTriangle className="w-4 h-4" />
                Ghosting Report
              </button>
            )}
            {canCreateTasks && (
              <button
                onClick={() => setCreateModalOpen(true)}
                className="btn-primary flex items-center gap-2"
              >
                <Plus className="w-4 h-4" />
                Create Task
              </button>
            )}
          </div>
        </div>

        {/* Tasks Table */}
        {loading ? (
          <TableSkeleton rows={8} />
        ) : (
          <div className="card">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-3 px-2 font-semibold text-prokip-navy">Title</th>
                    <th className="text-left py-3 px-2 font-semibold text-prokip-navy">Assignee</th>
                    <th className="text-left py-3 px-2 font-semibold text-prokip-navy">Status</th>
                    <th className="text-left py-3 px-2 font-semibold text-prokip-navy">Due Date</th>
                    <th className="text-left py-3 px-2 font-semibold text-prokip-navy">Board ID</th>
                    <th className="text-center py-3 px-2 font-semibold text-prokip-navy">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {tasks.map((task) => (
                    <tr key={task.id} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                      <td className="py-3 px-2">
                        <div>
                          <p className="font-medium text-prokip-navy">{task.title}</p>
                          {task.description && (
                            <p className="text-gray-600 text-sm mt-1">{task.description}</p>
                          )}
                        </div>
                      </td>
                      <td className="py-3 px-2">
                        <div className="flex items-center gap-3">
                          <div>
                            <p className="font-medium text-prokip-navy">
                              {task.user?.firstName} {task.user?.lastName}
                            </p>
                            <p className="text-gray-600 text-sm">
                              {task.user?.department?.name || "No Department"}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-2">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          STATUS_COLORS[task.status].bg
                        } ${STATUS_COLORS[task.status].text}`}>
                          {STATUS_COLORS[task.status].label}
                        </span>
                      </td>
                      <td className="py-3 px-2">
                        {task.dueDate ? (
                          <div className="flex items-center gap-2">
                            <Calendar className="w-4 h-4 text-gray-400" />
                            <span className={`text-sm ${
                              isOverdue(task.dueDate) ? "text-red-600 font-medium" : "text-gray-600"
                            }`}>
                              {formatDate(task.dueDate)}
                              {isOverdue(task.dueDate) && " (Overdue)"}
                            </span>
                          </div>
                        ) : (
                          <span className="text-gray-400 text-sm">No due date</span>
                        )}
                      </td>
                      <td className="py-3 px-2">
                        <span className="text-gray-600 text-sm font-mono">
                          {task.taskBoardId || "—"}
                        </span>
                      </td>
                      <td className="py-3 px-2 text-center">
                        <select
                          value={task.status}
                          onChange={(e) => handleStatusChange(task.id, e.target.value as TaskStatus)}
                          className="text-sm border border-gray-200 rounded px-2 py-1 focus:border-prokip-navy focus:outline-none"
                          disabled={user.role === "MEMBER" && task.userId !== user.id}
                        >
                          {Object.entries(STATUS_COLORS).map(([status, config]) => (
                            <option key={status} value={status}>
                              {config.label}
                            </option>
                          ))}
                        </select>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {tasks.length === 0 && (
              <div className="text-center py-8 text-gray-500">
                {statusFilter ? `No tasks with ${STATUS_COLORS[statusFilter as TaskStatus]?.label.toLowerCase()} status` : "No tasks found"}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Create Task Modal */}
      <Modal
        open={createModalOpen}
        onClose={() => {
          setCreateModalOpen(false);
          setTaskForm({
            title: "",
            description: "",
            userId: "",
            dueDate: "",
            taskBoardId: ""
          });
        }}
        title="Create Task"
        maxWidth="max-w-lg"
      >
        <form onSubmit={handleCreateTask} className="space-y-4">
          <div>
            <label className="input-label">Task Title *</label>
            <input
              type="text"
              value={taskForm.title}
              onChange={(e) => setTaskForm(prev => ({ ...prev, title: e.target.value }))}
              placeholder="e.g., Complete code review for PR #123"
              className="input-field"
              required
            />
          </div>

          <div>
            <label className="input-label">Description</label>
            <textarea
              value={taskForm.description}
              onChange={(e) => setTaskForm(prev => ({ ...prev, description: e.target.value }))}
              placeholder="Additional details about the task..."
              className="input-field min-h-[100px] resize-none"
            />
          </div>

          <div>
            <label className="input-label">Assign to *</label>
            <select
              value={taskForm.userId}
              onChange={(e) => setTaskForm(prev => ({ ...prev, userId: e.target.value }))}
              className="input-field"
              required
            >
              <option value="">Select a user...</option>
              {users.map((userData) => (
                <option key={userData.id} value={userData.id}>
                  {userData.firstName} {userData.lastName} ({userData.department?.name || "No Dept"})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="input-label">Due Date</label>
            <input
              type="date"
              value={taskForm.dueDate}
              onChange={(e) => setTaskForm(prev => ({ ...prev, dueDate: e.target.value }))}
              className="input-field"
            />
          </div>

          <div>
            <label className="input-label">Task Board ID</label>
            <input
              type="text"
              value={taskForm.taskBoardId}
              onChange={(e) => setTaskForm(prev => ({ ...prev, taskBoardId: e.target.value }))}
              placeholder="e.g., PROJ-123, ticket number, etc."
              className="input-field"
            />
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <button
              type="button"
              onClick={() => {
                setCreateModalOpen(false);
                setTaskForm({
                  title: "",
                  description: "",
                  userId: "",
                  dueDate: "",
                  taskBoardId: ""
                });
              }}
              className="btn-secondary"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitLoading}
              className="btn-primary"
            >
              {submitLoading ? "Creating..." : "Create Task"}
            </button>
          </div>
        </form>
      </Modal>

      {/* Ghosting Report Modal */}
      <Modal
        open={ghostingModalOpen}
        onClose={() => {
          setGhostingModalOpen(false);
          setGhostingReport(null);
        }}
        title="Ghosting Report"
        maxWidth="max-w-4xl"
      >
        {ghostingReport ? (
          <div className="space-y-6">
            <div className="flex items-center gap-4 p-4 bg-red-50 border border-red-200 rounded-lg">
              <AlertTriangle className="w-6 h-6 text-red-600" />
              <div>
                <h4 className="font-semibold text-red-800">
                  {ghostingReport.totalGhosting} User{ghostingReport.totalGhosting !== 1 ? 's' : ''} With Inactive Tasks
                </h4>
                <p className="text-red-700 text-sm">
                  These users have active tasks but haven't updated them recently.
                </p>
              </div>
            </div>

            {ghostingReport.report.length > 0 ? (
              <div className="space-y-4">
                {ghostingReport.report.map((item, index) => (
                  <div key={index} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <GradeBadge grade={item.user.grade} size="sm" />
                        <div>
                          <h5 className="font-semibold text-prokip-navy">{item.user.name}</h5>
                          <p className="text-gray-600 text-sm">
                            {item.user.department || "No Department"} • {item.user.points} points
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-red-600 font-semibold">
                          {item.hoursSinceUpdate}h since update
                        </p>
                        <p className="text-red-600 text-sm">
                          Penalty: {item.pendingPenalty} points
                        </p>
                      </div>
                    </div>

                    <div className="bg-gray-50 rounded-lg p-3">
                      <h6 className="font-medium text-gray-700 mb-2">Active Tasks:</h6>
                      <div className="space-y-1">
                        {item.activeTasks.map((task) => (
                          <div key={task.id} className="flex items-center justify-between text-sm">
                            <span className="text-gray-600">
                              {task.taskBoardId ? `${task.taskBoardId}: ` : ""}{task.title}
                            </span>
                            <span className={`px-2 py-1 rounded-full text-xs ${
                              STATUS_COLORS[task.status as TaskStatus]?.bg || "bg-gray-100"
                            } ${STATUS_COLORS[task.status as TaskStatus]?.text || "text-gray-800"}`}>
                              {STATUS_COLORS[task.status as TaskStatus]?.label || task.status}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {item.lastActivity && (
                      <p className="text-gray-500 text-sm mt-2">
                        Last activity: {formatDate(item.lastActivity)}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <AlertTriangle className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-500 mb-2">No Ghosting Detected</h3>
                <p className="text-gray-400">All users are actively updating their tasks.</p>
              </div>
            )}

            <div className="flex justify-end">
              <button
                onClick={() => {
                  setGhostingModalOpen(false);
                  setGhostingReport(null);
                }}
                className="btn-primary"
              >
                Close Report
              </button>
            </div>
          </div>
        ) : (
          <div className="text-center py-8">Loading report...</div>
        )}
      </Modal>
    </AppShell>
  );
}