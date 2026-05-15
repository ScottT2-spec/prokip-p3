"use client";

import { useState } from "react";
import { useAuth } from "@/context/AuthContext";
import api from "@/lib/api";
import AppShell from "@/components/AppShell";
import GradeBadge from "@/components/GradeBadge";
import { User, Lock, Building2, Mail, Shield } from "lucide-react";
import toast from "react-hot-toast";

export default function ProfilePage() {
  const { user } = useAuth();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();

    if (newPassword.length < 6) {
      toast.error("New password must be at least 6 characters");
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }

    setLoading(true);
    try {
      await api.put("/api/auth/change-password", {
        currentPassword,
        newPassword,
      });
      toast.success("Password changed successfully");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (error: any) {
      toast.error(error.response?.data?.error || "Failed to change password");
    } finally {
      setLoading(false);
    }
  };

  if (!user) return null;

  return (
    <AppShell title="My Profile">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Profile Info */}
        <div className="card h-fit">
          <h3 className="text-lg font-semibold text-prokip-navy mb-6">Profile Information</h3>
          <div className="space-y-4">
            <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
              <User className="w-5 h-5 text-gray-400" />
              <div>
                <p className="text-xs text-gray-500">Name</p>
                <p className="font-medium text-prokip-navy">{user.firstName} {user.lastName}</p>
              </div>
            </div>

            <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
              <Mail className="w-5 h-5 text-gray-400" />
              <div>
                <p className="text-xs text-gray-500">Email</p>
                <p className="font-medium text-prokip-navy">{user.email}</p>
              </div>
            </div>

            <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
              <Building2 className="w-5 h-5 text-gray-400" />
              <div>
                <p className="text-xs text-gray-500">Department</p>
                <p className="font-medium text-prokip-navy">{user.department?.name || "No Department"}</p>
              </div>
            </div>

            <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
              <Shield className="w-5 h-5 text-gray-400" />
              <div>
                <p className="text-xs text-gray-500">Role</p>
                <span className={`inline-flex px-2 py-0.5 text-xs font-semibold rounded-full ${
                  user.role === "ADMIN"
                    ? "bg-purple-100 text-purple-800"
                    : user.role === "LEAD"
                    ? "bg-blue-100 text-blue-800"
                    : "bg-gray-100 text-gray-800"
                }`}>
                  {user.role}
                </span>
              </div>
            </div>

            {user.role !== "ADMIN" && (
              <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                <div className="w-5 h-5 flex items-center justify-center">
                  <GradeBadge grade={user.grade} size="sm" />
                </div>
                <div>
                  <p className="text-xs text-gray-500">Current Grade</p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Change Password */}
        <div className="card h-fit">
          <div className="flex items-center gap-2 mb-6">
            <Lock className="w-5 h-5 text-prokip-navy" />
            <h3 className="text-lg font-semibold text-prokip-navy">Change Password</h3>
          </div>
          <form onSubmit={handleChangePassword} className="space-y-4">
            <div>
              <label className="input-label">Current Password *</label>
              <input
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                className="input-field"
                placeholder="Enter current password"
                required
              />
            </div>
            <div>
              <label className="input-label">New Password *</label>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="input-field"
                placeholder="Enter new password (min 6 characters)"
                minLength={6}
                required
              />
            </div>
            <div>
              <label className="input-label">Confirm New Password *</label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="input-field"
                placeholder="Confirm new password"
                minLength={6}
                required
              />
            </div>
            <button
              type="submit"
              disabled={loading || !currentPassword || !newPassword || !confirmPassword}
              className="btn-primary"
            >
              {loading ? "Changing..." : "Change Password"}
            </button>
          </form>
        </div>
      </div>
    </AppShell>
  );
}
