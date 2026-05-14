"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";
import api from "@/lib/api";
import AppShell from "@/components/AppShell";
import Modal from "@/components/Modal";
import GradeBadge from "@/components/GradeBadge";
import { PageSkeleton } from "@/components/LoadingSkeleton";
import { Plus, Edit3, Trash2, Calendar, Gift } from "lucide-react";
import { Grade, gradeOrder } from "@/lib/grades";
import { Department } from "@/lib/types";
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

interface Quarter {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
  isActive: boolean;
  departmentId: string | null;
  department: { id: string; name: string } | null;
}

const GRADE_OPTIONS: { value: Grade; label: string }[] = [
  { value: "A_PLUS", label: "A+" },
  { value: "A", label: "A" },
  { value: "B", label: "B" },
  { value: "C", label: "C" },
  { value: "F", label: "F" },
];

export default function GradesPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();

  const [definitions, setDefinitions] = useState<GradeDefinition[]>([]);
  const [globalDefs, setGlobalDefs] = useState<GradeDefinition[]>([]);
  const [deptDefs, setDeptDefs] = useState<Record<string, GradeDefinition[]>>({});
  const [quarters, setQuarters] = useState<Quarter[]>([]);
  const [activeQuarter, setActiveQuarter] = useState<Quarter | null>(null);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [selectedDept, setSelectedDept] = useState<string>("all");

  // Modals
  const [defModalOpen, setDefModalOpen] = useState(false);
  const [quarterModalOpen, setQuarterModalOpen] = useState(false);
  const [editingDef, setEditingDef] = useState<GradeDefinition | null>(null);
  const [saving, setSaving] = useState(false);

  // Grade definition form
  const [defForm, setDefForm] = useState({
    grade: "A_PLUS" as Grade,
    minPoints: 105,
    maxPoints: "" as string | number,
    title: "",
    description: "",
    reward: "",
    consequence: "",
    departmentId: "",
  });

  // Quarter form
  const [quarterForm, setQuarterForm] = useState({
    name: "",
    startDate: "",
    endDate: "",
    departmentId: "",
  });

  const canManage = user?.role === "ADMIN" || user?.role === "LEAD";

  useEffect(() => {
    if (authLoading) return;
    if (!user) { router.push("/login"); return; }
    loadData();
  }, [user, authLoading]);

  const loadData = async () => {
    try {
      const [defsRes, quartersRes, deptsRes] = await Promise.all([
        api.get("/api/grades/definitions"),
        api.get("/api/grades/quarters"),
        api.get("/api/departments"),
      ]);

      setGlobalDefs(defsRes.data.global || []);
      setDeptDefs(defsRes.data.byDepartment || {});
      setDefinitions(defsRes.data.all || []);
      setQuarters(quartersRes.data.quarters || []);
      setActiveQuarter(quartersRes.data.activeQuarter);
      setDepartments(deptsRes.data.departments || []);
    } catch (error) {
      toast.error("Failed to load grade data");
    } finally {
      setLoading(false);
    }
  };

  const openNewDef = () => {
    setEditingDef(null);
    setDefForm({
      grade: "A_PLUS", minPoints: 105, maxPoints: "",
      title: "", description: "", reward: "", consequence: "",
      departmentId: user?.role === "LEAD" ? (user.departmentId || "") : "",
    });
    setDefModalOpen(true);
  };

  const openEditDef = (def: GradeDefinition) => {
    setEditingDef(def);
    setDefForm({
      grade: def.grade,
      minPoints: def.minPoints,
      maxPoints: def.maxPoints ?? "",
      title: def.title,
      description: def.description,
      reward: def.reward || "",
      consequence: def.consequence || "",
      departmentId: def.departmentId || "",
    });
    setDefModalOpen(true);
  };

  const handleSaveDef = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.post("/api/grades/definitions", {
        ...defForm,
        maxPoints: defForm.maxPoints === "" ? null : Number(defForm.maxPoints),
        departmentId: defForm.departmentId || null,
      });
      toast.success(editingDef ? "Grade definition updated" : "Grade definition created");
      setDefModalOpen(false);
      loadData();
    } catch (error: any) {
      toast.error(error.response?.data?.error || "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteDef = async (id: string) => {
    if (!confirm("Delete this grade definition?")) return;
    try {
      await api.delete(`/api/grades/definitions/${id}`);
      toast.success("Definition deleted");
      loadData();
    } catch (error: any) {
      toast.error(error.response?.data?.error || "Failed to delete");
    }
  };

  const handleSaveQuarter = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.post("/api/grades/quarters", {
        ...quarterForm,
        departmentId: quarterForm.departmentId || null,
      });
      toast.success("Quarter created");
      setQuarterModalOpen(false);
      loadData();
    } catch (error: any) {
      toast.error(error.response?.data?.error || "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteQuarter = async (id: string) => {
    if (!confirm("Delete this quarter?")) return;
    try {
      await api.delete(`/api/grades/quarters/${id}`);
      toast.success("Quarter deleted");
      loadData();
    } catch (error: any) {
      toast.error(error.response?.data?.error || "Failed to delete");
    }
  };

  const renderDefTable = (defs: GradeDefinition[], title: string, isDept = false) => {
    const sorted = [...defs].sort((a, b) => {
      const aIdx = gradeOrder.indexOf(a.grade);
      const bIdx = gradeOrder.indexOf(b.grade);
      return aIdx - bIdx;
    });

    return (
      <div className="card mb-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-prokip-navy">{title}</h3>
          {canManage && isDept && (
            <button onClick={openNewDef} className="btn-secondary text-sm flex items-center gap-1">
              <Plus className="w-3.5 h-3.5" /> Add Override
            </button>
          )}
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left py-3 px-3 font-semibold text-prokip-navy text-sm">Grade</th>
                <th className="text-left py-3 px-3 font-semibold text-prokip-navy text-sm">Min Points</th>
                <th className="text-left py-3 px-3 font-semibold text-prokip-navy text-sm">Max Points</th>
                {canManage && <th className="text-right py-3 px-3 font-semibold text-prokip-navy text-sm">Actions</th>}
              </tr>
            </thead>
            <tbody>
              {sorted.map((def) => (
                <tr key={def.id} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                  <td className="py-3 px-3">
                    <GradeBadge grade={def.grade} size="sm" />
                  </td>
                  <td className="py-3 px-3 text-sm font-mono text-prokip-navy">
                    {def.minPoints}
                  </td>
                  <td className="py-3 px-3 text-sm font-mono text-prokip-navy">
                    {def.maxPoints ?? "∞"}
                  </td>
                  {canManage && (
                    <td className="py-3 px-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button onClick={() => openEditDef(def)} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500 hover:text-prokip-navy transition-colors">
                          <Edit3 className="w-4 h-4" />
                        </button>
                        <button onClick={() => handleDeleteDef(def.id)} className="p-1.5 rounded-lg hover:bg-red-50 text-gray-500 hover:text-red-600 transition-colors">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  )}
                </tr>
              ))}
              {sorted.length === 0 && (
                <tr>
                  <td colSpan={canManage ? 4 : 3} className="py-8 text-center text-gray-400">
                    No grade definitions yet
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  // Build reward table data from all definitions (global + department)
  const allDefsForRewards = [...definitions].sort((a, b) => {
    const aIdx = gradeOrder.indexOf(a.grade);
    const bIdx = gradeOrder.indexOf(b.grade);
    return aIdx - bIdx;
  });

  if (loading || authLoading) return <AppShell><PageSkeleton /></AppShell>;

  return (
    <AppShell>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-prokip-navy">Grade System</h1>
            <p className="text-gray-600 mt-1">
              Define grades, point thresholds, and rewards.
            </p>
          </div>
          {canManage && (
            <div className="flex gap-2">
              <button onClick={openNewDef} className="btn-primary flex items-center gap-2">
                <Plus className="w-4 h-4" /> Add Grade Definition
              </button>
              <button onClick={() => { setQuarterForm({ name: "", startDate: "", endDate: "", departmentId: user?.role === "LEAD" ? (user.departmentId || "") : "" }); setQuarterModalOpen(true); }} className="btn-secondary flex items-center gap-2">
                <Calendar className="w-4 h-4" /> Set Quarter
              </button>
            </div>
          )}
        </div>

        {/* Active Quarter Banner */}
        {activeQuarter && (
          <div className="bg-prokip-navy/5 border border-prokip-navy/10 rounded-xl p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Calendar className="w-5 h-5 text-prokip-navy" />
              <div>
                <p className="font-semibold text-prokip-navy">{activeQuarter.name}</p>
                <p className="text-sm text-gray-600">
                  {new Date(activeQuarter.startDate).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                  {" → "}
                  {new Date(activeQuarter.endDate).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                  {activeQuarter.department && ` • ${activeQuarter.department.name}`}
                </p>
              </div>
            </div>
            <span className="px-3 py-1 bg-green-100 text-green-700 text-xs font-semibold rounded-full">Active</span>
          </div>
        )}

        {/* Department Filter */}
        {(user?.role === "ADMIN" || user?.role === "LEAD") && departments.length > 0 && (
          <div className="flex items-center gap-3">
            <label className="text-sm font-medium text-gray-600">View:</label>
            <select
              value={selectedDept}
              onChange={(e) => setSelectedDept(e.target.value)}
              className="input-field max-w-xs"
            >
              <option value="all">All Departments</option>
              <option value="global">Global Only</option>
              {departments.map((d) => (
                <option key={d.id} value={d.name}>{d.name}</option>
              ))}
            </select>
          </div>
        )}

        {/* Global Definitions */}
        {(selectedDept === "all" || selectedDept === "global") && renderDefTable(globalDefs, "Global Grade Definitions")}

        {/* Department-specific Definitions */}
        {selectedDept === "all"
          ? Object.entries(deptDefs).map(([deptName, defs]) => (
              <div key={deptName}>{renderDefTable(defs, `${deptName} — Department Overrides`, true)}</div>
            ))
          : selectedDept !== "global" && deptDefs[selectedDept]
            ? renderDefTable(deptDefs[selectedDept], `${selectedDept} — Department Overrides`, true)
            : selectedDept !== "global" && selectedDept !== "all" && (
              <div className="card text-center py-8 text-gray-400">
                No department-specific definitions for {selectedDept}
              </div>
            )
        }

        {/* ============================================================ */}
        {/* REWARDS DATATABLE */}
        {/* ============================================================ */}
        <div className="card">
          <div className="flex items-center gap-3 mb-4">
            <Gift className="w-5 h-5 text-prokip-gold" />
            <h3 className="text-lg font-semibold text-prokip-navy">Rewards</h3>
          </div>

          {allDefsForRewards.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-3 px-3 font-semibold text-prokip-navy text-sm">Name</th>
                    <th className="text-left py-3 px-3 font-semibold text-prokip-navy text-sm">Point Range</th>
                    <th className="text-left py-3 px-3 font-semibold text-prokip-navy text-sm">Reward</th>
                    <th className="text-left py-3 px-3 font-semibold text-prokip-navy text-sm">Department</th>
                  </tr>
                </thead>
                <tbody>
                  {allDefsForRewards.map((def) => (
                    <tr key={def.id} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                      <td className="py-3 px-3">
                        <div className="flex items-center gap-2">
                          <GradeBadge grade={def.grade} size="sm" />
                          <span className="text-sm font-medium text-prokip-navy">{def.title}</span>
                        </div>
                      </td>
                      <td className="py-3 px-3 text-sm font-mono text-prokip-navy">
                        {def.minPoints} – {def.maxPoints ?? "∞"}
                      </td>
                      <td className="py-3 px-3 text-sm text-gray-600 max-w-[300px]">
                        {def.reward || (
                          <span className="text-gray-400 italic">Not defined</span>
                        )}
                      </td>
                      <td className="py-3 px-3 text-sm text-gray-600">
                        {def.department?.name || (
                          <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-gray-100 text-gray-600">Global</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-12 text-gray-400">
              <Gift className="w-10 h-10 mx-auto mb-3 opacity-50" />
              <p className="text-lg mb-2">No rewards defined yet</p>
              <p className="text-sm">Add grade definitions above to see rewards here.</p>
            </div>
          )}
        </div>

        {/* Quarter History */}
        {quarters.length > 0 && (
          <div className="card">
            <h3 className="text-lg font-semibold text-prokip-navy mb-4">Quarter History</h3>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-3 px-3 font-semibold text-prokip-navy text-sm">Quarter</th>
                    <th className="text-left py-3 px-3 font-semibold text-prokip-navy text-sm">Start</th>
                    <th className="text-left py-3 px-3 font-semibold text-prokip-navy text-sm">End</th>
                    <th className="text-left py-3 px-3 font-semibold text-prokip-navy text-sm">Scope</th>
                    <th className="text-left py-3 px-3 font-semibold text-prokip-navy text-sm">Status</th>
                    {canManage && <th className="text-right py-3 px-3 font-semibold text-prokip-navy text-sm">Actions</th>}
                  </tr>
                </thead>
                <tbody>
                  {quarters.map((q) => (
                    <tr key={q.id} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="py-3 px-3 text-sm font-medium text-prokip-navy">{q.name}</td>
                      <td className="py-3 px-3 text-sm text-gray-600">{new Date(q.startDate).toLocaleDateString()}</td>
                      <td className="py-3 px-3 text-sm text-gray-600">{new Date(q.endDate).toLocaleDateString()}</td>
                      <td className="py-3 px-3 text-sm text-gray-600">{q.department?.name || "Global"}</td>
                      <td className="py-3 px-3">
                        <span className={`px-2 py-0.5 text-xs font-semibold rounded-full ${q.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                          {q.isActive ? "Active" : "Ended"}
                        </span>
                      </td>
                      {canManage && (
                        <td className="py-3 px-3 text-right">
                          <button onClick={() => handleDeleteQuarter(q.id)} className="p-1.5 rounded-lg hover:bg-red-50 text-gray-500 hover:text-red-600 transition-colors">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Grade Definition Modal */}
      <Modal open={defModalOpen} onClose={() => setDefModalOpen(false)} title={editingDef ? "Edit Grade Definition" : "Add Grade Definition"} maxWidth="max-w-xl">
        <form onSubmit={handleSaveDef} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="input-label">Grade *</label>
              <select value={defForm.grade} onChange={(e) => setDefForm(p => ({ ...p, grade: e.target.value as Grade }))} className="input-field" required>
                {GRADE_OPTIONS.map(g => <option key={g.value} value={g.value}>{g.label}</option>)}
              </select>
            </div>
            <div>
              <label className="input-label">Title *</label>
              <input type="text" value={defForm.title} onChange={(e) => setDefForm(p => ({ ...p, title: e.target.value }))} className="input-field" placeholder="e.g. Platinum" required />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="input-label">Min Points *</label>
              <input type="number" value={defForm.minPoints} onChange={(e) => setDefForm(p => ({ ...p, minPoints: Number(e.target.value) }))} className="input-field" required />
            </div>
            <div>
              <label className="input-label">Max Points <span className="text-gray-400 font-normal">(empty = no cap)</span></label>
              <input type="number" value={defForm.maxPoints} onChange={(e) => setDefForm(p => ({ ...p, maxPoints: e.target.value === "" ? "" : Number(e.target.value) }))} className="input-field" placeholder="∞" />
            </div>
          </div>

          <div>
            <label className="input-label">Description *</label>
            <input type="text" value={defForm.description} onChange={(e) => setDefForm(p => ({ ...p, description: e.target.value }))} className="input-field" placeholder="e.g. Elite Performance" required />
          </div>

          <div>
            <label className="input-label">Reward <span className="text-gray-400 font-normal">(what they earn at this grade)</span></label>
            <textarea value={defForm.reward} onChange={(e) => setDefForm(p => ({ ...p, reward: e.target.value }))} className="input-field min-h-[70px] resize-none" placeholder="e.g. Quarterly bonus, extra PTO..." />
          </div>

          {user?.role === "ADMIN" && (
            <div>
              <label className="input-label">Department <span className="text-gray-400 font-normal">(empty = global)</span></label>
              <select value={defForm.departmentId} onChange={(e) => setDefForm(p => ({ ...p, departmentId: e.target.value }))} className="input-field">
                <option value="">Global (all departments)</option>
                {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
              </select>
            </div>
          )}

          <div className="flex justify-end gap-3 pt-4">
            <button type="button" onClick={() => setDefModalOpen(false)} className="btn-secondary">Cancel</button>
            <button type="submit" disabled={saving} className="btn-primary">{saving ? "Saving..." : editingDef ? "Update" : "Create"}</button>
          </div>
        </form>
      </Modal>

      {/* Quarter Modal */}
      <Modal open={quarterModalOpen} onClose={() => setQuarterModalOpen(false)} title="Set Quarter Period" maxWidth="max-w-md">
        <form onSubmit={handleSaveQuarter} className="space-y-4">
          <div>
            <label className="input-label">Quarter Name *</label>
            <input type="text" value={quarterForm.name} onChange={(e) => setQuarterForm(p => ({ ...p, name: e.target.value }))} className="input-field" placeholder="e.g. Q2 2026" required />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="input-label">Start Date *</label>
              <input type="date" value={quarterForm.startDate} onChange={(e) => setQuarterForm(p => ({ ...p, startDate: e.target.value }))} className="input-field" required />
            </div>
            <div>
              <label className="input-label">End Date *</label>
              <input type="date" value={quarterForm.endDate} onChange={(e) => setQuarterForm(p => ({ ...p, endDate: e.target.value }))} className="input-field" required />
            </div>
          </div>
          {user?.role === "ADMIN" && (
            <div>
              <label className="input-label">Department <span className="text-gray-400 font-normal">(empty = global)</span></label>
              <select value={quarterForm.departmentId} onChange={(e) => setQuarterForm(p => ({ ...p, departmentId: e.target.value }))} className="input-field">
                <option value="">Global (all departments)</option>
                {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
              </select>
            </div>
          )}
          <div className="flex justify-end gap-3 pt-4">
            <button type="button" onClick={() => setQuarterModalOpen(false)} className="btn-secondary">Cancel</button>
            <button type="submit" disabled={saving} className="btn-primary">{saving ? "Saving..." : "Set Quarter"}</button>
          </div>
        </form>
      </Modal>
    </AppShell>
  );
}
