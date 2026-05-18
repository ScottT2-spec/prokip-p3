"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { User, Department } from "@/lib/types";
import api from "@/lib/api";
import AppShell from "@/components/AppShell";
import GradeBadge from "@/components/GradeBadge";
import Modal from "@/components/Modal";
import { TableSkeleton } from "@/components/LoadingSkeleton";
import { Search, Plus, Eye, Star, ArrowUpDown, ArrowUp, ArrowDown } from "lucide-react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";

interface UsersResponse {
  users: User[];
  total: number;
  page: number;
  limit: number;
}

export default function UsersPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [data, setData] = useState<UsersResponse | null>(null);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);
  const [addUserOpen, setAddUserOpen] = useState(false);
  const [createLoading, setCreateLoading] = useState(false);
  
  // Filters & sorting
  const [searchTerm, setSearchTerm] = useState("");
  const [departmentFilter, setDepartmentFilter] = useState("");
  const [gradeFilter, setGradeFilter] = useState("");
  const [page, setPage] = useState(1);
  const [rewardSort, setRewardSort] = useState<"none" | "desc" | "asc">("none");

  // Add user form
  const [newUser, setNewUser] = useState({
    email: "",
    firstName: "",
    lastName: "",
    role: "MEMBER" as const,
    departmentId: ""
  });
  const [tempPassword, setTempPassword] = useState("");

  useEffect(() => {
    if (!user || (user.role !== "ADMIN" && user.role !== "LEAD")) {
      router.push("/");
      return;
    }
    loadUsers();
    loadDepartments();
  }, [user, searchTerm, departmentFilter, gradeFilter, page, rewardSort, router]);

  const loadUsers = async () => {
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: "20",
        search: searchTerm,
        department: departmentFilter,
        grade: gradeFilter,
        ...(rewardSort !== "none" ? { sortBy: "rewardPoints", sortOrder: rewardSort } : {}),
      });
      const response = await api.get(`/api/users?${params}`);
      setData(response.data);
    } catch (error) {
      toast.error("Failed to load users");
    } finally {
      setLoading(false);
    }
  };

  const loadDepartments = async () => {
    try {
      const response = await api.get("/api/departments");
      setDepartments(response.data.departments || []);
    } catch (error) {
      console.error("Failed to load departments");
    }
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUser.email || !newUser.firstName || !newUser.lastName) return;

    setCreateLoading(true);
    try {
      const response = await api.post("/api/users", {
        email: newUser.email,
        firstName: newUser.firstName,
        lastName: newUser.lastName,
        role: newUser.role,
        departmentId: newUser.departmentId || null
      });

      setTempPassword(response.data.tempPassword);
      toast.success("User created successfully");
      loadUsers();
      
      // Reset form but keep modal open to show password
      setNewUser({
        email: "",
        firstName: "",
        lastName: "",
        role: "MEMBER",
        departmentId: ""
      });
    } catch (error: any) {
      toast.error(error.response?.data?.error || "Failed to create user");
    } finally {
      setCreateLoading(false);
    }
  };

  const handleCloseModal = () => {
    setAddUserOpen(false);
    setTempPassword("");
    setNewUser({
      email: "",
      firstName: "",
      lastName: "",
      role: "MEMBER",
      departmentId: ""
    });
  };

  const handleUserClick = (clickedUser: User) => {
    router.push(`/users/${clickedUser.id}`);
  };

  if (!user || (user.role !== "ADMIN" && user.role !== "LEAD")) {
    return null;
  }

  return (
    <AppShell title="Users">
      <div className="space-y-6">
        {/* Controls */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Search users..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="input-field pl-10 min-w-[250px]"
              />
            </div>
            <select
              value={departmentFilter}
              onChange={(e) => setDepartmentFilter(e.target.value)}
              className="input-field"
            >
              <option value="">All Departments</option>
              {departments.map((dept) => (
                <option key={dept.id} value={dept.id}>
                  {dept.name}
                </option>
              ))}
            </select>
            <select
              value={gradeFilter}
              onChange={(e) => setGradeFilter(e.target.value)}
              className="input-field"
            >
              <option value="">All Grades</option>
              <option value="A_PLUS">A+</option>
              <option value="A">A</option>
              <option value="B">B</option>
              <option value="C">C</option>
              <option value="F">F</option>
            </select>
          </div>
          {user.role === "ADMIN" && (
            <button
              onClick={() => setAddUserOpen(true)}
              className="btn-primary flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              Add User
            </button>
          )}
        </div>

        {/* Users Table */}
        {loading ? (
          <TableSkeleton rows={10} />
        ) : (
          <div className="card">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-3 px-2 font-semibold text-prokip-navy">Name</th>
                    <th className="text-left py-3 px-2 font-semibold text-prokip-navy">Email</th>
                    <th className="text-left py-3 px-2 font-semibold text-prokip-navy">Department</th>
                    <th className="text-left py-3 px-2 font-semibold text-prokip-navy">Role</th>
                    <th className="text-right py-3 px-2 font-semibold text-prokip-navy">Performance</th>
                    <th
                      className="text-right py-3 px-2 font-semibold text-prokip-navy cursor-pointer select-none hover:text-prokip-gold transition-colors"
                      onClick={() => {
                        setRewardSort(prev =>
                          prev === "none" ? "desc" : prev === "desc" ? "asc" : "none"
                        );
                      }}
                    >
                      <span className="inline-flex items-center gap-1">
                        <Star className="w-3.5 h-3.5 text-prokip-gold" />
                        Reward Pts
                        {rewardSort === "none" && <ArrowUpDown className="w-3.5 h-3.5 text-gray-400" />}
                        {rewardSort === "desc" && <ArrowDown className="w-3.5 h-3.5 text-prokip-gold" />}
                        {rewardSort === "asc" && <ArrowUp className="w-3.5 h-3.5 text-prokip-gold" />}
                      </span>
                    </th>
                    <th className="text-left py-3 px-2 font-semibold text-prokip-navy">Grade</th>
                    <th className="text-center py-3 px-2 font-semibold text-prokip-navy">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {data?.users.map((userData) => (
                    <tr 
                      key={userData.id} 
                      className="border-b border-gray-100 hover:bg-gray-50 transition-colors cursor-pointer"
                      onClick={() => handleUserClick(userData)}
                    >
                      <td className="py-3 px-2">
                        <span className="font-medium text-prokip-navy">
                          {userData.firstName} {userData.lastName}
                        </span>
                      </td>
                      <td className="py-3 px-2 text-gray-600">{userData.email}</td>
                      <td className="py-3 px-2 text-gray-600">
                        {userData.department?.name || "No Department"}
                      </td>
                      <td className="py-3 px-2">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          userData.role === "ADMIN" 
                            ? "bg-purple-100 text-purple-800"
                            : userData.role === "LEAD"
                            ? "bg-blue-100 text-blue-800"
                            : "bg-gray-100 text-gray-800"
                        }`}>
                          {userData.role}
                        </span>
                      </td>
                      <td className="py-3 px-2 text-right">
                        {userData.role === "ADMIN" ? (
                          <span className="text-gray-400">—</span>
                        ) : (
                          (() => {
                            const perf = userData.points - ((userData as any).rewardPoints ?? 0);
                            return (
                              <span className={`font-semibold ${perf >= 100 ? 'text-green-600' : perf >= 0 ? 'text-prokip-navy' : 'text-red-600'}`}>
                                {perf}
                              </span>
                            );
                          })()
                        )}
                      </td>
                      <td className="py-3 px-2 text-right">
                        {userData.role === "ADMIN" ? (
                          <span className="text-gray-400">—</span>
                        ) : (
                          <span className={`font-semibold inline-flex items-center gap-1 ${
                            ((userData as any).rewardPoints ?? 0) > 0 ? 'text-prokip-gold' : 'text-prokip-navy'
                          }`}>
                            {((userData as any).rewardPoints ?? 0) > 0 && <Star className="w-3.5 h-3.5 fill-prokip-gold text-prokip-gold" />}
                            {(userData as any).rewardPoints ?? 0}
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-2">
                        {userData.role === "ADMIN" ? (
                          <span className="text-gray-400">—</span>
                        ) : (
                          <GradeBadge grade={userData.grade} size="sm" />
                        )}
                      </td>
                      <td className="py-3 px-2 text-center">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleUserClick(userData);
                          }}
                          className="text-prokip-navy hover:text-prokip-navy-dark transition-colors"
                          title="View Details"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {data && data.total > data.limit && (
              <div className="flex justify-center gap-2 mt-6 pt-6 border-t border-gray-200">
                <button
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="btn-secondary disabled:opacity-50"
                >
                  Previous
                </button>
                <span className="flex items-center px-4 text-prokip-navy">
                  Page {page} of {Math.ceil(data.total / data.limit)}
                </span>
                <button
                  onClick={() => setPage(p => p + 1)}
                  disabled={page >= Math.ceil(data.total / data.limit)}
                  className="btn-secondary disabled:opacity-50"
                >
                  Next
                </button>
              </div>
            )}

            {data?.users.length === 0 && (
              <div className="text-center py-8 text-gray-500">
                No users found
              </div>
            )}
          </div>
        )}
      </div>

      {/* Add User Modal */}
      <Modal 
        open={addUserOpen} 
        onClose={handleCloseModal} 
        title={tempPassword ? "User Created Successfully" : "Add New User"}
        maxWidth="max-w-lg"
      >
        {tempPassword ? (
          <div className="space-y-4">
            <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
              <h4 className="font-semibold text-green-800 mb-2">Account Created</h4>
              <p className="text-green-700 text-sm mb-4">
                The user account has been created successfully. Here are the login credentials:
              </p>
              <div className="bg-white p-3 rounded border border-green-300">
                <p className="text-sm"><strong>Temporary Password:</strong></p>
                <code className="text-lg font-mono bg-gray-100 px-2 py-1 rounded">
                  {tempPassword}
                </code>
              </div>
              <p className="text-green-700 text-sm mt-3">
                Please share these credentials securely with the new user. They will be prompted to change their password on first login.
              </p>
            </div>
            <div className="flex justify-end gap-3">
              <button
                onClick={handleCloseModal}
                className="btn-primary"
              >
                Close
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleCreateUser} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="input-label">First Name *</label>
                <input
                  type="text"
                  value={newUser.firstName}
                  onChange={(e) => setNewUser(prev => ({ ...prev, firstName: e.target.value }))}
                  className="input-field"
                  required
                />
              </div>
              <div>
                <label className="input-label">Last Name *</label>
                <input
                  type="text"
                  value={newUser.lastName}
                  onChange={(e) => setNewUser(prev => ({ ...prev, lastName: e.target.value }))}
                  className="input-field"
                  required
                />
              </div>
            </div>

            <div>
              <label className="input-label">Email *</label>
              <input
                type="email"
                value={newUser.email}
                onChange={(e) => setNewUser(prev => ({ ...prev, email: e.target.value }))}
                className="input-field"
                required
              />
            </div>

            <div>
              <label className="input-label">Role *</label>
              <select
                value={newUser.role}
                onChange={(e) => setNewUser(prev => ({ ...prev, role: e.target.value as any }))}
                className="input-field"
                required
              >
                <option value="MEMBER">Member</option>
                <option value="LEAD">Lead</option>
                <option value="ADMIN">Admin</option>
              </select>
            </div>

            <div>
              <label className="input-label">Department</label>
              <select
                value={newUser.departmentId}
                onChange={(e) => setNewUser(prev => ({ ...prev, departmentId: e.target.value }))}
                className="input-field"
              >
                <option value="">No Department</option>
                {departments.map((dept) => (
                  <option key={dept.id} value={dept.id}>
                    {dept.name}
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
                disabled={createLoading}
                className="btn-primary"
              >
                {createLoading ? "Creating..." : "Create User"}
              </button>
            </div>
          </form>
        )}
      </Modal>
    </AppShell>
  );
}