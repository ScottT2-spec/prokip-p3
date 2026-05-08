"use client";

import { useEffect, useState, useCallback } from "react";
import { useAuth } from "@/context/AuthContext";
import { User } from "@/lib/types";
import api from "@/lib/api";
import AppShell from "@/components/AppShell";
import { Upload, Plus, X, FileSpreadsheet, AlertCircle, CheckCircle2 } from "lucide-react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";

interface BulkEntry {
  userId: string;
  type: "Performance" | "Reward";
  points: string;
  reason: string;
}

interface ParsedEntry {
  userId: string | null;
  firstName: string;
  lastName: string;
  type: string;
  points: number;
  reason: string;
  matched: boolean;
}

interface ParseError {
  row: number;
  message: string;
}

const emptyRow = (): BulkEntry => ({
  userId: "",
  type: "Performance",
  points: "",
  reason: "",
});

export default function BulkUploadPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [tab, setTab] = useState<"manual" | "excel">("manual");
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);

  // Manual tab state
  const [rows, setRows] = useState<BulkEntry[]>([emptyRow()]);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  // Excel tab state
  const [dragOver, setDragOver] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [parsed, setParsed] = useState<ParsedEntry[] | null>(null);
  const [parseErrors, setParseErrors] = useState<ParseError[]>([]);
  const [confirming, setConfirming] = useState(false);

  useEffect(() => {
    if (!user || (user.role !== "ADMIN" && user.role !== "LEAD")) {
      router.push("/");
      return;
    }
    api.get("/api/users?limit=500").then((res) => {
      const allUsers = res.data.users || res.data;
      setUsers(Array.isArray(allUsers) ? allUsers.filter((u: User) => u.role !== "ADMIN") : []);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [user, router]);

  // Manual tab handlers
  const updateRow = (index: number, field: keyof BulkEntry, value: string) => {
    const updated = [...rows];
    updated[index] = { ...updated[index], [field]: value };
    setRows(updated);
    // Clear error for this field
    const errKey = `${index}-${field}`;
    if (errors[errKey]) {
      const newErrors = { ...errors };
      delete newErrors[errKey];
      setErrors(newErrors);
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
      if (!row.userId) newErrors[`${i}-userId`] = "Required";
      if (!row.points || isNaN(Number(row.points))) newErrors[`${i}-points`] = "Required";
      else if (row.type === "Reward" && Number(row.points) <= 0) newErrors[`${i}-points`] = "Must be positive";
      if (!row.reason.trim()) newErrors[`${i}-reason`] = "Required";
    });
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const saveAll = async () => {
    if (!validateManual()) return;
    setSaving(true);
    try {
      const entries = rows.map((r) => ({
        userId: r.userId,
        type: r.type,
        points: parseInt(r.points),
        reason: r.reason.trim(),
      }));
      const res = await api.post("/api/points/bulk", { entries });
      const { success, failed, errors: apiErrors } = res.data;
      if (success > 0) {
        toast.success(`${success} points updated successfully`);
        setRows([emptyRow()]);
        setErrors({});
      }
      if (failed > 0) {
        apiErrors.forEach((e: ParseError) => toast.error(`Row ${e.row}: ${e.message}`));
      }
    } catch (err: any) {
      toast.error(err.response?.data?.error || "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  // Excel tab handlers
  const handleFile = async (file: File) => {
    const ext = file.name.split(".").pop()?.toLowerCase();
    if (!["csv", "xlsx"].includes(ext || "")) {
      toast.error("Only .csv and .xlsx files are accepted");
      return;
    }
    setUploading(true);
    setParsed(null);
    setParseErrors([]);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await api.post("/api/points/bulk-upload", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      setParsed(res.data.parsed);
      setParseErrors(res.data.errors);
      if (res.data.parsed.length === 0 && res.data.errors.length > 0) {
        toast.error("No valid entries found in file");
      }
    } catch (err: any) {
      toast.error(err.response?.data?.error || "Failed to parse file");
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

  const confirmSave = async () => {
    if (!parsed) return;
    const matched = parsed.filter((p) => p.matched && p.userId);
    if (matched.length === 0) {
      toast.error("No matched entries to save");
      return;
    }
    setConfirming(true);
    try {
      const entries = matched.map((p) => ({
        userId: p.userId,
        type: p.type,
        points: p.points,
        reason: p.reason,
      }));
      const res = await api.post("/api/points/bulk", { entries });
      const { success, failed, errors: apiErrors } = res.data;
      if (success > 0) {
        toast.success(`${success} points updated successfully`);
        setParsed(null);
        setParseErrors([]);
      }
      if (failed > 0) {
        apiErrors.forEach((e: ParseError) => toast.error(`Row ${e.row}: ${e.message}`));
      }
    } catch (err: any) {
      toast.error(err.response?.data?.error || "Failed to save");
    } finally {
      setConfirming(false);
    }
  };

  if (loading) {
    return (
      <AppShell title="Bulk Upload">
        <div className="card p-8 text-center text-gray-400">Loading...</div>
      </AppShell>
    );
  }

  return (
    <AppShell title="Bulk Upload">
      {/* Tabs */}
      <div className="flex gap-1 mb-6 bg-[#F1F5F9] rounded-lg p-1 w-fit">
        <button
          onClick={() => setTab("manual")}
          className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
            tab === "manual" ? "bg-white text-prokip-navy shadow-sm" : "text-gray-500 hover:text-gray-700"
          }`}
        >
          Manual Add
        </button>
        <button
          onClick={() => setTab("excel")}
          className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
            tab === "excel" ? "bg-white text-prokip-navy shadow-sm" : "text-gray-500 hover:text-gray-700"
          }`}
        >
          Excel Import
        </button>
      </div>

      {/* Manual Tab */}
      {tab === "manual" && (
        <div className="card">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-[#E2E8F0]">
                  <th className="text-left py-3 px-3 text-xs font-semibold text-[#64748B] uppercase tracking-wider">Name</th>
                  <th className="text-left py-3 px-3 text-xs font-semibold text-[#64748B] uppercase tracking-wider">Type</th>
                  <th className="text-left py-3 px-3 text-xs font-semibold text-[#64748B] uppercase tracking-wider">Points</th>
                  <th className="text-left py-3 px-3 text-xs font-semibold text-[#64748B] uppercase tracking-wider">Reason</th>
                  <th className="w-10"></th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row, i) => (
                  <tr key={i} className="border-b border-[#F1F5F9]">
                    <td className="py-2 px-3">
                      <select
                        value={row.userId}
                        onChange={(e) => updateRow(i, "userId", e.target.value)}
                        className={`input-field text-sm py-1.5 ${errors[`${i}-userId`] ? "border-red-400 ring-1 ring-red-400" : ""}`}
                      >
                        <option value="">Select user...</option>
                        {users.map((u) => (
                          <option key={u.id} value={u.id}>
                            {u.firstName} {u.lastName}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="py-2 px-3">
                      <select
                        value={row.type}
                        onChange={(e) => updateRow(i, "type", e.target.value)}
                        className="input-field text-sm py-1.5"
                      >
                        <option value="Performance">Performance</option>
                        <option value="Reward">Reward</option>
                      </select>
                    </td>
                    <td className="py-2 px-3">
                      <input
                        type="number"
                        value={row.points}
                        onChange={(e) => updateRow(i, "points", e.target.value)}
                        placeholder="0"
                        className={`input-field text-sm py-1.5 w-24 ${errors[`${i}-points`] ? "border-red-400 ring-1 ring-red-400" : ""}`}
                      />
                    </td>
                    <td className="py-2 px-3">
                      <input
                        type="text"
                        value={row.reason}
                        onChange={(e) => updateRow(i, "reason", e.target.value)}
                        placeholder="Reason..."
                        className={`input-field text-sm py-1.5 ${errors[`${i}-reason`] ? "border-red-400 ring-1 ring-red-400" : ""}`}
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

          <div className="flex items-center justify-between mt-4 px-3 pb-3">
            <button
              onClick={addRow}
              disabled={rows.length >= 20}
              className="flex items-center gap-1.5 text-sm text-prokip-navy font-medium hover:text-prokip-gold transition-colors disabled:opacity-50"
            >
              <Plus size={16} /> Add Row
              <span className="text-xs text-gray-400 ml-1">({rows.length}/20)</span>
            </button>
            <button
              onClick={saveAll}
              disabled={saving}
              className="btn-primary"
            >
              {saving ? "Saving..." : "Save All"}
            </button>
          </div>
        </div>
      )}

      {/* Excel Tab */}
      {tab === "excel" && (
        <div className="space-y-4">
          {/* Drop zone */}
          {!parsed && (
            <div
              onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={onDrop}
              className={`card border-2 border-dashed transition-colors cursor-pointer ${
                dragOver ? "border-prokip-gold bg-prokip-gold/5" : "border-[#E2E8F0]"
              }`}
              onClick={() => {
                const input = document.createElement("input");
                input.type = "file";
                input.accept = ".csv,.xlsx";
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
                      Drop your .csv or .xlsx file here
                    </p>
                    <p className="text-xs text-gray-400 mt-1">
                      or click to browse. Columns: Name (or Email), Type, Points, Reason
                    </p>
                  </>
                )}
              </div>
            </div>
          )}

          {/* Preview table */}
          {parsed && parsed.length > 0 && (
            <div className="card">
              <div className="flex items-center justify-between px-4 pt-4 pb-2">
                <h3 className="font-semibold text-prokip-navy text-sm">
                  Preview ({parsed.filter((p) => p.matched).length} matched, {parsed.filter((p) => !p.matched).length} unmatched)
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
                      <th className="text-left py-3 px-4 text-xs font-semibold text-[#64748B] uppercase tracking-wider">Type</th>
                      <th className="text-left py-3 px-4 text-xs font-semibold text-[#64748B] uppercase tracking-wider">Points</th>
                      <th className="text-left py-3 px-4 text-xs font-semibold text-[#64748B] uppercase tracking-wider">Reason</th>
                    </tr>
                  </thead>
                  <tbody>
                    {parsed.map((entry, i) => (
                      <tr
                        key={i}
                        className={`border-b border-[#F1F5F9] ${!entry.matched ? "bg-red-50" : ""}`}
                      >
                        <td className="py-2.5 px-4">
                          {entry.matched ? (
                            <CheckCircle2 size={16} className="text-green-500" />
                          ) : (
                            <AlertCircle size={16} className="text-red-500" />
                          )}
                        </td>
                        <td className={`py-2.5 px-4 text-sm font-medium ${!entry.matched ? "text-red-600" : "text-prokip-navy"}`}>
                          {entry.firstName} {entry.lastName}
                          {!entry.matched && <span className="text-xs ml-1">(not found)</span>}
                        </td>
                        <td className="py-2.5 px-4 text-sm text-gray-600">{entry.type}</td>
                        <td className={`py-2.5 px-4 text-sm font-semibold ${entry.points >= 0 ? "text-green-600" : "text-red-600"}`}>
                          {entry.points > 0 ? "+" : ""}{entry.points}
                        </td>
                        <td className="py-2.5 px-4 text-sm text-gray-600">{entry.reason}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="flex justify-end px-4 py-3">
                <button
                  onClick={confirmSave}
                  disabled={confirming || parsed.filter((p) => p.matched).length === 0}
                  className="btn-primary"
                >
                  {confirming ? "Saving..." : `Confirm & Save (${parsed.filter((p) => p.matched).length} entries)`}
                </button>
              </div>
            </div>
          )}

          {/* Parse errors */}
          {parseErrors.length > 0 && (
            <div className="card bg-red-50 border border-red-200">
              <div className="px-4 py-3">
                <h4 className="text-sm font-semibold text-red-700 mb-2 flex items-center gap-1.5">
                  <AlertCircle size={14} /> Parsing Errors
                </h4>
                <ul className="space-y-1">
                  {parseErrors.map((e, i) => (
                    <li key={i} className="text-xs text-red-600">
                      Row {e.row}: {e.message}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}
        </div>
      )}
    </AppShell>
  );
}
