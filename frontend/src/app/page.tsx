"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { AdminDashboard, MemberDashboard, EnhancedMemberDashboard, User, Department, PointLog } from "@/lib/types";
import api from "@/lib/api";
import AppShell from "@/components/AppShell";
import GradeBadge from "@/components/GradeBadge";
import { PageSkeleton, CardSkeleton } from "@/components/LoadingSkeleton";
import PointEntryModal from "@/components/PointEntryModal";
import { AreaChart, Area, CartesianGrid, Tooltip, ResponsiveContainer, XAxis, YAxis } from "recharts";
import { Users, TrendingUp, AlertTriangle, Award, Search, Filter, Plus, Clock, Star, ArrowUp, ArrowDown, ChevronLeft, ChevronRight } from "lucide-react";
import { formatPoints, getGradeConfig } from "@/lib/grades";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";

export default function Dashboard() {
  const { user } = useAuth();
  const router = useRouter();
  const [adminData, setAdminData] = useState<AdminDashboard | null>(null);
  const [memberData, setMemberData] = useState<EnhancedMemberDashboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [pointEntryOpen, setPointEntryOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  
  // Admin filters
  const [searchTerm, setSearchTerm] = useState("");
  const [departmentFilter, setDepartmentFilter] = useState("");
  const [gradeFilter, setGradeFilter] = useState("");
  const [departments, setDepartments] = useState<Department[]>([]);
  const [page, setPage] = useState(1);

  const [leaderboardData, setLeaderboardData] = useState<User[]>([]);

  useEffect(() => {
    if (!user) return;
    loadData();
    if (user.role === "ADMIN" || user.role === "LEAD") {
      loadDepartments();
    }
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
        // Load leaderboard separately so it doesn't block dashboard
        api.get("/api/leaderboard?limit=10")
          .then(res => setLeaderboardData(res.data.leaderboard || res.data || []))
          .catch(() => setLeaderboardData([]));
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

  const loadDepartments = async () => {
    try {
      const response = await api.get("/api/departments");
      setDepartments(response.data.departments || []);
    } catch (error) {
      console.error("Failed to load departments");
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMinutes = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffHours / 24);

    if (diffMinutes < 1) {
      return "Just now";
    } else if (diffMinutes < 60) {
      return `${diffMinutes}m ago`;
    } else if (diffHours < 24) {
      return `${diffHours}h ago`;
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
              {adminData.recentActivity.slice(0, 5).map((activity) => (
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

  // Calculate progress percentage toward next grade
  const gradeThresholds = [
    { grade: "F", minPoints: 0 },
    { grade: "C", minPoints: 60 },
    { grade: "B", minPoints: 75 },
    { grade: "A", minPoints: 90 },
    { grade: "A_PLUS", minPoints: 105 },
  ];
  const currentGradeIdx = gradeThresholds.findIndex(g => g.grade === memberData.grade);
  const currentThreshold = gradeThresholds[currentGradeIdx]?.minPoints || 0;
  const nextThreshold = memberData.nextGradeInfo?.minPoints || currentThreshold;
  const progressRange = nextThreshold - currentThreshold;
  const progressValue = progressRange > 0
    ? Math.min(100, Math.max(0, ((memberData.points - currentThreshold) / progressRange) * 100))
    : 100;

  return (
    <AppShell title="My Dashboard">
      <div className="space-y-6">
        {/* Welcome */}
        <div>
          <h2 className="text-xl font-bold text-prokip-navy">
            Welcome back, {user?.firstName}!
          </h2>
          <p className="text-gray-600">{memberData.status}</p>
        </div>

        {/* ========== OVERVIEW ========== */}
        <div className="space-y-6">
            {/* Section A: KPI Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Current Grade */}
              <div className="card flex flex-col items-center justify-center py-6">
                <GradeBadge grade={memberData.grade} size="lg" />
                <p className="mt-3 font-semibold text-prokip-navy text-lg">{memberData.gradeInfo.label} Grade</p>
                <p className="text-gray-500 text-sm">
                  {memberData.rank ? `#${memberData.rank} in ${memberData.department?.name || "Dept"}` : "Unranked"}
                </p>
              </div>

              {/* Performance Points */}
              <div className="card">
                <p className="section-label mb-1">Performance</p>
                {(() => {
                  const perfScore = memberData.points - memberData.rewardPoints;
                  return (
                    <>
                      <p className={`text-3xl font-bold ${perfScore >= 100 ? "text-green-600" : perfScore >= 0 ? "text-prokip-navy" : "text-red-600"}`}>
                        {perfScore}
                      </p>
                      <p className="text-xs text-gray-500 mt-1">Current performance score</p>
                    </>
                  );
                })()}
              </div>

              {/* Reward Points */}
              <div className="card">
                <div className="flex items-center gap-2 mb-1">
                  <Star className="w-4 h-4" style={{ color: "#F5B731" }} />
                  <p className="section-label">Reward Points</p>
                </div>
                <p className="text-3xl font-bold" style={{ color: "#F5B731" }}>
                  {memberData.rewardPoints}
                </p>
                <p className="text-xs text-gray-500 mt-1">Reward-category total</p>
              </div>

              {/* Net Point Balance */}
              <div className="card">
                <p className="section-label mb-1">Net Balance</p>
                <p className={`text-3xl font-bold ${memberData.points >= 0 ? "text-prokip-navy" : "text-red-600"}`}>
                  {memberData.points}
                </p>
                {memberData.nextGradeInfo && (
                  <div className="mt-2">
                    <div className="flex justify-between text-xs text-gray-500 mb-1">
                      <span>{memberData.gradeInfo.label}</span>
                      <span>{memberData.nextGradeInfo.label}</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="h-2 rounded-full transition-all"
                        style={{ width: `${progressValue}%`, backgroundColor: "#F5B731" }}
                      />
                    </div>
                  </div>
                )}
                {!memberData.nextGradeInfo && (
                  <p className="text-xs text-green-600 mt-2 font-medium">🏆 Max grade reached!</p>
                )}
              </div>
            </div>

            {/* Section B: Progress to Next Grade */}
            {memberData.nextGradeInfo && (
              <div className="card">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-lg font-semibold text-prokip-navy">Progress to Next Grade</h3>
                  <span className="text-sm text-gray-500">
                    {memberData.points} / {memberData.nextGradeInfo.minPoints} pts
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-4 mb-2">
                  <div
                    className="h-4 rounded-full transition-all flex items-center justify-end pr-2"
                    style={{ width: `${Math.max(progressValue, 5)}%`, backgroundColor: "#F5B731" }}
                  >
                    {progressValue > 15 && (
                      <span className="text-xs font-bold text-prokip-navy-dark">{Math.round(progressValue)}%</span>
                    )}
                  </div>
                </div>
                <p className="text-sm text-gray-600">
                  <span className="font-semibold" style={{ color: "#F5B731" }}>{memberData.nextGradeInfo.pointsNeeded}</span>
                  {" "}more points to reach{" "}
                  <span className="font-semibold text-prokip-navy">{memberData.nextGradeInfo.label} Grade</span>
                </p>
              </div>
            )}

            {/* Points Trend Chart */}
            {pointsTrendData.length > 0 && (
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
            )}

            {/* Recent Activity (left) + Leaderboard (right) */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Left: Recent Activity */}
              <div className="card">
                <h3 className="text-lg font-semibold text-prokip-navy mb-4">Recent Activity</h3>
                <div className="space-y-2">
                  {memberData.recentLogs.slice(0, 5).map((log) => (
                    <div key={log.id} className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 transition-colors">
                      <div className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${log.points > 0 ? "bg-green-500" : "bg-red-500"}`} />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-prokip-navy truncate">{log.reason}</p>
                        {log.policy && (
                          <p className="text-xs text-gray-400">{log.policy.name}</p>
                        )}
                      </div>
                      <span className={`font-semibold text-sm flex-shrink-0 ${log.points > 0 ? "text-green-600" : "text-red-600"}`}>
                        {formatPoints(log.points)}
                      </span>
                      <span className="text-xs text-gray-400 flex-shrink-0 w-16 text-right">{formatDate(log.createdAt)}</span>
                    </div>
                  ))}
                  {memberData.recentLogs.length === 0 && (
                    <p className="text-gray-500 text-center py-6">No activity yet</p>
                  )}
                </div>
                {memberData.recentLogs.length > 0 && (
                  <button
                    onClick={() => router.push("/history")}
                    className="mt-4 text-sm font-medium text-prokip-navy hover:underline"
                  >
                    See Full History →
                  </button>
                )}
              </div>

              {/* Right: Leaderboard */}
              <div className="card">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-prokip-navy">Leaderboard</h3>
                  <button
                    onClick={() => router.push("/leaderboard")}
                    className="text-sm text-prokip-navy hover:underline font-medium"
                  >
                    View All →
                  </button>
                </div>
                <div className="space-y-2">
                  {leaderboardData.map((entry: any, index: number) => (
                    <div
                      key={entry.userId || entry.id}
                      className={`flex items-center gap-3 p-3 rounded-lg transition-colors ${
                        (entry.userId || entry.id) === user?.id ? "bg-prokip-gold/10 border border-prokip-gold/30" : "hover:bg-gray-50"
                      }`}
                    >
                      <span className={`w-6 h-6 flex items-center justify-center rounded-full text-xs font-bold flex-shrink-0 ${
                        index === 0 ? "bg-yellow-100 text-yellow-700" :
                        index === 1 ? "bg-gray-200 text-gray-600" :
                        index === 2 ? "bg-orange-100 text-orange-700" :
                        "bg-gray-100 text-gray-500"
                      }`}>
                        {entry.rank || index + 1}
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-prokip-navy truncate">
                          {entry.firstName} {entry.lastName}
                          {(entry.userId || entry.id) === user?.id && <span className="text-xs text-prokip-gold ml-1">(You)</span>}
                        </p>
                      </div>
                      <GradeBadge grade={entry.grade} size="sm" />
                      <span className="font-semibold text-sm text-prokip-navy flex-shrink-0">{entry.totalPoints ?? entry.points} pts</span>
                    </div>
                  ))}
                  {leaderboardData.length === 0 && (
                    <p className="text-gray-500 text-center py-6">No leaderboard data</p>
                  )}
                </div>
              </div>
            </div>
          </div>
      </div>
    </AppShell>
  );
}