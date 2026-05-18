"use client";

import { useState, useRef } from "react";
import { useAuth } from "@/context/AuthContext";
import api from "@/lib/api";
import AppShell from "@/components/AppShell";
import GradeBadge from "@/components/GradeBadge";
import { User, Lock, Building2, Mail, Shield, Camera } from "lucide-react";
import toast from "react-hot-toast";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

export default function ProfilePage() {
  const { user, refreshUser } = useAuth();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [avatarLoading, setAvatarLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image must be under 5MB");
      return;
    }

    setAvatarLoading(true);
    try {
      const formData = new FormData();
      formData.append("avatar", file);
      await api.post("/api/users/avatar", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      await refreshUser();
      toast.success("Profile picture updated");
    } catch (error: any) {
      toast.error(error.response?.data?.error || "Failed to upload picture");
    } finally {
      setAvatarLoading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

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

  const initials = `${user.firstName[0] || ""}${user.lastName[0] || ""}`.toUpperCase();
  const avatarSrc = user.avatarUrl ? `${API_BASE}${user.avatarUrl}` : null;

  return (
    <AppShell title="My Profile">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Profile Info */}
        <div className="card h-fit">
          <h3 className="text-lg font-semibold text-prokip-navy mb-6">Profile Information</h3>

          {/* Avatar Section */}
          <div className="flex flex-col items-center mb-6">
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={avatarLoading}
              className="relative cursor-pointer"
            >
              {avatarSrc ? (
                <img
                  src={avatarSrc}
                  alt={`${user.firstName} ${user.lastName}`}
                  className="w-24 h-24 rounded-full object-cover ring-4 ring-prokip-navy/10"
                />
              ) : (
                <div className="w-24 h-24 rounded-full bg-prokip-navy text-white flex items-center justify-center text-2xl font-bold ring-4 ring-prokip-navy/10">
                  {initials}
                </div>
              )}
              <div className="absolute bottom-0 right-0 w-8 h-8 bg-prokip-navy rounded-full flex items-center justify-center border-2 border-white shadow-md">
                <Camera className="w-4 h-4 text-white" />
              </div>
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/gif,image/webp"
              onChange={handleAvatarUpload}
              className="hidden"
            />
            {avatarLoading && (
              <p className="text-xs text-gray-400 mt-2">Uploading...</p>
            )}
          </div>

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
