"use client";

import { useState, useEffect } from "react";
import { User, Policy } from "@/lib/types";
import api from "@/lib/api";
import Modal from "./Modal";
import { formatPoints } from "@/lib/grades";
import toast from "react-hot-toast";

interface Props {
  open: boolean;
  onClose: () => void;
  preSelectedUser?: User | null;
  onSuccess?: () => void;
}

export default function PointEntryModal({ open, onClose, preSelectedUser, onSuccess }: Props) {
  const [users, setUsers] = useState<User[]>([]);
  const [policies, setPolicies] = useState<Policy[]>([]);
  const [selectedUserId, setSelectedUserId] = useState("");
  const [selectedPolicyId, setSelectedPolicyId] = useState("");
  const [customPoints, setCustomPoints] = useState("");
  const [reason, setReason] = useState("");
  const [ticketLink, setTicketLink] = useState("");
  const [loading, setLoading] = useState(false);
  const [loadingData, setLoadingData] = useState(false);

  useEffect(() => {
    if (open) {
      setLoadingData(true);
      Promise.all([
        preSelectedUser ? Promise.resolve([]) : api.get("/api/users").then(res => res.data.users),
        api.get("/api/policies").then(res => res.data.policies)
      ]).then(([usersData, policiesData]) => {
        if (!preSelectedUser) setUsers(usersData);
        setPolicies(policiesData);
        if (preSelectedUser) {
          setSelectedUserId(preSelectedUser.id);
        }
        setLoadingData(false);
      }).catch(() => {
        toast.error("Failed to load data");
        setLoadingData(false);
      });
    }
  }, [open, preSelectedUser]);

  const selectedPolicy = policies.find(p => p.id === selectedPolicyId);
  const pointsToApply = selectedPolicy ? selectedPolicy.pointImpact : parseInt(customPoints) || 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUserId || !reason.trim() || pointsToApply === 0) return;

    setLoading(true);
    try {
      await api.post("/api/points", {
        userId: selectedUserId,
        policyId: selectedPolicyId || undefined,
        points: pointsToApply,
        reason: reason.trim(),
        ticketLink: ticketLink.trim() || undefined
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
    setSelectedPolicyId("");
    setCustomPoints("");
    setReason("");
    setTicketLink("");
    onClose();
  };

  const handlePolicyChange = (policyId: string) => {
    setSelectedPolicyId(policyId);
    setCustomPoints("");
  };

  const handleCustomPointsChange = (value: string) => {
    setCustomPoints(value);
    setSelectedPolicyId("");
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

          <div>
            <label className="input-label">Policy</label>
            <select
              value={selectedPolicyId}
              onChange={(e) => handlePolicyChange(e.target.value)}
              className="input-field"
            >
              <option value="">Select a policy (optional)</option>
              {policies.map((policy) => (
                <option key={policy.id} value={policy.id}>
                  {policy.name} ({formatPoints(policy.pointImpact)} points)
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="input-label">Manual Points</label>
            <input
              type="number"
              value={customPoints}
              onChange={(e) => handleCustomPointsChange(e.target.value)}
              placeholder="Enter custom point value"
              className="input-field"
              disabled={!!selectedPolicyId}
            />
            {!selectedPolicyId && customPoints && (
              <p className={`text-sm mt-2 font-medium ${pointsToApply > 0 ? 'text-green-600' : 'text-red-600'}`}>
                Will apply {formatPoints(pointsToApply)} points
              </p>
            )}
            {selectedPolicy && (
              <p className={`text-sm mt-2 font-medium ${selectedPolicy.pointImpact > 0 ? 'text-green-600' : 'text-red-600'}`}>
                Will apply {formatPoints(selectedPolicy.pointImpact)} points
              </p>
            )}
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

          <div>
            <label className="input-label">Ticket/PR Link (Optional)</label>
            <input
              type="url"
              value={ticketLink}
              onChange={(e) => setTicketLink(e.target.value)}
              placeholder="https://..."
              className="input-field"
            />
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