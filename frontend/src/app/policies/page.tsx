"use client";

import { useEffect, useState, useCallback } from "react";
import { useAuth } from "@/context/AuthContext";
import { Policy, Department } from "@/lib/types";
import api from "@/lib/api";
import AppShell from "@/components/AppShell";
import Modal from "@/components/Modal";
import { CardSkeleton } from "@/components/LoadingSkeleton";
import { Plus, Edit3, Trash2, Search, Upload, X, FileSpreadsheet, AlertCircle, CheckCircle2 } from "lucide-react";
import { formatPoints } from "@/lib/grades";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";

interface ManualPolicyRow {
  name: string;
  description: string;
  pointImpact: string;
}

interface ParsedPolicy {
  name: string;
  description: string;
  pointImpact: number;
  valid: boolean;
  error?: string;
}

const emptyRow = (): ManualPolicyRow => ({
  name: "",
  description: "",
  pointImpact: "",
});

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
  const [uploadModalOpen, setUploadModalOpen] = useState(false);

  // Upload tabs
  const [uploadTab, setUploadTab] = useState<"manual" | "excel">("manual");

  // Manual upload state
  const [rows, setRows] = useState<ManualPolicyRow[]>([emptyRow()]);
  const [rowErrors, setRowErrors] = useState<Record<string, string>>({});
  const [manualSaving, setManualSaving] = useState(false);

  // Excel upload state
  const [dragOver, setDragOver] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [parsed, setParsed] = useState<ParsedPolicy[] | null>(null);
  const [parseErrors, setParseErrors] = useState<{ row: number; error: string }[]>([]);
  const [confirming, setConfirming] = useState(false);

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
        departmentId: user?.role === "LEAD" ? (user.departmentId || null) : (form.departmentId || null)
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
    setForm({ name: "", description: "", pointImpact: "", departmentId: "" });
  };

  const handleCloseUploadModal = () => {
    setUploadModalOpen(false);
    setRows([emptyRow()]);
    setRowErrors({});
    setParsed(null);
    setParseErrors([]);
    setUploadTab("manual");
  };

  // === Manual Upload Handlers ===
  const updateRow = (index: number, field: keyof ManualPolicyRow, value: string) => {
    const updated = [...rows];
    updated[index] = { ...updated[index], [field]: value };
    setRows(updated);
    const errKey = `${index}-${field}`;
    if (rowErrors[errKey]) {
      const newErrors = { ...rowErrors };
      delete newErrors[errKey];
      setRowErrors(newErrors);
    }
  };

  const addRow = () => {
    if (rows.length >= 20) {
      toast.error("Maximum 20 rows allowed");
      return;
    }
    setRows([...rows, emptyRow()]);
  };

  const removeRow = (index: number) => {
    if (rows.length === 1) return;
    setRows(rows.filter((_, i) => i !== index));
  };

  const validateManual = (): boolean => {
    const newErrors: Record<string, string> = {};
    rows.forEach((row, i) => {
      if (!row.name.trim()) newErrors[`${i}-name`] = "Required";
      if (!row.description.trim()) newErrors[`${i}-description`] = "Required";
      if (!row.pointImpact || isNaN(Number(row.pointImpact))) newErrors[`${i}-pointImpact`] = "Required";
    });
    setRowErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const saveManual = async () => {
    if (!validateManual()) return;
    setManualSaving(true);
    try {
      const policies = rows.map((r) => ({
        name: r.name.trim(),
        description: r.description.trim(),
        pointImpact: parseInt(r.pointImpact),
      }));
      const res = await api.post("/api/policies/bulk", { policies });
      toast.success(res.data.message || `${policies.length} policies created`);
      setRows([emptyRow()]);
      setRowErrors({});
      handleCloseUploadModal();
      loadData();
    } catch (err: any) {
      toast.error(err.response?.data?.error || "Failed to save policies");
    } finally {
      setManualSaving(false);
    }
  };

  // === Excel Upload Handlers ===
  const handleFile = async (file: File) => {
    const ext = file.name.split(".").pop()?.toLowerCase();
    if (!["csv", "json"].includes(ext || "")) {
      toast.error("Only .csv and .json files are accepted");
      return;
    }
    setUploading(true);
    setParsed(null);
    setParseErrors([]);

    try {
      const text = await file.text();
      const parsedPolicies: ParsedPolicy[] = [];
      const errors: { row: number; error: string }[] = [];

      if (ext === "json") {
        const data = JSON.parse(text);
        const arr = Array.isArray(data) ? data : data.policies || [];
        arr.forEach((item: any, i: number) => {
          if (item.name && item.pointImpact !== undefined) {
            parsedPolicies.push({
              name: item.name,
              description: item.description || "",
              pointImpact: parseInt(item.pointImpact) || 0,
              valid: true,
            });
          } else {
            errors.push({ row: i + 1, error: "Missing name or pointImpact" });
          }
        });
      } else {
        // CSV parsing
        const lines = text.split("\n").filter((l: string) => l.trim());
        if (lines.length < 2) {
          toast.error("CSV must have a header row and at least one data row");
          setUploading(false);
          return;
        }

        const header = lines[0].toLowerCase().split(",").map((h: string) => h.trim());
        const nameIdx = header.findIndex((h: string) => h === "name");
        const descIdx = header.findIndex((h: string) => h === "description");
        const pointsIdx = header.findIndex((h: string) => h === "pointimpact" || h === "point_impact" || h === "points");

        if (nameIdx === -1 || pointsIdx === -1) {
          toast.error("CSV must have columns: name, pointImpact (and optionally description)");
          setUploading(false);
          return;
        }

        for (let i = 1; i < lines.length; i++) {
          const cols = lines[i].split(",").map((c: string) => c.trim());
          if (cols[nameIdx]) {
            parsedPolicies.push({
              name: cols[nameIdx],
              description: descIdx !== -1 ? cols[descIdx] || "" : "",
              pointImpact: parseInt(cols[pointsIdx]) || 0,
              valid: true,
            });
          } else {
            errors.push({ row: i + 1, error: "Missing name" });
          }
        }
      }

      setParsed(parsedPolicies);
      setParseErrors(errors);
      if (parsedPolicies.length === 0 && errors.length > 0) {
        toast.error("No valid policies found in file");
      }
    } catch (err) {
      toast.error("Failed to parse file");
    } finally {
      setUploading(false);
    }
  };

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }, []);

  const confirmExcelSave = async () => {
    if (!parsed) return;
    const valid = parsed.filter((p) => p.valid);
    if (valid.length === 0) {
      toast.error("No valid policies to save");
      return;
    }
    setConfirming(true);
    try {
      const policies = valid.map((p) => ({
        name: p.name,
        description: p.description,
        pointImpact: p.pointImpact,
      }));
      const res = await api.post("/api/policies/bulk", { policies });
      toast.success(res.data.message || `${valid.length} policies created`);
      handleCloseUploadModal();
      loadData();
    } catch (err: any) {
      toast.error(err.response?.data?.error || "Failed to save policies");
    } finally {
      setConfirming(false);
    }
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

  if (!user || (user.role !== "ADMIN" && user.role !== "LEAD")) return null;

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
              onClick={() => setUploadModalOpen(true)}
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
          {user?.role === "ADMIN" && (
            <div>
              <label className="input-label">Scope</label>
              <select
                value={form.departmentId}
                onChange={(e) => setForm(prev => ({ ...prev, departmentId: e.target.value }))}
                className="input-field"
              >
                <option value="">Global (all departments)</option>
                {departments.map((dept) => (
                  <option key={dept.id} value={dept.id}>{dept.name} only</option>
                ))}
              </select>
            </div>
          )}
          <div className="flex justify-end gap-3 pt-4">
            <button type="button" onClick={handleCloseModal} className="btn-secondary">Cancel</button>
            <button type="submit" disabled={submitLoading} className="btn-primary">
              {submitLoading
                ? (editingPolicy ? "Updating..." : "Creating...")
                : (editingPolicy ? "Update Policy" : "Create Policy")
              }
            </button>
          </div>
        </form>
      </Modal>

      {/* Upload Modal (Manual + Excel) */}
      <Modal
        open={uploadModalOpen}
        onClose={handleCloseUploadModal}
        title="Upload Policies"
        maxWidth="max-w-3xl"
      >
        {/* Upload Tabs */}
        <div className="flex gap-1 mb-6 bg-[#F1F5F9] rounded-lg p-1 w-fit">
          <button
            onClick={() => setUploadTab("manual")}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
              uploadTab === "manual" ? "bg-white text-prokip-navy shadow-sm" : "text-gray-500 hover:text-gray-700"
            }`}
          >
            Manual Add
          </button>
          <button
            onClick={() => setUploadTab("excel")}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
              uploadTab === "excel" ? "bg-white text-prokip-navy shadow-sm" : "text-gray-500 hover:text-gray-700"
            }`}
          >
            File Import
          </button>
        </div>

        {/* Manual Tab */}
        {uploadTab === "manual" && (
          <div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-[#E2E8F0]">
                    <th className="text-left py-3 px-3 text-xs font-semibold text-[#64748B] uppercase tracking-wider">Name</th>
                    <th className="text-left py-3 px-3 text-xs font-semibold text-[#64748B] uppercase tracking-wider">Description</th>
                    <th className="text-left py-3 px-3 text-xs font-semibold text-[#64748B] uppercase tracking-wider">Points</th>
                    <th className="w-10"></th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row, i) => (
                    <tr key={i} className="border-b border-[#F1F5F9]">
                      <td className="py-2 px-3">
                        <input
                          type="text"
                          value={row.name}
                          onChange={(e) => updateRow(i, "name", e.target.value)}
                          placeholder="Policy name"
                          className={`input-field text-sm py-1.5 ${rowErrors[`${i}-name`] ? "border-red-400 ring-1 ring-red-400" : ""}`}
                        />
                      </td>
                      <td className="py-2 px-3">
                        <input
                          type="text"
                          value={row.description}
                          onChange={(e) => updateRow(i, "description", e.target.value)}
                          placeholder="Description..."
                          className={`input-field text-sm py-1.5 ${rowErrors[`${i}-description`] ? "border-red-400 ring-1 ring-red-400" : ""}`}
                        />
                      </td>
                      <td className="py-2 px-3">
                        <input
                          type="number"
                          value={row.pointImpact}
                          onChange={(e) => updateRow(i, "pointImpact", e.target.value)}
                          placeholder="0"
                          className={`input-field text-sm py-1.5 w-24 ${rowErrors[`${i}-pointImpact`] ? "border-red-400 ring-1 ring-red-400" : ""}`}
                        />
                      </td>
                      <td className="py-2 px-1">
                        {rows.length > 1 && (
                          <button
                            onClick={() => removeRow(i)}
                            className="p-1 text-gray-400 hover:text-red-500 transition-colors"
                          >
                            <X size={16} />
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex items-center justify-between mt-4">
              <button
                onClick={addRow}
                disabled={rows.length >= 20}
                className="flex items-center gap-1.5 text-sm text-prokip-navy font-medium hover:text-prokip-gold transition-colors disabled:opacity-50"
              >
                <Plus size={16} /> Add Row
                <span className="text-xs text-gray-400 ml-1">({rows.length}/20)</span>
              </button>
              <button
                onClick={saveManual}
                disabled={manualSaving}
                className="btn-primary"
              >
                {manualSaving ? "Saving..." : "Save All"}
              </button>
            </div>
          </div>
        )}

        {/* Excel/File Import Tab */}
        {uploadTab === "excel" && (
          <div className="space-y-4">
            {!parsed && (
              <div
                onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                onDragLeave={() => setDragOver(false)}
                onDrop={onDrop}
                className={`border-2 border-dashed rounded-lg transition-colors cursor-pointer ${
                  dragOver ? "border-prokip-gold bg-prokip-gold/5" : "border-[#E2E8F0]"
                }`}
                onClick={() => {
                  const input = document.createElement("input");
                  input.type = "file";
                  input.accept = ".csv,.json";
                  input.onchange = (e) => {
                    const file = (e.target as HTMLInputElement).files?.[0];
                    if (file) handleFile(file);
                  };
                  input.click();
                }}
              >
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  {uploading ? (
                    <>
                      <div className="w-10 h-10 border-4 border-prokip-navy/20 border-t-prokip-navy rounded-full animate-spin mb-3" />
                      <p className="text-sm text-gray-500">Parsing file...</p>
                    </>
                  ) : (
                    <>
                      <FileSpreadsheet size={40} className="text-prokip-navy/30 mb-3" />
                      <p className="text-sm font-medium text-prokip-navy">
                        Drop your .csv or .json file here
                      </p>
                      <p className="text-xs text-gray-400 mt-1">
                        or click to browse. Columns: name, description, pointImpact
                      </p>
                    </>
                  )}
                </div>
              </div>
            )}

            {/* Preview table */}
            {parsed && parsed.length > 0 && (
              <div>
                <div className="flex items-center justify-between pb-2">
                  <h3 className="font-semibold text-prokip-navy text-sm">
                    Preview ({parsed.filter((p) => p.valid).length} valid)
                  </h3>
                  <button
                    onClick={() => { setParsed(null); setParseErrors([]); }}
                    className="text-xs text-gray-400 hover:text-gray-600"
                  >
                    Clear
                  </button>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-[#E2E8F0]">
                        <th className="text-left py-3 px-4 text-xs font-semibold text-[#64748B] uppercase tracking-wider">Status</th>
                        <th className="text-left py-3 px-4 text-xs font-semibold text-[#64748B] uppercase tracking-wider">Name</th>
                        <th className="text-left py-3 px-4 text-xs font-semibold text-[#64748B] uppercase tracking-wider">Description</th>
                        <th className="text-left py-3 px-4 text-xs font-semibold text-[#64748B] uppercase tracking-wider">Points</th>
                      </tr>
                    </thead>
                    <tbody>
                      {parsed.map((entry, i) => (
                        <tr key={i} className={`border-b border-[#F1F5F9] ${!entry.valid ? "bg-red-50" : ""}`}>
                          <td className="py-2.5 px-4">
                            {entry.valid ? (
                              <CheckCircle2 size={16} className="text-green-500" />
                            ) : (
                              <AlertCircle size={16} className="text-red-500" />
                            )}
                          </td>
                          <td className="py-2.5 px-4 text-sm font-medium text-prokip-navy">{entry.name}</td>
                          <td className="py-2.5 px-4 text-sm text-gray-600">{entry.description || "—"}</td>
                          <td className={`py-2.5 px-4 text-sm font-semibold ${entry.pointImpact >= 0 ? "text-green-600" : "text-red-600"}`}>
                            {entry.pointImpact > 0 ? "+" : ""}{entry.pointImpact}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="flex justify-end pt-3">
                  <button
                    onClick={confirmExcelSave}
                    disabled={confirming || parsed.filter((p) => p.valid).length === 0}
                    className="btn-primary"
                  >
                    {confirming ? "Saving..." : `Confirm & Save (${parsed.filter((p) => p.valid).length} policies)`}
                  </button>
                </div>
              </div>
            )}

            {/* Parse errors */}
            {parseErrors.length > 0 && (
              <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3">
                <h4 className="text-sm font-semibold text-red-700 mb-2 flex items-center gap-1.5">
                  <AlertCircle size={14} /> Parsing Errors
                </h4>
                <ul className="space-y-1">
                  {parseErrors.map((e, i) => (
                    <li key={i} className="text-xs text-red-600">
                      Row {e.row}: {e.error}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        open={deleteModalOpen}
        onClose={() => { setDeleteModalOpen(false); setPolicyToDelete(null); }}
        title="Delete Policy"
        maxWidth="max-w-md"
      >
        <div className="space-y-4">
          <p className="text-gray-600">
            Are you sure you want to delete the policy &quot;{policyToDelete?.name}&quot;?
            This action cannot be undone.
          </p>
          <div className="flex justify-end gap-3">
            <button onClick={() => { setDeleteModalOpen(false); setPolicyToDelete(null); }} className="btn-secondary">Cancel</button>
            <button onClick={handleDelete} className="btn-danger">Delete Policy</button>
          </div>
        </div>
      </Modal>
    </AppShell>
  );
}
