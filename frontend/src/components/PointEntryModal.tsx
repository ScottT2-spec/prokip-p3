"use client";

import { useState, useEffect, useRef } from "react";
import { User, PointCategory } from "@/lib/types";
import api from "@/lib/api";
import Modal from "./Modal";
import { formatPoints } from "@/lib/grades";
import toast from "react-hot-toast";
import { ImagePlus, X } from "lucide-react";

interface Props {
  open: boolean;
  onClose: () => void;
  preSelectedUser?: User | null;
  onSuccess?: () => void;
}

export default function PointEntryModal({ open, onClose, preSelectedUser, onSuccess }: Props) {
  const [users, setUsers] = useState<User[]>([]);
  const [selectedUserId, setSelectedUserId] = useState("");
  const [category, setCategory] = useState<PointCategory>("PERFORMANCE");
  const [customPoints, setCustomPoints] = useState("");
  const [reason, setReason] = useState("");
  const [ticketLink, setTicketLink] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingData, setLoadingData] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      if (preSelectedUser) {
        setSelectedUserId(preSelectedUser.id);
        setLoadingData(false);
      } else {
        setLoadingData(true);
        api.get("/api/users").then(res => {
          setUsers(res.data.users.filter((u: User) => u.role !== "ADMIN"));
          setLoadingData(false);
        }).catch(() => {
          toast.error("Failed to load users");
          setLoadingData(false);
        });
      }
    }
  }, [open, preSelectedUser]);

  const pointsToApply = parseInt(customPoints) || 0;

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image must be under 5MB");
      return;
    }

    setImageFile(file);
    const reader = new FileReader();
    reader.onloadend = () => setImagePreview(reader.result as string);
    reader.readAsDataURL(file);
  };

  const removeImage = () => {
    setImageFile(null);
    setImagePreview(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUserId || !reason.trim() || pointsToApply === 0) return;

    setLoading(true);
    try {
      const formData = new FormData();
      formData.append("userId", selectedUserId);
      formData.append("points", String(pointsToApply));
      formData.append("category", category);
      formData.append("reason", reason.trim());
      if (ticketLink.trim()) formData.append("ticketLink", ticketLink.trim());
      if (imageFile) formData.append("image", imageFile);

      await api.post("/api/points", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      toast.success(`Successfully applied ${formatPoints(pointsToApply)} points`);
      onSuccess?.();
      handleClose();
    } catch (error) {
      toast.error("Failed to apply points");
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setSelectedUserId("");
    setCategory("PERFORMANCE");
    setCustomPoints("");
    setReason("");
    setTicketLink("");
    setImageFile(null);
    setImagePreview(null);
    onClose();
  };

  if (!open) return null;

  return (
    <Modal open={open} onClose={handleClose} title="Update Points" maxWidth="max-w-xl">
      {loadingData ? (
        <div className="space-y-4 animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-1/3" />
          <div className="h-10 bg-gray-200 rounded" />
          <div className="h-4 bg-gray-200 rounded w-1/4" />
          <div className="h-10 bg-gray-200 rounded" />
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-6">
          {!preSelectedUser && (
            <div>
              <label className="input-label">Select User</label>
              <select
                value={selectedUserId}
                onChange={(e) => setSelectedUserId(e.target.value)}
                className="input-field"
                required
              >
                <option value="">Choose a user...</option>
                {users.map((user) => (
                  <option key={user.id} value={user.id}>
                    {user.firstName} {user.lastName} ({user.email})
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Category Toggle */}
          <div>
            <label className="input-label">Type *</label>
            <div className="flex rounded-lg border border-gray-200 overflow-hidden">
              <button
                type="button"
                onClick={() => { setCategory("PERFORMANCE"); setCustomPoints(""); }}
                className={`flex-1 py-2.5 text-sm font-medium transition-colors ${
                  category === "PERFORMANCE"
                    ? "bg-prokip-navy text-white"
                    : "bg-white text-gray-500 hover:bg-gray-50"
                }`}
              >
                ⚙️ Performance
              </button>
              <button
                type="button"
                onClick={() => { setCategory("REWARD"); setCustomPoints(""); }}
                className={`flex-1 py-2.5 text-sm font-medium transition-colors border-l border-gray-200 ${
                  category === "REWARD"
                    ? "bg-prokip-gold text-prokip-navy-dark"
                    : "bg-white text-gray-500 hover:bg-gray-50"
                }`}
              >
                🌟 Reward
              </button>
            </div>
          </div>

          <div>
            <label className="input-label">Points *</label>
            <input
              type="number"
              value={customPoints}
              onChange={(e) => setCustomPoints(e.target.value)}
              placeholder={category === "PERFORMANCE" ? "e.g. -5" : "e.g. 10"}
              className="input-field"
              required
            />
          </div>

          <div>
            <label className="input-label">Reason *</label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Explain why you're applying these points..."
              className="input-field min-h-[100px] resize-none"
              required
            />
          </div>

          {/* Image Upload (Optional) */}
          <div>
            <label className="input-label">Evidence Screenshot <span className="text-gray-400 font-normal">(optional)</span></label>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/gif,image/webp"
              onChange={handleImageChange}
              className="hidden"
            />
            {imagePreview ? (
              <div className="relative inline-block mt-2">
                <img
                  src={imagePreview}
                  alt="Evidence preview"
                  className="max-h-40 rounded-lg border border-gray-200 shadow-sm"
                />
                <button
                  type="button"
                  onClick={removeImage}
                  className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600 transition-colors shadow-sm"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="mt-2 flex items-center gap-2 px-4 py-2.5 border-2 border-dashed border-gray-300 rounded-lg text-gray-500 hover:border-prokip-navy hover:text-prokip-navy transition-colors text-sm"
              >
                <ImagePlus className="w-4 h-4" />
                Attach Screenshot
              </button>
            )}
            <p className="text-xs text-gray-400 mt-1">Max 5MB. JPEG, PNG, GIF, or WebP.</p>
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="submit"
              disabled={loading || !selectedUserId || !reason.trim() || pointsToApply === 0}
              className="btn-primary flex-1"
            >
              {loading ? "Applying..." : `Apply ${formatPoints(pointsToApply)} Points`}
            </button>
            <button
              type="button"
              onClick={handleClose}
              className="btn-secondary"
            >
              Cancel
            </button>
          </div>
        </form>
      )}
    </Modal>
  );
}
