"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";
import api from "@/lib/api";
import AppShell from "@/components/AppShell";
import GradeBadge from "@/components/GradeBadge";
import { PageSkeleton } from "@/components/LoadingSkeleton";
import { Grade, gradeOrder, getGradeConfig } from "@/lib/grades";
import { Award, AlertTriangle, Edit3, Check, X } from "lucide-react";
import toast from "react-hot-toast";

interface GradeDefinition {
  id: string;
  grade: Grade;
  minPoints: number;
  maxPoints: number | null;
  title: string;
  description: string;
  reward: string | null;
  consequence: string | null;
  departmentId: string | null;
  department: { id: string; name: string } | null;
}

export default function RewardsPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [definitions, setDefinitions] = useState<GradeDefinition[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({ reward: "", consequence: "" });
  const [saving, setSaving] = useState(false);

  const canEdit = user?.role === "ADMIN" || user?.role === "LEAD";

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      router.push("/login");
      return;
    }
    loadData();
  }, [user, authLoading]);

  const loadData = async () => {
    try {
      const response = await api.get("/api/grades/definitions");
      setDefinitions(response.data.global || []);
    } catch (error) {
      toast.error("Failed to load grade data");
    } finally {
      setLoading(false);
    }
  };

  const startEditing = (def: GradeDefinition) => {
    setEditingId(def.id);
    setEditForm({
      reward: def.reward || "",
      consequence: def.consequence || "",
    });
  };

  const cancelEditing = () => {
    setEditingId(null);
    setEditForm({ reward: "", consequence: "" });
  };

  const handleSave = async (def: GradeDefinition) => {
    setSaving(true);
    try {
      await api.post("/api/grades/definitions", {
        grade: def.grade,
        minPoints: def.minPoints,
        maxPoints: def.maxPoints,
        title: def.title,
        description: def.description,
        reward: editForm.reward || null,
        consequence: editForm.consequence || null,
        departmentId: def.departmentId,
      });
      toast.success("Updated successfully");
      setEditingId(null);
      loadData();
    } catch (error: any) {
      toast.error(error.response?.data?.error || "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  const sorted = [...definitions].sort((a, b) => {
    return gradeOrder.indexOf(a.grade) - gradeOrder.indexOf(b.grade);
  });

  if (loading || authLoading) {
    return (
      <AppShell>
        <PageSkeleton />
      </AppShell>
    );
  }

  return (
    <AppShell title="Policies & Rewards">
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-prokip-navy">Policies & Rewards</h1>
          <p className="text-gray-600 mt-1">
            Rewards and consequences for each grade level
          </p>
        </div>

        {/* Grade Cards */}
        <div className="space-y-4">
          {sorted.map((def) => {
            const config = getGradeConfig(def.grade);
            const isEditing = editingId === def.id;
            const isPositiveGrade = ["A_PLUS", "A", "B"].includes(def.grade);

            return (
              <div
                key={def.id}
                className="card border-l-4 transition-all"
                style={{ borderLeftColor: config.color }}
              >
                <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4">
                  {/* Grade header */}
                  <div className="flex items-center gap-4 min-w-[200px]">
                    <GradeBadge grade={def.grade} size="lg" />
                    <div>
                      <h3 className="text-lg font-bold text-prokip-navy">
                        {def.title}
                      </h3>
                      <p className="text-sm text-gray-500">
                        {def.minPoints}{def.maxPoints ? `–${def.maxPoints}` : "+"} points
                      </p>
                      <p className="text-sm text-gray-600 mt-0.5">{def.description}</p>
                    </div>
                  </div>

                  {/* Edit button */}
                  {canEdit && !isEditing && (
                    <button
                      onClick={() => startEditing(def)}
                      className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-prokip-navy transition-colors shrink-0"
                    >
                      <Edit3 className="w-4 h-4" />
                      Edit
                    </button>
                  )}
                </div>

                {/* Reward / Consequence content */}
                <div className="mt-4 grid grid-cols-1 lg:grid-cols-2 gap-4">
                  {/* Reward */}
                  <div
                    className={`rounded-lg p-4 ${
                      isPositiveGrade ? "bg-green-50" : "bg-gray-50"
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <Award className="w-4 h-4 text-green-600" />
                      <span className="text-sm font-semibold text-green-800">
                        Reward
                      </span>
                    </div>
                    {isEditing ? (
                      <textarea
                        value={editForm.reward}
                        onChange={(e) =>
                          setEditForm((p) => ({ ...p, reward: e.target.value }))
                        }
                        className="input-field min-h-[80px] resize-none text-sm"
                        placeholder="Describe the reward for this grade level..."
                      />
                    ) : (
                      <p className="text-sm text-gray-700">
                        {def.reward || (
                          <span className="text-gray-400 italic">
                            No reward defined
                          </span>
                        )}
                      </p>
                    )}
                  </div>

                  {/* Consequence */}
                  <div
                    className={`rounded-lg p-4 ${
                      !isPositiveGrade ? "bg-red-50" : "bg-gray-50"
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <AlertTriangle className="w-4 h-4 text-red-500" />
                      <span className="text-sm font-semibold text-red-800">
                        Consequence
                      </span>
                    </div>
                    {isEditing ? (
                      <textarea
                        value={editForm.consequence}
                        onChange={(e) =>
                          setEditForm((p) => ({
                            ...p,
                            consequence: e.target.value,
                          }))
                        }
                        className="input-field min-h-[80px] resize-none text-sm"
                        placeholder="Describe the consequence for this grade level..."
                      />
                    ) : (
                      <p className="text-sm text-gray-700">
                        {def.consequence || (
                          <span className="text-gray-400 italic">
                            No consequence defined
                          </span>
                        )}
                      </p>
                    )}
                  </div>
                </div>

                {/* Save / Cancel buttons */}
                {isEditing && (
                  <div className="flex justify-end gap-2 mt-4">
                    <button
                      onClick={cancelEditing}
                      disabled={saving}
                      className="btn-secondary flex items-center gap-1.5 text-sm"
                    >
                      <X className="w-4 h-4" />
                      Cancel
                    </button>
                    <button
                      onClick={() => handleSave(def)}
                      disabled={saving}
                      className="btn-primary flex items-center gap-1.5 text-sm"
                    >
                      <Check className="w-4 h-4" />
                      {saving ? "Saving..." : "Save"}
                    </button>
                  </div>
                )}
              </div>
            );
          })}

          {sorted.length === 0 && (
            <div className="card text-center py-12 text-gray-400">
              <p className="text-lg mb-2">No grade definitions yet</p>
              <p className="text-sm">
                Create grade definitions on the{" "}
                <button
                  onClick={() => router.push("/grades")}
                  className="text-prokip-navy font-medium hover:underline"
                >
                  Grades page
                </button>{" "}
                first.
              </p>
            </div>
          )}
        </div>
      </div>
    </AppShell>
  );
}
