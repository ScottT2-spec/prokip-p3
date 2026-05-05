"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { Policy, Department } from "@/lib/types";
import api from "@/lib/api";
import AppShell from "@/components/AppShell";
import Modal from "@/components/Modal";
import { CardSkeleton } from "@/components/LoadingSkeleton";
import { Plus, Edit3, Trash2, Award, AlertTriangle, Search } from "lucide-react";
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
  const [bulkModalOpen, setBulkModalOpen] = useState(false);
  const [bulkLoading, setBulkLoading] = useState(false);
  const [bulkResult, setBulkResult] = useState<{ message: string; errors?: { row: number; error: string }[] } | null>(null);

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

  // Search & Filter
  const [searchTerm, setSearchTerm] = useState("");
  const [deptFilter, setDeptFilter] = useState("");

  const [activeTab, setActiveTab] = useState<"rewards" | "penalties">("rewards");

  const filtered = policies.filter(p => {
    const matchesSearch = !searchTerm || 
      p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesDept = !deptFilter || 
      (deptFilter === "global" ? p.isGlobal : p.departmentId === deptFilter);
    return matchesSearch && matchesDept;
  });

  const rewardPolicies = filtered.filter(p => p.pointImpact > 0);
  const penaltyPolicies = filtered.filter(p => p.pointImpact < 0);
  const activePolicies = activeTab === "rewards" ? rewardPolicies : penaltyPolicies;

  if (!user || (user.role !== "ADMIN" && user.role !== "LEAD")) {
    return null;
  }

  return (
    <AppShell title="Policies">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
          <p className="text-gray-600">
            Manage point policies for automated and manual point application.
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => setBulkModalOpen(true)}
              className="btn-secondary flex items-center gap-2"
            >
              <Upload className="w-4 h-4" />
              Upload
            </button>
            <button
              onClick={() => setModalOpen(true)}
              className="btn-primary flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              Add Policy
            </button>
          </div>
        </div>

        {/* Search & Filter */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Search policies..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="input-field pl-10 w-full"
            />
          </div>
          <select
            value={deptFilter}
            onChange={(e) => setDeptFilter(e.target.value)}
            className="input-field min-w-[180px]"
          >
            <option value="">All Scopes</option>
            <option value="global">Global Only</option>
            {departments.map((dept) => (
              <option key={dept.id} value={dept.id}>
                {dept.name}
              </option>
            ))}
          </select>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 bg-gray-100 rounded-lg p-1 w-fit">
          <button
            onClick={() => setActiveTab("rewards")}
            className={`px-5 py-2.5 rounded-md font-medium text-sm transition-all ${
              activeTab === "rewards"
                ? "bg-prokip-navy text-white"
                : "text-gray-400 hover:text-gray-500"
            }`}
          >
            Rewards ({rewardPolicies.length})
          </button>
          <button
            onClick={() => setActiveTab("penalties")}
            className={`px-5 py-2.5 rounded-md font-medium text-sm transition-all ${
              activeTab === "penalties"
                ? "bg-prokip-navy text-white"
                : "text-gray-400 hover:text-gray-500"
            }`}
          >
            Penalties ({penaltyPolicies.length})
          </button>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {[1, 2, 3, 4].map(i => <CardSkeleton key={i} />)}
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {activePolicies.map((policy) => (
              <div key={policy.id} className="card">
                <div className="flex justify-between items-start mb-4">
                  <div className="flex-1">
                    <h3 className="font-semibold text-prokip-navy mb-1">{policy.name}</h3>
                    <p className="text-gray-600 text-sm mb-3">{policy.description}</p>
                    <div className="flex items-center gap-4 text-sm">
                      <span className={`font-semibold ${policy.pointImpact > 0 ? 'text-green-600' : 'text-red-600'}`}>
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
            {activePolicies.length === 0 && (
              <div className="lg:col-span-2 text-center py-8 text-gray-500">
                No {activeTab === "rewards" ? "reward" : "penalty"} policies defined
              </div>
            )}
          </div>
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

      {/* Bulk Upload Modal */}
      <Modal
        open={bulkModalOpen}
        onClose={() => {
          setBulkModalOpen(false);
          setBulkResult(null);
        }}
        title="Upload Policies"
        maxWidth="max-w-lg"
      >
        <div className="space-y-4">
          {bulkResult ? (
            <div className="space-y-4">
              <div className={`p-4 rounded-lg ${bulkResult.errors?.length ? 'bg-yellow-50 border border-yellow-200' : 'bg-green-50 border border-green-200'}`}>
                <p className={`font-semibold ${bulkResult.errors?.length ? 'text-yellow-800' : 'text-green-800'}`}>
                  {bulkResult.message}
                </p>
                {bulkResult.errors && bulkResult.errors.length > 0 && (
                  <div className="mt-3 space-y-1">
                    {bulkResult.errors.map((err, i) => (
                      <p key={i} className="text-yellow-700 text-sm">
                        Row {err.row}: {err.error}
                      </p>
                    ))}
                  </div>
                )}
              </div>
              <div className="flex justify-end">
                <button
                  onClick={() => {
                    setBulkModalOpen(false);
                    setBulkResult(null);
                  }}
                  className="btn-primary"
                >
                  Done
                </button>
              </div>
            </div>
          ) : (
            <>
              <p className="text-gray-600">
                Upload a CSV or JSON file with multiple policies. 
              </p>

              <div className="bg-gray-50 rounded-lg p-4 space-y-3">
                <p className="text-sm font-medium text-prokip-navy">CSV format:</p>
                <code className="block text-xs bg-white p-3 rounded border border-gray-200 text-gray-700">
                  name,description,pointImpact<br />
                  Early Delivery,+5 per 24hrs ahead,5<br />
                  Missed Deadline,Missing agreed deadline,-15
                </code>

                <p className="text-sm font-medium text-prokip-navy mt-3">JSON format:</p>
                <code className="block text-xs bg-white p-3 rounded border border-gray-200 text-gray-700">
                  {'[{"name":"...","description":"...","pointImpact":5}]'}
                </code>
              </div>

              <label className={`flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-lg cursor-pointer transition-colors ${
                bulkLoading ? 'border-gray-300 bg-gray-50' : 'border-gray-300 hover:border-prokip-navy hover:bg-gray-50'
              }`}>
                <div className="flex flex-col items-center justify-center pt-5 pb-6">
                  {bulkLoading ? (
                    <p className="text-sm text-gray-500">Uploading...</p>
                  ) : (
                    <>
                      <Upload className="w-8 h-8 text-gray-400 mb-2" />
                      <p className="text-sm text-gray-500">
                        Click to upload <span className="font-medium">.csv</span> or <span className="font-medium">.json</span>
                      </p>
                    </>
                  )}
                </div>
                <input
                  type="file"
                  accept=".csv,.json"
                  className="hidden"
                  disabled={bulkLoading}
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleBulkUpload(file);
                    e.target.value = '';
                  }}
                />
              </label>

              <div className="flex justify-end">
                <button
                  onClick={() => {
                    setBulkModalOpen(false);
                    setBulkResult(null);
                  }}
                  className="btn-secondary"
                >
                  Cancel
                </button>
              </div>
            </>
          )}
        </div>
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