"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import api from "@/lib/api";
import AppShell from "@/components/AppShell";
import GradeBadge from "@/components/GradeBadge";
import { Search, Trophy, ArrowUp } from "lucide-react";
import { useRouter } from "next/navigation";
import { Grade } from "@/lib/grades";

interface LeaderboardEntry {
  rank: number;
  userId: string;
  firstName: string;
  lastName: string;
  department: string | null;
  rewardPoints: number;
  totalPoints: number;
  grade: Grade;
}

interface MyRank {
  rank: number;
  rewardPoints: number;
  totalPoints: number;
  pointsToNext: number;
}

interface LeaderboardResponse {
  leaderboard: LeaderboardEntry[];
  total: number;
  myRank: MyRank | null;
}

function getInitials(first: string, last: string) {
  return `${first[0] || ""}${last[0] || ""}`.toUpperCase();
}

// Medal accent colors
const PODIUM_STYLES = {
  1: {
    ring: "ring-prokip-gold",
    bg: "bg-gradient-to-br from-yellow-50 to-amber-50",
    border: "border-prokip-gold/30",
    badge: "bg-prokip-gold text-prokip-navy-dark",
    avatarBg: "bg-prokip-gold text-prokip-navy-dark",
    label: "🥇",
    size: "w-20 h-20 text-2xl",
    order: "order-2",        // center
    lift: "lg:-mt-4",
  },
  2: {
    ring: "ring-gray-300",
    bg: "bg-gradient-to-br from-gray-50 to-slate-50",
    border: "border-gray-200",
    badge: "bg-gray-300 text-gray-700",
    avatarBg: "bg-gray-300 text-gray-700",
    label: "🥈",
    size: "w-16 h-16 text-xl",
    order: "order-1",        // left
    lift: "lg:mt-4",
  },
  3: {
    ring: "ring-amber-600/40",
    bg: "bg-gradient-to-br from-orange-50 to-amber-50",
    border: "border-amber-200",
    badge: "bg-amber-600 text-white",
    avatarBg: "bg-amber-600 text-white",
    label: "🥉",
    size: "w-16 h-16 text-xl",
    order: "order-3",        // right
    lift: "lg:mt-4",
  },
} as const;

export default function LeaderboardPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [data, setData] = useState<LeaderboardResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "department">("all");
  const [search, setSearch] = useState("");
  const [searchDebounced, setSearchDebounced] = useState("");

  useEffect(() => {
    const timer = setTimeout(() => setSearchDebounced(search), 300);
    return () => clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    fetchLeaderboard();
  }, [filter, searchDebounced]);

  async function fetchLeaderboard() {
    try {
      setLoading(true);
      const params: Record<string, string> = { limit: "50" };
      if (filter === "department" && user?.departmentId) {
        params.department = user.departmentId;
      }
      if (searchDebounced) {
        params.search = searchDebounced;
      }
      const res = await api.get("/api/leaderboard", { params });
      setData(res.data);
    } catch (err) {
      console.error("Failed to load leaderboard:", err);
    } finally {
      setLoading(false);
    }
  }

  const myRank = data?.myRank;
  const showStickyBar = myRank && myRank.rank > 10;

  // Split top 3 from rest (only when not searching)
  const top3 = !searchDebounced && data ? data.leaderboard.filter((e) => e.rank <= 3).slice(0, 3) : [];
  const rest = data ? data.leaderboard.filter((e) => !top3.includes(e)) : [];

  return (
    <AppShell title="Leaderboard">
      <div className="space-y-6 pb-20">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-prokip-navy flex items-center gap-2">
            <Trophy className="w-7 h-7 text-prokip-gold" />
            Top Performers
          </h1>
          <p className="text-gray-500 mt-1">
            Ranked by Reward Points — celebrating extra-mile achievements
          </p>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
          {/* Segmented Control */}
          <div className="flex rounded-lg border border-gray-200 overflow-hidden">
            <button
              onClick={() => setFilter("all")}
              className={`px-5 py-2.5 text-sm font-medium transition-colors ${
                filter === "all"
                  ? "bg-prokip-navy text-white"
                  : "bg-white text-gray-500 hover:bg-gray-50"
              }`}
            >
              Whole Company
            </button>
            <button
              onClick={() => setFilter("department")}
              disabled={!user?.departmentId}
              className={`px-5 py-2.5 text-sm font-medium transition-colors border-l border-gray-200 ${
                filter === "department"
                  ? "bg-prokip-navy text-white"
                  : "bg-white text-gray-500 hover:bg-gray-50"
              } ${!user?.departmentId ? "opacity-50 cursor-not-allowed" : ""}`}
            >
              My Department
            </button>
          </div>

          {/* Search */}
          <div className="relative flex-1 max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="text"
              placeholder="Search member..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="input-field pl-9 w-full text-sm"
            />
          </div>
        </div>

        {loading ? (
          <div className="card py-16 text-center text-gray-400">
            <div className="animate-pulse space-y-4">
              <div className="flex justify-center gap-6">
                <div className="w-16 h-16 bg-gray-200 rounded-full" />
                <div className="w-20 h-20 bg-gray-200 rounded-full -mt-2" />
                <div className="w-16 h-16 bg-gray-200 rounded-full" />
              </div>
              <p>Loading leaderboard...</p>
            </div>
          </div>
        ) : !data || data.leaderboard.length === 0 ? (
          <div className="card py-16 text-center text-gray-400">
            <Trophy className="w-12 h-12 mx-auto mb-3 opacity-40" />
            <p className="text-lg font-medium">No results found</p>
            <p className="text-sm mt-1">Try adjusting your filters or search term</p>
          </div>
        ) : (
          <>
            {/* ============================================================ */}
            {/* THE PODIUM — Top 3 */}
            {/* ============================================================ */}
            {top3.length > 0 && (
              <div className="card bg-gradient-to-b from-prokip-navy/[0.03] to-transparent border-prokip-navy/10">
                <div className="flex flex-col lg:flex-row items-center lg:items-end justify-center gap-4 lg:gap-6 py-4">
                  {/* Render in order: 2nd, 1st, 3rd for visual layout */}
                  {[2, 1, 3].map((targetRank) => {
                    const entry = top3.find((e) => e.rank === targetRank);
                    if (!entry) return <div key={targetRank} className={`hidden lg:block w-48 ${PODIUM_STYLES[targetRank as 1|2|3].order}`} />;
                    const style = PODIUM_STYLES[entry.rank as 1 | 2 | 3];
                    const isMe = entry.userId === user?.id;

                    return (
                      <div
                        key={entry.userId}
                        className={`flex flex-col items-center text-center p-5 rounded-2xl border ${style.bg} ${style.border} ${style.order} ${style.lift} w-full lg:w-48 transition-all`}
                      >
                        {/* Medal */}
                        <span className="text-3xl mb-2">{style.label}</span>

                        {/* Avatar */}
                        <div
                          className={`${style.size} rounded-full flex items-center justify-center font-bold ring-4 ${style.ring} ${style.avatarBg} mb-3 shadow-md`}
                        >
                          {getInitials(entry.firstName, entry.lastName)}
                        </div>

                        {/* Name */}
                        <p className={`font-bold text-prokip-navy text-sm ${isMe ? "text-prokip-gold" : ""}`}>
                          {entry.firstName} {entry.lastName}
                          {isMe && (
                            <span className="ml-1 text-[10px] bg-prokip-gold/20 text-prokip-gold px-1.5 py-0.5 rounded-full font-semibold">
                              YOU
                            </span>
                          )}
                        </p>
                        <p className="text-xs text-gray-500 mt-0.5">
                          {entry.department || "No Department"}
                        </p>

                        {/* Points */}
                        <div className="mt-3 px-3 py-1.5 bg-white rounded-lg shadow-sm border border-gray-100">
                          <span className="text-lg font-bold text-prokip-navy">
                            {entry.rewardPoints.toLocaleString()}
                          </span>
                          <span className="text-xs text-gray-400 ml-1">pts</span>
                        </div>

                        {/* Grade */}
                        <div className="mt-2">
                          <GradeBadge grade={entry.grade} size="sm" />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* ============================================================ */}
            {/* THE LIST — Rank 4+ (or all when searching) */}
            {/* ============================================================ */}
            {rest.length > 0 && (
              <div className="card">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-gray-200">
                        <th className="text-left py-3 px-3 font-semibold text-prokip-navy text-sm w-16">Rank</th>
                        <th className="text-left py-3 px-3 font-semibold text-prokip-navy text-sm">Member</th>
                        <th className="text-left py-3 px-3 font-semibold text-prokip-navy text-sm hidden sm:table-cell">Department</th>
                        <th className="text-right py-3 px-3 font-semibold text-prokip-navy text-sm">Reward Pts</th>
                        <th className="text-left py-3 px-3 font-semibold text-prokip-navy text-sm hidden md:table-cell">Grade</th>
                      </tr>
                    </thead>
                    <tbody>
                      {rest.map((entry) => {
                        const isMe = entry.userId === user?.id;
                        return (
                          <tr
                            key={entry.userId}
                            className={`border-b border-gray-100 hover:bg-gray-50 transition-colors ${
                              isMe ? "bg-prokip-gold/10" : ""
                            }`}
                          >
                            <td className="py-3 px-3">
                              <span className="font-semibold text-gray-500">
                                #{entry.rank}
                              </span>
                            </td>
                            <td className="py-3 px-3">
                              <div className="flex items-center gap-3">
                                {/* Avatar */}
                                <div className="w-8 h-8 rounded-full bg-prokip-navy/10 text-prokip-navy flex items-center justify-center text-xs font-bold flex-shrink-0">
                                  {getInitials(entry.firstName, entry.lastName)}
                                </div>
                                <span className={`font-medium text-sm ${isMe ? "text-prokip-gold" : "text-prokip-navy"}`}>
                                  {entry.firstName} {entry.lastName}
                                  {isMe && (
                                    <span className="ml-2 text-[10px] bg-prokip-gold/20 text-prokip-gold px-1.5 py-0.5 rounded-full font-semibold">
                                      YOU
                                    </span>
                                  )}
                                </span>
                              </div>
                            </td>
                            <td className="py-3 px-3 text-gray-500 text-sm hidden sm:table-cell">
                              {entry.department || "—"}
                            </td>
                            <td className="py-3 px-3 text-right">
                              <span className="font-bold text-prokip-navy">
                                {entry.rewardPoints.toLocaleString()}
                              </span>
                            </td>
                            <td className="py-3 px-3 hidden md:table-cell">
                              <GradeBadge grade={entry.grade} size="sm" />
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </>
        )}

        {/* ============================================================ */}
        {/* MY RANK — Sticky Bar (shown when user is outside Top 10) */}
        {/* ============================================================ */}
        {showStickyBar && (
          <div className="fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur border-t border-gray-200 shadow-lg px-4 py-3 z-30">
            <div className="max-w-4xl mx-auto flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-prokip-navy text-white flex items-center justify-center text-xs font-bold">
                  {user ? getInitials(user.firstName, user.lastName) : "?"}
                </div>
                <div>
                  <p className="text-xs text-gray-500">Your Rank</p>
                  <p className="font-bold text-prokip-navy text-lg leading-tight">#{myRank!.rank}</p>
                </div>
              </div>
              <div className="flex items-center gap-5 text-sm">
                <div className="text-center">
                  <p className="text-xs text-gray-500">Reward Pts</p>
                  <p className="font-bold text-prokip-navy">{myRank!.rewardPoints.toLocaleString()}</p>
                </div>
                {myRank!.pointsToNext > 0 && (
                  <div className="text-center flex items-center gap-1.5">
                    <ArrowUp className="w-4 h-4 text-prokip-gold" />
                    <div>
                      <p className="text-xs text-gray-500">To next rank</p>
                      <p className="font-bold text-prokip-gold">{myRank!.pointsToNext.toLocaleString()} pts</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
}
