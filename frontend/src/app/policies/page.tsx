"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { Policy, Department } from "@/lib/types";
import api from "@/lib/api";
import AppShell from "@/components/AppShell";
import Modal from "@/components/Modal";
import { CardSkeleton } from "@/components/LoadingSkeleton";
import { Plus, Edit3, Trash2, Award, AlertTriangle } from "lucide-react";
import { formatPoints } from "@/lib/grades";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";

export default function PoliciesPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [policies, setPolicies] = useState<Policy[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingPolicy, setEditingPolicy] = useState<Policy | null>(null);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [policyToDelete, setPolicyToDelete] = useState<Policy | null>(null);
  const [submitLoading, setSubmitLoading] = useState(false);

  const [form, setForm] = useState({
    name: "",
    description: "",
    pointImpact: "",
    departmentId: ""
  });

  useEffect(() => {
    if (!user || (user.role !== "ADMIN" && user.role !== "LEAD")) {
      router.push("/");
      return;
    }
    loadData();
  }, [user, router]);

  const loadData = async () => {
    try {
      const [policiesRes, departmentsRes] = await Promise.all([
        api.get("/api/policies"),
        api.get("/api/departments")
      ]);
      setPolicies(policiesRes.data.policies || []);
      setDepartments(departmentsRes.data.departments || []);
    } catch (error) {
      toast.error("Failed to load policies");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim() || !form.description.trim() || !form.pointImpact) return;

    setSubmitLoading(true);
    try {
      const data = {
        name: form.name.trim(),
        description: form.description.trim(),
        pointImpact: parseInt(form.pointImpact),
        departmentId: form.departmentId || null
      };

      if (editingPolicy) {
        await api.put(`/api/policies/${editingPolicy.id}`, data);
        toast.success("Policy updated successfully");
      } else {
        await api.post("/api/policies", data);
        toast.success("Policy created successfully");
      }

      handleCloseModal();
      loadData();
    } catch (error: any) {
      toast.error(error.response?.data?.error || "Failed to save policy");
    } finally {
      setSubmitLoading(false);
    }
  };

  const handleEdit = (policy: Policy) => {
    setEditingPolicy(policy);
    setForm({
      name: policy.name,
      description: policy.description,
      pointImpact: policy.pointImpact.toString(),
      departmentId: policy.departmentId || ""
    });
    setModalOpen(true);
  };

  const handleDelete = async () => {
    if (!policyToDelete) return;

    try {
      await api.delete(`/api/policies/${policyToDelete.id}`);
      toast.success("Policy deleted successfully");
      loadData();
    } catch (error: any) {
      toast.error(error.response?.data?.error || "Failed to delete policy");
    } finally {
      setDeleteModalOpen(false);
      setPolicyToDelete(null);
    }
  };

  const handleCloseModal = () => {
    setModalOpen(false);
    setEditingPolicy(null);
    setForm({
      name: "",
      description: "",
      pointImpact: "",
      departmentId: ""
    });
  };

  const rewardPolicies = policies.filter(p => p.pointImpact > 0);
  const penaltyPolicies = policies.filter(p => p.pointImpact < 0);

  if (!user || (user.role !== "ADMIN" && user.role !== "LEAD")) {
    return null;
  }

  return (
    <AppShell title="Policies">
      <div className="space-y-8">
        {/* Header */}
        <div className="flex justify-between items-center">
          <p className="text-gray-600">
            Manage point policies for automated and manual point application.
          </p>
          <button
            onClick={() => setModalOpen(true)}
            className="btn-primary flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Add Policy
          </button>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {[1, 2, 3, 4].map(i => <CardSkeleton key={i} />)}
          </div>
        ) : (
          <>
            {/* Point Additions (Rewards) */}
            <div>
              <div className="flex items-center gap-3 mb-6">
                <div className="p-2 bg-green-100 rounded-lg">
                  <Award className="w-5 h-5 text-green-600" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-prokip-navy">Point Additions (Rewards)</h2>
                  <p className="text-gray-600 text-sm">Policies that add points to users</p>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {rewardPolicies.map((policy) => (
                  <div key={policy.id} className="card">
                    <div className="flex justify-between items-start mb-4">
                      <div className="flex-1">
                        <h3 className="font-semibold text-prokip-navy mb-1">{policy.name}</h3>
                        <p className="text-gray-600 text-sm mb-3">{policy.description}</p>
                        <div className="flex items-center gap-4 text-sm">
                          <span className="text-green-600 font-semibold">
                            {formatPoints(policy.pointImpact)} points
                          </span>
                          <span className="text-gray-500">
                            {policy.isGlobal ? "Global" : policy.department?.name || "Department"}
                          </span>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleEdit(policy)}
                          className="p-2 text-gray-400 hover:text-prokip-navy rounded-lg hover:bg-gray-100 transition-colors"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>
                        {user.role === "ADMIN" && (
                          <button
                            onClick={() => {
                              setPolicyToDelete(policy);
                              setDeleteModalOpen(true);
                            }}
                            className="p-2 text-gray-400 hover:text-red-600 rounded-lg hover:bg-red-50 transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
                {rewardPolicies.length === 0 && (
                  <div className="lg:col-span-2 text-center py-8 text-gray-500">
                    No reward policies defined
                  </div>
                )}
              </div>
            </div>

            {/* Point Deductions (Penalties) */}
            <div>
              <div className="flex items-center gap-3 mb-6">
                <div className="p-2 bg-red-100 rounded-lg">
                  <AlertTriangle className="w-5 h-5 text-red-600" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-prokip-navy">Point Deductions (Penalties)</h2>
                  <p className="text-gray-600 text-sm">Policies that deduct points from users</p>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {penaltyPolicies.map((policy) => (
                  <div key={policy.id} className="card">
                    <div className="flex justify-between items-start mb-4">
                      <div className="flex-1">
                        <h3 className="font-semibold text-prokip-navy mb-1">{policy.name}</h3>
                        <p className="text-gray-600 text-sm mb-3">{policy.description}</p>
                        <div className="flex items-center gap-4 text-sm">
                          <span className="text-red-600 font-semibold">
                            {formatPoints(policy.pointImpact)} points
                          </span>
                          <span className="text-gray-500">
                            {policy.isGlobal ? "Global" : policy.department?.name || "Department"}
                          </span>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleEdit(policy)}
                          className="p-2 text-gray-400 hover:text-prokip-navy rounded-lg hover:bg-gray-100 transition-colors"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>
                        {user.role === "ADMIN" && (
                          <button
                            onClick={() => {
                              setPolicyToDelete(policy);
                              setDeleteModalOpen(true);
                            }}
                            className="p-2 text-gray-400 hover:text-red-600 rounded-lg hover:bg-red-50 transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
                {penaltyPolicies.length === 0 && (
                  <div className="lg:col-span-2 text-center py-8 text-gray-500">
                    No penalty policies defined
                  </div>
                )}
              </div>
            </div>
          </>
        )}
      </div>

      {/* Add/Edit Policy Modal */}
      <Modal
        open={modalOpen}
        onClose={handleCloseModal}
        title={editingPolicy ? "Edit Policy" : "Add Policy"}
        maxWidth="max-w-lg"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="input-label">Policy Name *</label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => setForm(prev => ({ ...prev, name: e.target.value }))}
              placeholder="e.g., Code Review Completion"
              className="input-field"
              required
            />
          </div>

          <div>
            <label className="input-label">Description *</label>
            <textarea
              value={form.description}
              onChange={(e) => setForm(prev => ({ ...prev, description: e.target.value }))}
              placeholder="Detailed description of when this policy applies..."
              className="input-field min-h-[100px] resize-none"
              required
            />
          </div>

          <div>
            <label className="input-label">Point Impact *</label>
            <input
              type="number"
              value={form.pointImpact}
              onChange={(e) => setForm(prev => ({ ...prev, pointImpact: e.target.value }))}
              placeholder="e.g., 10 for rewards, -5 for penalties"
              className="input-field"
              required
            />
            <p className="text-xs text-gray-500 mt-1">
              Positive numbers for rewards, negative for penalties
            </p>
          </div>

          <div>
            <label className="input-label">Scope</label>
            <select
              value={form.departmentId}
              onChange={(e) => setForm(prev => ({ ...prev, departmentId: e.target.value }))}
              className="input-field"
            >
              <option value="">Global (all departments)</option>
              {departments.map((dept) => (
                <option key={dept.id} value={dept.id}>
                  {dept.name} only
                </option>
              ))}
            </select>
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <button
              type="button"
              onClick={handleCloseModal}
              className="btn-secondary"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitLoading}
              className="btn-primary"
            >
              {submitLoading 
                ? (editingPolicy ? "Updating..." : "Creating...") 
                : (editingPolicy ? "Update Policy" : "Create Policy")
              }
            </button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        open={deleteModalOpen}
        onClose={() => {
          setDeleteModalOpen(false);
          setPolicyToDelete(null);
        }}
        title="Delete Policy"
        maxWidth="max-w-md"
      >
        <div className="space-y-4">
          <p className="text-gray-600">
            Are you sure you want to delete the policy "{policyToDelete?.name}"? 
            This action cannot be undone.
          </p>
          <div className="flex justify-end gap-3">
            <button
              onClick={() => {
                setDeleteModalOpen(false);
                setPolicyToDelete(null);
              }}
              className="btn-secondary"
            >
              Cancel
            </button>
            <button
              onClick={handleDelete}
              className="btn-danger"
            >
              Delete Policy
            </button>
          </div>
        </div>
      </Modal>
    </AppShell>
  );
}