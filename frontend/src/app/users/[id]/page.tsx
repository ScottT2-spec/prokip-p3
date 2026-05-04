"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { useParams, useRouter } from "next/navigation";
import { User, PointLog, Department } from "@/lib/types";
import api from "@/lib/api";
import AppShell from "@/components/AppShell";
import GradeBadge from "@/components/GradeBadge";
import Modal from "@/components/Modal";
import PointEntryModal from "@/components/PointEntryModal";
import { PageSkeleton, CardSkeleton } from "@/components/LoadingSkeleton";
import { ArrowLeft, Edit3, Plus, RotateCcw, ExternalLink } from "lucide-react";
import { formatPoints } from "@/lib/grades";
import toast from "react-hot-toast";

interface UserWithLogs extends User {
  pointLogs: PointLog[];
}

export default function UserDetailPage() {
  const { user: currentUser } = useAuth();
  const params = useParams();
  const router = useRouter();
  const userId = params.id as string;

  const [userData, setUserData] = useState<UserWithLogs | null>(null);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [pointEntryOpen, setPointEntryOpen] = useState(false);
  const [resetPasswordOpen, setResetPasswordOpen] = useState(false);
  const [tempPassword, setTempPassword] = useState("");
  const [editLoading, setEditLoading] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);

  const [editForm, setEditForm] = useState({
    firstName: "",
    lastName: "",
    role: "MEMBER" as const,
    departmentId: ""
  });

  const canEdit = currentUser?.role === "ADMIN" || 
    (currentUser?.role === "LEAD" && userData?.role === "MEMBER") ||
    currentUser?.id === userId;
  
  const canUpdatePoints = currentUser?.role === "ADMIN" || currentUser?.role === "LEAD";
  const canResetPassword = currentUser?.role === "ADMIN";
  const canEditRole = currentUser?.role === "ADMIN";

  useEffect(() => {
    if (!currentUser || !userId) return;
    
    // Check if user can view this profile
    if (currentUser.role === "MEMBER" && currentUser.id !== userId) {
      router.push("/");
      return;
    }

    loadUserData();
    loadDepartments();
  }, [currentUser, userId, router]);

  const loadUserData = async () => {
    try {
      const response = await api.get(`/api/users/${userId}`);
      setUserData(response.data.user);
      
      // Initialize edit form
      const user = response.data.user;
      setEditForm({
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        departmentId: user.departmentId || ""
      });
    } catch (error) {
      toast.error("Failed to load user data");
      router.push("/users");
    } finally {
      setLoading(false);
    }
  };

  const loadDepartments = async () => {
    try {
      const response = await api.get("/api/departments");
      setDepartments(response.data.departments || []);
    } catch (error) {
      console.error("Failed to load departments");
    }
  };

  const handleUpdateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userData || !editForm.firstName || !editForm.lastName) return;

    setEditLoading(true);
    try {
      await api.put(`/api/users/${userId}`, {
        firstName: editForm.firstName,
        lastName: editForm.lastName,
        role: editForm.role,
        departmentId: editForm.departmentId || null
      });

      toast.success("User updated successfully");
      setEditModalOpen(false);
      loadUserData();
    } catch (error: any) {
      toast.error(error.response?.data?.error || "Failed to update user");
    } finally {
      setEditLoading(false);
    }
  };

  const handleResetPassword = async () => {
    if (!userData) return;

    setResetLoading(true);
    try {
      const response = await api.put(`/api/auth/reset-password/${userId}`);
      setTempPassword(response.data.tempPassword);
      toast.success("Password reset successfully");
    } catch (error: any) {
      toast.error(error.response?.data?.error || "Failed to reset password");
    } finally {
      setResetLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffHours / 24);

    if (diffHours < 24) {
      return diffHours === 0 ? "Just now" : `${diffHours}h ago`;
    } else if (diffDays < 7) {
      return `${diffDays}d ago`;
    } else {
      return date.toLocaleDateString();
    }
  };

  if (loading) {
    return (
      <AppShell>
        <PageSkeleton />
      </AppShell>
    );
  }

  if (!userData) {
    return (
      <AppShell>
        <div className="text-center py-8">
          <p className="text-gray-500">User not found</p>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.back()}
              className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <h1 className="text-2xl font-bold text-prokip-navy">
                {userData.firstName} {userData.lastName}
              </h1>
              <p className="text-gray-600">{userData.email}</p>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-2">
            {canUpdatePoints && (
              <button
                onClick={() => setPointEntryOpen(true)}
                className="btn-primary flex items-center gap-2"
              >
                <Plus className="w-4 h-4" />
                Update Points
              </button>
            )}
            {canEdit && (
              <button
                onClick={() => setEditModalOpen(true)}
                className="btn-secondary flex items-center gap-2"
              >
                <Edit3 className="w-4 h-4" />
                Edit User
              </button>
            )}
            {canResetPassword && (
              <button
                onClick={() => setResetPasswordOpen(true)}
                className="btn-secondary flex items-center gap-2"
              >
                <RotateCcw className="w-4 h-4" />
                Reset Password
              </button>
            )}
          </div>
        </div>

        {/* User Profile */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="card">
            <h3 className="font-semibold text-prokip-navy mb-4">Profile Information</h3>
            <div className="space-y-4">
              <div>
                <p className="section-label">Name</p>
                <p className="text-prokip-navy">{userData.firstName} {userData.lastName}</p>
              </div>
              <div>
                <p className="section-label">Email</p>
                <p className="text-prokip-navy">{userData.email}</p>
              </div>
              <div>
                <p className="section-label">Role</p>
                <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                  userData.role === "ADMIN" 
                    ? "bg-purple-100 text-purple-800"
                    : userData.role === "LEAD"
                    ? "bg-blue-100 text-blue-800"
                    : "bg-gray-100 text-gray-800"
                }`}>
                  {userData.role}
                </span>
              </div>
              <div>
                <p className="section-label">Department</p>
                <p className="text-prokip-navy">{userData.department?.name || "No Department"}</p>
              </div>
              <div>
                <p className="section-label">Member Since</p>
                <p className="text-prokip-navy">
                  {userData.createdAt ? new Date(userData.createdAt).toLocaleDateString() : "N/A"}
                </p>
              </div>
            </div>
          </div>

          <div className="card text-center">
            <h3 className="font-semibold text-prokip-navy mb-4">Current Performance</h3>
            <div className="space-y-4">
              <div>
                <p className="section-label">Points</p>
                <p className={`text-3xl font-bold ${userData.points >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {userData.points}
                </p>
              </div>
              <div>
                <p className="section-label">Grade</p>
                <div className="flex justify-center">
                  <GradeBadge grade={userData.grade} size="lg" />
                </div>
              </div>
            </div>
          </div>

          <div className="card">
            <h3 className="font-semibold text-prokip-navy mb-4">Quick Stats</h3>
            <div className="space-y-4">
              <div>
                <p className="section-label">Total Point Entries</p>
                <p className="text-prokip-navy font-semibold">{userData.pointLogs?.length || 0}</p>
              </div>
              <div>
                <p className="section-label">Positive Points</p>
                <p className="text-green-600 font-semibold">
                  +{userData.pointLogs?.filter(log => log.points > 0).reduce((sum, log) => sum + log.points, 0) || 0}
                </p>
              </div>
              <div>
                <p className="section-label">Negative Points</p>
                <p className="text-red-600 font-semibold">
                  {userData.pointLogs?.filter(log => log.points < 0).reduce((sum, log) => sum + log.points, 0) || 0}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Point History */}
        <div className="card">
          <h3 className="text-lg font-semibold text-prokip-navy mb-6">Point History</h3>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-3 px-3 font-semibold text-prokip-navy text-sm">Points</th>
                  <th className="text-left py-3 px-3 font-semibold text-prokip-navy text-sm">Policy</th>
                  <th className="text-left py-3 px-3 font-semibold text-prokip-navy text-sm">Reason</th>
                  <th className="text-left py-3 px-3 font-semibold text-prokip-navy text-sm">Added By</th>
                  <th className="text-left py-3 px-3 font-semibold text-prokip-navy text-sm">Date</th>
                </tr>
              </thead>
              <tbody>
                {userData.pointLogs?.map((log) => (
                  <tr key={log.id} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                    <td className="py-3 px-3">
                      <span className={`font-semibold px-2 py-1 rounded-md text-sm ${
                        log.points > 0 
                          ? 'text-green-700 bg-green-50' 
                          : 'text-red-700 bg-red-50'
                      }`}>
                        {formatPoints(log.points)}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-gray-600 text-sm">
                      {log.policy?.name || "—"}
                    </td>
                    <td className="py-3 px-3 text-prokip-navy text-sm max-w-[300px]">
                      <span className="line-clamp-2">{log.reason}</span>
                      {log.ticketLink && (
                        <a 
                          href={log.ticketLink} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="text-prokip-navy hover:underline flex items-center gap-1 mt-1 text-xs"
                        >
                          <ExternalLink className="w-3 h-3" />
                          View Ticket
                        </a>
                      )}
                    </td>
                    <td className="py-3 px-3 text-gray-600 text-sm whitespace-nowrap">
                      {log.givenBy ? `${log.givenBy.firstName} ${log.givenBy.lastName}` : "System"}
                    </td>
                    <td className="py-3 px-3 text-gray-500 text-sm whitespace-nowrap">
                      {new Date(log.createdAt).toLocaleDateString("en-US", {
                        year: "numeric",
                        month: "short",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {!userData.pointLogs?.length && (
              <div className="text-center py-8 text-gray-500">
                No point history yet
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Edit User Modal */}
      <Modal
        open={editModalOpen}
        onClose={() => setEditModalOpen(false)}
        title="Edit User"
        maxWidth="max-w-lg"
      >
        <form onSubmit={handleUpdateUser} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="input-label">First Name *</label>
              <input
                type="text"
                value={editForm.firstName}
                onChange={(e) => setEditForm(prev => ({ ...prev, firstName: e.target.value }))}
                className="input-field"
                required
              />
            </div>
            <div>
              <label className="input-label">Last Name *</label>
              <input
                type="text"
                value={editForm.lastName}
                onChange={(e) => setEditForm(prev => ({ ...prev, lastName: e.target.value }))}
                className="input-field"
                required
              />
            </div>
          </div>

          {canEditRole && (
            <div>
              <label className="input-label">Role *</label>
              <select
                value={editForm.role}
                onChange={(e) => setEditForm(prev => ({ ...prev, role: e.target.value as any }))}
                className="input-field"
                required
              >
                <option value="MEMBER">Member</option>
                <option value="LEAD">Lead</option>
                <option value="ADMIN">Admin</option>
              </select>
            </div>
          )}

          <div>
            <label className="input-label">Department</label>
            <select
              value={editForm.departmentId}
              onChange={(e) => setEditForm(prev => ({ ...prev, departmentId: e.target.value }))}
              className="input-field"
            >
              <option value="">No Department</option>
              {departments.map((dept) => (
                <option key={dept.id} value={dept.id}>
                  {dept.name}
                </option>
              ))}
            </select>
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <button
              type="button"
              onClick={() => setEditModalOpen(false)}
              className="btn-secondary"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={editLoading}
              className="btn-primary"
            >
              {editLoading ? "Saving..." : "Save Changes"}
            </button>
          </div>
        </form>
      </Modal>

      {/* Reset Password Modal */}
      <Modal
        open={resetPasswordOpen}
        onClose={() => {
          setResetPasswordOpen(false);
          setTempPassword("");
        }}
        title="Reset Password"
        maxWidth="max-w-md"
      >
        {tempPassword ? (
          <div className="space-y-4">
            <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
              <h4 className="font-semibold text-yellow-800 mb-2">Password Reset</h4>
              <p className="text-yellow-700 text-sm mb-4">
                A new temporary password has been generated:
              </p>
              <div className="bg-white p-3 rounded border border-yellow-300">
                <p className="text-sm"><strong>Temporary Password:</strong></p>
                <code className="text-lg font-mono bg-gray-100 px-2 py-1 rounded">
                  {tempPassword}
                </code>
              </div>
              <p className="text-yellow-700 text-sm mt-3">
                The user will need to change this password on their next login.
              </p>
            </div>
            <div className="flex justify-end">
              <button
                onClick={() => {
                  setResetPasswordOpen(false);
                  setTempPassword("");
                }}
                className="btn-primary"
              >
                Close
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <p className="text-gray-600">
              Are you sure you want to reset the password for {userData.firstName} {userData.lastName}? 
              This will generate a new temporary password.
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setResetPasswordOpen(false)}
                className="btn-secondary"
              >
                Cancel
              </button>
              <button
                onClick={handleResetPassword}
                disabled={resetLoading}
                className="btn-danger"
              >
                {resetLoading ? "Resetting..." : "Reset Password"}
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* Point Entry Modal */}
      <PointEntryModal
        open={pointEntryOpen}
        onClose={() => setPointEntryOpen(false)}
        preSelectedUser={userData}
        onSuccess={() => {
          loadUserData();
          setPointEntryOpen(false);
        }}
      />
    </AppShell>
  );
}