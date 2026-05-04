"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { Department } from "@/lib/types";
import api from "@/lib/api";
import AppShell from "@/components/AppShell";
import Modal from "@/components/Modal";
import { CardSkeleton } from "@/components/LoadingSkeleton";
import { Plus, Trash2, Users } from "lucide-react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";

export default function DepartmentsPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [departmentToDelete, setDepartmentToDelete] = useState<Department | null>(null);
  const [submitLoading, setSubmitLoading] = useState(false);

  const [newDepartmentName, setNewDepartmentName] = useState("");

  useEffect(() => {
    if (!user || user.role !== "ADMIN") {
      router.push("/");
      return;
    }
    loadDepartments();
  }, [user, router]);

  const loadDepartments = async () => {
    try {
      const response = await api.get("/api/departments");
      setDepartments(response.data.departments || []);
    } catch (error) {
      toast.error("Failed to load departments");
    } finally {
      setLoading(false);
    }
  };

  const handleCreateDepartment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDepartmentName.trim()) return;

    setSubmitLoading(true);
    try {
      await api.post("/api/departments", {
        name: newDepartmentName.trim()
      });

      toast.success("Department created successfully");
      setAddModalOpen(false);
      setNewDepartmentName("");
      loadDepartments();
    } catch (error: any) {
      toast.error(error.response?.data?.error || "Failed to create department");
    } finally {
      setSubmitLoading(false);
    }
  };

  const handleDeleteDepartment = async () => {
    if (!departmentToDelete) return;

    try {
      await api.delete(`/api/departments/${departmentToDelete.id}`);
      toast.success("Department deleted successfully");
      loadDepartments();
    } catch (error: any) {
      toast.error(error.response?.data?.error || "Failed to delete department");
    } finally {
      setDeleteModalOpen(false);
      setDepartmentToDelete(null);
    }
  };

  if (!user || user.role !== "ADMIN") {
    return null;
  }

  return (
    <AppShell title="Departments">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <p className="text-gray-600">
            Organize your team into departments for better management and reporting.
          </p>
          <button
            onClick={() => setAddModalOpen(true)}
            className="btn-primary flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Add Department
          </button>
        </div>

        {/* Departments Grid */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3, 4, 5, 6].map(i => <CardSkeleton key={i} />)}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {departments.map((department) => (
              <div key={department.id} className="card">
                <div className="flex justify-between items-start mb-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="p-2 bg-prokip-navy/10 rounded-lg">
                        <Users className="w-5 h-5 text-prokip-navy" />
                      </div>
                      <h3 className="font-semibold text-prokip-navy">{department.name}</h3>
                    </div>
                    <div className="text-gray-600">
                      <p className="text-sm">
                        {department._count?.users || 0} member{department._count?.users !== 1 ? 's' : ''}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      setDepartmentToDelete(department);
                      setDeleteModalOpen(true);
                    }}
                    className="p-2 text-gray-400 hover:text-red-600 rounded-lg hover:bg-red-50 transition-colors"
                    title="Delete Department"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

                {department._count?.users === 0 ? (
                  <div className="text-center py-4 text-gray-500 text-sm">
                    No members assigned
                  </div>
                ) : (
                  <div className="pt-3 border-t border-gray-100">
                    <p className="text-xs text-gray-500">
                      Created: {department.createdAt ? new Date(department.createdAt).toLocaleDateString() : 'N/A'}
                    </p>
                  </div>
                )}
              </div>
            ))}

            {departments.length === 0 && (
              <div className="md:col-span-2 lg:col-span-3 text-center py-12">
                <Users className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-500 mb-2">No Departments</h3>
                <p className="text-gray-400 mb-6">Create your first department to get started.</p>
                <button
                  onClick={() => setAddModalOpen(true)}
                  className="btn-primary"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Add Department
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Add Department Modal */}
      <Modal
        open={addModalOpen}
        onClose={() => {
          setAddModalOpen(false);
          setNewDepartmentName("");
        }}
        title="Add Department"
        maxWidth="max-w-md"
      >
        <form onSubmit={handleCreateDepartment} className="space-y-4">
          <div>
            <label className="input-label">Department Name *</label>
            <input
              type="text"
              value={newDepartmentName}
              onChange={(e) => setNewDepartmentName(e.target.value)}
              placeholder="e.g., Engineering, Marketing, Sales"
              className="input-field"
              required
              autoFocus
            />
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <button
              type="button"
              onClick={() => {
                setAddModalOpen(false);
                setNewDepartmentName("");
              }}
              className="btn-secondary"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitLoading}
              className="btn-primary"
            >
              {submitLoading ? "Creating..." : "Create Department"}
            </button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        open={deleteModalOpen}
        onClose={() => {
          setDeleteModalOpen(false);
          setDepartmentToDelete(null);
        }}
        title="Delete Department"
        maxWidth="max-w-md"
      >
        <div className="space-y-4">
          <div>
            <p className="text-gray-600 mb-4">
              Are you sure you want to delete "{departmentToDelete?.name}"?
            </p>
            
            {departmentToDelete?._count?.users && departmentToDelete._count.users > 0 ? (
              <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                <div className="flex items-start gap-3">
                  <Users className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <h4 className="font-semibold text-yellow-800 mb-1">
                      Warning: Department has members
                    </h4>
                    <p className="text-yellow-700 text-sm">
                      This department has {departmentToDelete._count.users} member{departmentToDelete._count.users !== 1 ? 's' : ''}. 
                      Deleting it will remove the department assignment from all these users.
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                <p className="text-green-700 text-sm">
                  This department has no members and can be safely deleted.
                </p>
              </div>
            )}

            <p className="text-gray-600 text-sm">
              This action cannot be undone.
            </p>
          </div>

          <div className="flex justify-end gap-3">
            <button
              onClick={() => {
                setDeleteModalOpen(false);
                setDepartmentToDelete(null);
              }}
              className="btn-secondary"
            >
              Cancel
            </button>
            <button
              onClick={handleDeleteDepartment}
              className="btn-danger"
            >
              Delete Department
            </button>
          </div>
        </div>
      </Modal>
    </AppShell>
  );
}