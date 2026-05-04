"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { AdminDashboard, MemberDashboard, User } from "@/lib/types";
import api from "@/lib/api";
import AppShell from "@/components/AppShell";
import GradeBadge from "@/components/GradeBadge";
import { PageSkeleton, CardSkeleton } from "@/components/LoadingSkeleton";
import PointEntryModal from "@/components/PointEntryModal";
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, AreaChart, Area, CartesianGrid, Tooltip } from "recharts";
import { Users, TrendingUp, AlertTriangle, Award, Search, Filter, Plus, Clock } from "lucide-react";
import { formatPoints, getGradeConfig } from "@/lib/grades";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";

export default function Dashboard() {
  const { user } = useAuth();
  const router = useRouter();
  const [adminData, setAdminData] = useState<AdminDashboard | null>(null);
  const [memberData, setMemberData] = useState<MemberDashboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [pointEntryOpen, setPointEntryOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  
  // Admin filters
  const [searchTerm, setSearchTerm] = useState("");
  const [departmentFilter, setDepartmentFilter] = useState("");
  const [gradeFilter, setGradeFilter] = useState("");
  const [page, setPage] = useState(1);

  useEffect(() => {
    if (!user) return;
    loadData();
  }, [user, searchTerm, departmentFilter, gradeFilter, page]);

  const loadData = async () => {
    if (!user) return;
    
    try {
      if (user.role === "ADMIN" || user.role === "LEAD") {
        const params = new URLSearchParams({
          page: page.toString(),
          limit: "25",
          search: searchTerm,
          department: departmentFilter,
          grade: gradeFilter
        });
        const response = await api.get(`/api/dashboard/admin?${params}`);
        setAdminData(response.data);
      } else {
        const response = await api.get("/api/dashboard/member");
        setMemberData(response.data);
      }
    } catch (error) {
      toast.error("Failed to load dashboard data");
    } finally {
      setLoading(false);
    }
  };

  const handleUserClick = (clickedUser: User) => {
    router.push(`/users/${clickedUser.id}`);
  };

  const handleUpdatePoints = (clickedUser: User) => {
    setSelectedUser(clickedUser);
    setPointEntryOpen(true);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffHours / 24);

    if (diffHours < 24) {
      return diffHours === 0 ? "Just now" : `${diffHours}h ago`;
    } else if (diffDays < 7) {
      return `${diffDays}d ago`;
    } else {
      return date.toLocaleDateString();
    }
  };

  if (loading) {
    return (
      <AppShell>
        <PageSkeleton />
      </AppShell>
    );
  }

  // Admin/Lead Dashboard
  if (user?.role === "ADMIN" || user?.role === "LEAD") {
    if (!adminData) return null;

    const gradeDistData = Object.entries(adminData.gradeDistribution).map(([grade, count]) => ({
      grade: getGradeConfig(grade as any).label,
      count,
      fill: getGradeConfig(grade as any).color
    }));

    return (
      <AppShell title="Dashboard">
        <div className="space-y-8">
          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="card">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-prokip-navy/10 rounded-lg">
                  <Users className="w-6 h-6 text-prokip-navy" />
                </div>
                <div>
                  <p className="section-label">Total Members</p>
                  <p className="text-2xl font-bold text-prokip-navy">{adminData.stats.totalMembers}</p>
                </div>
              </div>
            </div>

            <div className="card">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-green-100 rounded-lg">
                  <TrendingUp className="w-6 h-6 text-green-600" />
                </div>
                <div>
                  <p className="section-label">Average Points</p>
                  <p className="text-2xl font-bold text-prokip-navy">{adminData.stats.avgPoints.toFixed(1)}</p>
                </div>
              </div>
            </div>

            <div className="card">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-red-100 rounded-lg">
                  <AlertTriangle className="w-6 h-6 text-red-600" />
                </div>
                <div>
                  <p className="section-label">At Risk</p>
                  <p className="text-2xl font-bold text-prokip-navy">{adminData.stats.atRiskCount}</p>
                </div>
              </div>
            </div>

            <div className="card">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-prokip-gold/20 rounded-lg">
                  <Award className="w-6 h-6 text-prokip-gold" />
                </div>
                <div>
                  <p className="section-label">Top Performers</p>
                  <p className="text-2xl font-bold text-prokip-navy">{adminData.stats.topPerformerCount}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Grade Distribution Chart */}
          <div className="card">
            <h3 className="text-lg font-semibold text-prokip-navy mb-6">Grade Distribution</h3>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={gradeDistData}>
                  <XAxis dataKey="grade" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="count" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Team Rankings */}
          <div className="card">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-6">
              <h3 className="text-lg font-semibold text-prokip-navy">Team Rankings</h3>
              <div className="flex flex-col sm:flex-row gap-3">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                  <input
                    type="text"
                    placeholder="Search members..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="input-field pl-10 min-w-[200px]"
                  />
                </div>
                <select
                  value={departmentFilter}
                  onChange={(e) => setDepartmentFilter(e.target.value)}
                  className="input-field"
                >
                  <option value="">All Departments</option>
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
                <button
                  onClick={() => setPointEntryOpen(true)}
                  className="btn-primary flex items-center gap-2 whitespace-nowrap"
                >
                  <Plus className="w-4 h-4" />
                  Update Points
                </button>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-3 px-2 font-semibold text-prokip-navy">Name</th>
                    <th className="text-left py-3 px-2 font-semibold text-prokip-navy">Email</th>
                    <th className="text-left py-3 px-2 font-semibold text-prokip-navy">Department</th>
                    <th className="text-left py-3 px-2 font-semibold text-prokip-navy">Grade</th>
                    <th className="text-right py-3 px-2 font-semibold text-prokip-navy">Points</th>
                    <th className="text-center py-3 px-2 font-semibold text-prokip-navy">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {adminData.rankings.map((member) => (
                    <tr 
                      key={member.id} 
                      className="border-b border-gray-100 hover:bg-gray-50 transition-colors cursor-pointer"
                      onClick={() => handleUserClick(member)}
                    >
                      <td className="py-3 px-2">
                        <span className="font-medium text-prokip-navy">
                          {member.firstName} {member.lastName}
                        </span>
                      </td>
                      <td className="py-3 px-2 text-gray-600">{member.email}</td>
                      <td className="py-3 px-2 text-gray-600">
                        {member.department?.name || "No Department"}
                      </td>
                      <td className="py-3 px-2">
                        <GradeBadge grade={member.grade} size="sm" />
                      </td>
                      <td className="py-3 px-2 text-right">
                        <span className={`font-semibold ${member.points >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                          {member.points}
                        </span>
                      </td>
                      <td className="py-3 px-2 text-center">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleUpdatePoints(member);
                          }}
                          className="text-prokip-navy hover:text-prokip-navy-dark transition-colors"
                        >
                          <Plus className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {adminData.total > adminData.limit && (
              <div className="flex justify-center gap-2 mt-6">
                <button
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="btn-secondary disabled:opacity-50"
                >
                  Previous
                </button>
                <span className="flex items-center px-4 text-prokip-navy">
                  Page {page} of {Math.ceil(adminData.total / adminData.limit)}
                </span>
                <button
                  onClick={() => setPage(p => p + 1)}
                  disabled={page >= Math.ceil(adminData.total / adminData.limit)}
                  className="btn-secondary disabled:opacity-50"
                >
                  Next
                </button>
              </div>
            )}
          </div>

          {/* At Risk & Top Performers */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="card">
              <h3 className="text-lg font-semibold text-prokip-navy mb-4">At Risk Members</h3>
              <div className="space-y-3">
                {adminData.atRisk.slice(0, 5).map((member) => (
                  <div 
                    key={member.id}
                    onClick={() => handleUserClick(member)}
                    className="flex items-center justify-between p-3 bg-red-50 rounded-lg hover:bg-red-100 transition-colors cursor-pointer"
                  >
                    <div className="flex items-center gap-3">
                      <GradeBadge grade={member.grade} size="sm" />
                      <span className="font-medium text-prokip-navy">
                        {member.firstName} {member.lastName}
                      </span>
                    </div>
                    <span className="text-red-600 font-semibold">{member.points} pts</span>
                  </div>
                ))}
                {adminData.atRisk.length === 0 && (
                  <p className="text-gray-500 text-center py-4">No members at risk</p>
                )}
              </div>
            </div>

            <div className="card">
              <h3 className="text-lg font-semibold text-prokip-navy mb-4">Top Performers</h3>
              <div className="space-y-3">
                {adminData.topPerformers.slice(0, 5).map((member) => (
                  <div 
                    key={member.id}
                    onClick={() => handleUserClick(member)}
                    className="flex items-center justify-between p-3 bg-green-50 rounded-lg hover:bg-green-100 transition-colors cursor-pointer"
                  >
                    <div className="flex items-center gap-3">
                      <GradeBadge grade={member.grade} size="sm" />
                      <span className="font-medium text-prokip-navy">
                        {member.firstName} {member.lastName}
                      </span>
                    </div>
                    <span className="text-green-600 font-semibold">{member.points} pts</span>
                  </div>
                ))}
                {adminData.topPerformers.length === 0 && (
                  <p className="text-gray-500 text-center py-4">No top performers yet</p>
                )}
              </div>
            </div>
          </div>

          {/* Recent Activity */}
          <div className="card">
            <h3 className="text-lg font-semibold text-prokip-navy mb-4">Recent Activity</h3>
            <div className="space-y-3">
              {adminData.recentActivity.slice(0, 10).map((activity) => (
                <div key={activity.id} className="flex items-center gap-4 p-3 border border-gray-100 rounded-lg">
                  <div className="flex-shrink-0">
                    <Clock className="w-5 h-5 text-gray-400" />
                  </div>
                  <div className="flex-1">
                    <p className="text-prokip-navy">
                      <span className="font-medium">
                        {activity.givenBy.firstName} {activity.givenBy.lastName}
                      </span>
                      {" gave "}
                      <span className={`font-semibold ${activity.points > 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {formatPoints(activity.points)} points
                      </span>
                      {" to "}
                      <span className="font-medium">
                        {activity.user.firstName} {activity.user.lastName}
                      </span>
                    </p>
                    <p className="text-gray-600 text-sm">{activity.reason}</p>
                  </div>
                  <div className="text-right text-gray-500 text-sm">
                    {formatDate(activity.createdAt)}
                  </div>
                </div>
              ))}
              {adminData.recentActivity.length === 0 && (
                <p className="text-gray-500 text-center py-4">No recent activity</p>
              )}
            </div>
          </div>
        </div>

        <PointEntryModal
          open={pointEntryOpen}
          onClose={() => {
            setPointEntryOpen(false);
            setSelectedUser(null);
          }}
          preSelectedUser={selectedUser}
          onSuccess={() => loadData()}
        />
      </AppShell>
    );
  }

  // Member Dashboard
  if (!memberData) return null;

  const pointsTrendData = memberData.pointsTrend.map(item => ({
    date: new Date(item.createdAt).toLocaleDateString(),
    points: item.points
  }));

  return (
    <AppShell title="My Dashboard">
      <div className="space-y-8">
        {/* Personal Overview */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 card">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between mb-6">
              <div>
                <h2 className="text-xl font-bold text-prokip-navy mb-2">
                  Welcome back, {user?.firstName}!
                </h2>
                <p className="text-gray-600">{memberData.status}</p>
              </div>
              <div className="flex items-center gap-4">
                <div className="text-center">
                  <p className="section-label">Current Points</p>
                  <p className="text-3xl font-bold text-prokip-navy">{memberData.points}</p>
                </div>
                <GradeBadge grade={memberData.grade} size="lg" />
              </div>
            </div>

            {/* Grade Info */}
            <div className={`p-4 rounded-lg border-l-4 ${
              memberData.gradeInfo.consequence 
                ? 'bg-red-50 border-red-400' 
                : 'bg-green-50 border-green-400'
            }`}>
              <h4 className="font-semibold text-prokip-navy mb-2">
                {memberData.gradeInfo.label} Grade Status
              </h4>
              <p className="text-gray-700">
                {memberData.gradeInfo.reward || memberData.gradeInfo.consequence}
              </p>
            </div>
          </div>

          <div className="card text-center">
            <p className="section-label">Department Rank</p>
            <p className="text-3xl font-bold text-prokip-navy mb-2">
              {memberData.rank ? `#${memberData.rank}` : "Unranked"}
            </p>
            <p className="text-gray-600">
              in {memberData.department?.name || "No Department"}
            </p>
          </div>
        </div>

        {/* Points Trend Chart */}
        <div className="card">
          <h3 className="text-lg font-semibold text-prokip-navy mb-6">Points Trend (Last 30 Days)</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={pointsTrendData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Area 
                  type="monotone" 
                  dataKey="points" 
                  stroke="#1E293B" 
                  fill="#1E293B" 
                  fillOpacity={0.1}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Recent Point History */}
        <div className="card">
          <h3 className="text-lg font-semibold text-prokip-navy mb-6">Recent Point History</h3>
          <div className="space-y-3">
            {memberData.recentLogs.map((log) => (
              <div key={log.id} className="flex items-center justify-between p-4 border border-gray-100 rounded-lg">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-1">
                    <span className={`font-semibold text-lg ${log.points > 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {formatPoints(log.points)}
                    </span>
                    <span className="text-gray-500">•</span>
                    <span className="text-prokip-navy font-medium">{log.reason}</span>
                  </div>
                  {log.policy && (
                    <p className="text-gray-600 text-sm">Policy: {log.policy.name}</p>
                  )}
                  {log.ticketLink && (
                    <a 
                      href={log.ticketLink} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-prokip-navy hover:underline text-sm"
                    >
                      View Ticket →
                    </a>
                  )}
                </div>
                <div className="text-right text-gray-500 text-sm">
                  {formatDate(log.createdAt)}
                </div>
              </div>
            ))}
            {memberData.recentLogs.length === 0 && (
              <p className="text-gray-500 text-center py-8">No point history yet</p>
            )}
          </div>
        </div>
      </div>
    </AppShell>
  );
}