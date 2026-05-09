"use client";

import { useEffect, useState, useMemo } from "react";
import { useAuth } from "@/context/AuthContext";
import api from "@/lib/api";
import AppShell from "@/components/AppShell";
import GradeBadge from "@/components/GradeBadge";
import { Search, Trophy, ArrowLeft } from "lucide-react";
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

const RANK_MEDALS: Record<number, string> = { 1: "🥇", 2: "🥈", 3: "🥉" };

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

  return (
    <AppShell title="Leaderboard">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.back()}
            className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-prokip-navy" />
          </button>
          <h1 className="text-2xl font-bold text-prokip-navy">🏆 Leaderboard</h1>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex gap-3">
            <div className="flex rounded-lg border border-gray-200 overflow-hidden">
              <button
                onClick={() => setFilter("all")}
                className={`px-4 py-2 text-sm font-medium transition-colors ${
                  filter === "all"
                    ? "bg-prokip-navy text-white"
                    : "bg-white text-gray-500 hover:bg-gray-50"
                }`}
              >
                All Company
              </button>
              <button
                onClick={() => setFilter("department")}
                className={`px-4 py-2 text-sm font-medium transition-colors border-l border-gray-200 ${
                  filter === "department"
                    ? "bg-prokip-navy text-white"
                    : "bg-white text-gray-500 hover:bg-gray-50"
                }`}
              >
                My Department
              </button>
            </div>

            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Search member..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="input-field pl-10 min-w-[200px]"
              />
            </div>
          </div>
        </div>

        {/* Table */}
        {loading ? (
          <div className="card py-12 text-center text-gray-400">Loading...</div>
        ) : !data || data.leaderboard.length === 0 ? (
          <div className="card py-12 text-center text-gray-400">
            <Trophy className="w-10 h-10 mx-auto mb-3 opacity-50" />
            <p>No results found</p>
          </div>
        ) : (
          <div className="card">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-3 px-3 font-semibold text-prokip-navy text-sm w-16">Rank</th>
                    <th className="text-left py-3 px-3 font-semibold text-prokip-navy text-sm">Name</th>
                    <th className="text-left py-3 px-3 font-semibold text-prokip-navy text-sm">Department</th>
                    <th className="text-right py-3 px-3 font-semibold text-prokip-navy text-sm">Reward Points</th>
                    <th className="text-left py-3 px-3 font-semibold text-prokip-navy text-sm">Grade</th>
                  </tr>
                </thead>
                <tbody>
                  {data.leaderboard.map((entry) => {
                    const isMe = entry.userId === user?.id;
                    return (
                      <tr
                        key={entry.userId}
                        className={`border-b border-gray-100 hover:bg-gray-50 transition-colors ${
                          isMe ? "bg-prokip-gold/10" : ""
                        }`}
                      >
                        <td className="py-3 px-3">
                          <span className={`font-bold ${
                            entry.rank === 1 ? "text-prokip-gold" :
                            entry.rank === 2 ? "text-gray-400" :
                            entry.rank === 3 ? "text-amber-700" :
                            "text-gray-500"
                          }`}>
                            {RANK_MEDALS[entry.rank] || `#${entry.rank}`}
                          </span>
                        </td>
                        <td className="py-3 px-3">
                          <span className={`font-medium ${isMe ? "text-prokip-gold" : "text-prokip-navy"}`}>
                            {entry.firstName} {entry.lastName}
                            {isMe && (
                              <span className="ml-2 text-[10px] bg-prokip-gold/20 text-prokip-gold px-1.5 py-0.5 rounded-full font-semibold">
                                YOU
                              </span>
                            )}
                          </span>
                        </td>
                        <td className="py-3 px-3 text-gray-600 text-sm">
                          {entry.department || "No Department"}
                        </td>
                        <td className="py-3 px-3 text-right">
                          <span className="font-semibold text-prokip-navy">
                            {entry.rewardPoints}
                          </span>
                        </td>
                        <td className="py-3 px-3">
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

        {/* My Rank Sticky Bar */}
        {showStickyBar && (
          <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 shadow-lg px-4 py-3 z-30">
            <div className="max-w-4xl mx-auto flex items-center justify-between text-sm">
              <div className="flex items-center gap-3">
                <span className="text-gray-500">Your Rank:</span>
                <span className="font-bold text-prokip-gold text-lg">#{myRank.rank}</span>
              </div>
              <div className="flex items-center gap-4">
                <span className="text-gray-500">
                  Reward Points: <span className="text-prokip-navy font-semibold">{myRank.rewardPoints}</span>
                </span>
                {myRank.pointsToNext > 0 && (
                  <span className="text-gray-500">
                    <span className="text-prokip-gold font-semibold">{myRank.pointsToNext}</span> pts to next rank
                  </span>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
}
