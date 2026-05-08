"use client";

import { useEffect, useState, useMemo } from "react";
import { useAuth } from "@/context/AuthContext";
import api from "@/lib/api";
import { Search } from "lucide-react";
import GradeBadge from "@/components/GradeBadge";
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

function PodiumCard({
  entry,
  place,
}: {
  entry: LeaderboardEntry;
  place: 1 | 2 | 3;
}) {
  const colors = {
    1: { bg: "bg-[#F5B731]", ring: "ring-[#F5B731]", text: "text-[#F5B731]", label: "🥇" },
    2: { bg: "bg-[#C0C0C0]", ring: "ring-[#C0C0C0]", text: "text-[#C0C0C0]", label: "🥈" },
    3: { bg: "bg-[#CD7F32]", ring: "ring-[#CD7F32]", text: "text-[#CD7F32]", label: "🥉" },
  };
  const c = colors[place];
  const isFirst = place === 1;

  return (
    <div
      className={`card flex flex-col items-center p-5 ${
        isFirst ? "pt-6 pb-7 scale-105 z-10 shadow-lg" : "pt-5 pb-5"
      } transition-all`}
      style={isFirst ? { borderTop: "3px solid #F5B731" } : undefined}
    >
      {/* Rank medal */}
      <span className="text-2xl mb-2">{c.label}</span>

      {/* Avatar */}
      <div
        className={`${
          isFirst ? "w-16 h-16 text-xl" : "w-12 h-12 text-sm"
        } rounded-full ${c.bg} flex items-center justify-center text-white font-bold ring-4 ${c.ring} ring-opacity-30 mb-3`}
      >
        {getInitials(entry.firstName, entry.lastName)}
      </div>

      {/* Name */}
      <p className="font-semibold text-white text-center leading-tight">
        {entry.firstName} {entry.lastName}
      </p>
      <p className="text-xs text-[#94A3B8] mt-0.5">{entry.department || "No Dept"}</p>

      {/* Points */}
      <div className={`mt-3 text-center`}>
        <p className={`text-2xl font-bold ${c.text}`}>{entry.rewardPoints.toLocaleString()}</p>
        <p className="text-[11px] text-[#94A3B8] font-medium">Reward Points</p>
      </div>

      <div className="mt-2">
        <GradeBadge grade={entry.grade} size="sm" />
      </div>
    </div>
  );
}

export default function LeaderboardPage() {
  const { user } = useAuth();
  const [data, setData] = useState<LeaderboardResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "department">("all");
  const [search, setSearch] = useState("");
  const [searchDebounced, setSearchDebounced] = useState("");

  // Debounce search
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

  const top3 = useMemo(() => data?.leaderboard.slice(0, 3) || [], [data]);
  const rest = useMemo(() => data?.leaderboard.slice(3) || [], [data]);
  const myRank = data?.myRank;
  const showStickyBar = myRank && myRank.rank > 10;

  return (
    <div className="space-y-6 pb-20">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white">🏆 Top Performers</h1>
        <p className="text-[#94A3B8] text-sm mt-1">
          Ranked by reward points earned
        </p>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        {/* Segmented Control */}
        <div className="flex bg-[#1E293B] rounded-lg p-1">
          <button
            onClick={() => setFilter("all")}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
              filter === "all"
                ? "bg-prokip-navy text-white shadow-sm"
                : "text-[#94A3B8] hover:text-white"
            }`}
          >
            All Company
          </button>
          <button
            onClick={() => setFilter("department")}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
              filter === "department"
                ? "bg-prokip-navy text-white shadow-sm"
                : "text-[#94A3B8] hover:text-white"
            }`}
          >
            My Department
          </button>
        </div>

        {/* Search */}
        <div className="relative flex-1 max-w-xs">
          <Search
            size={16}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-[#64748B]"
          />
          <input
            type="text"
            placeholder="Search member..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 bg-[#1E293B] border border-[#334155] rounded-lg text-sm text-white placeholder-[#64748B] focus:outline-none focus:ring-2 focus:ring-prokip-gold/40"
          />
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="w-8 h-8 border-2 border-prokip-gold border-t-transparent rounded-full animate-spin" />
        </div>
      ) : !data || data.leaderboard.length === 0 ? (
        <div className="card p-12 text-center">
          <p className="text-[#94A3B8]">No results found</p>
        </div>
      ) : (
        <>
          {/* Podium — Top 3 */}
          {top3.length >= 3 && !searchDebounced && (
            <div className="grid grid-cols-3 gap-3 items-end max-w-2xl mx-auto">
              {/* 2nd place (left) */}
              <div className="mt-6">
                <PodiumCard entry={top3[1]} place={2} />
              </div>
              {/* 1st place (center, elevated) */}
              <div>
                <PodiumCard entry={top3[0]} place={1} />
              </div>
              {/* 3rd place (right) */}
              <div className="mt-8">
                <PodiumCard entry={top3[2]} place={3} />
              </div>
            </div>
          )}

          {/* If searching or < 3 entries, show all in table */}
          {(searchDebounced || top3.length < 3) && top3.length > 0 && (
            <div className="card overflow-hidden">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-[#334155]">
                    <th className="text-left text-xs font-semibold text-[#94A3B8] uppercase tracking-wider px-4 py-3">
                      Rank
                    </th>
                    <th className="text-left text-xs font-semibold text-[#94A3B8] uppercase tracking-wider px-4 py-3">
                      Member
                    </th>
                    <th className="text-left text-xs font-semibold text-[#94A3B8] uppercase tracking-wider px-4 py-3 hidden sm:table-cell">
                      Department
                    </th>
                    <th className="text-right text-xs font-semibold text-[#94A3B8] uppercase tracking-wider px-4 py-3">
                      Reward Pts
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {data.leaderboard.map((entry) => (
                    <LeaderboardRow key={entry.userId} entry={entry} currentUserId={user?.id} />
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Table — rest of the list (rank 4+) */}
          {!searchDebounced && rest.length > 0 && (
            <div className="card overflow-hidden">
              <div className="px-4 py-3 border-b border-[#334155]">
                <h2 className="text-sm font-semibold text-[#94A3B8] uppercase tracking-wider">
                  Full Rankings
                </h2>
              </div>
              <table className="w-full">
                <thead>
                  <tr className="border-b border-[#334155]">
                    <th className="text-left text-xs font-semibold text-[#94A3B8] uppercase tracking-wider px-4 py-3">
                      Rank
                    </th>
                    <th className="text-left text-xs font-semibold text-[#94A3B8] uppercase tracking-wider px-4 py-3">
                      Member
                    </th>
                    <th className="text-left text-xs font-semibold text-[#94A3B8] uppercase tracking-wider px-4 py-3 hidden sm:table-cell">
                      Department
                    </th>
                    <th className="text-right text-xs font-semibold text-[#94A3B8] uppercase tracking-wider px-4 py-3">
                      Reward Pts
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {rest.map((entry) => (
                    <LeaderboardRow key={entry.userId} entry={entry} currentUserId={user?.id} />
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      {/* My Rank Sticky Bar */}
      {showStickyBar && (
        <div className="fixed bottom-0 left-0 right-0 bg-[#0F172A] border-t border-[#334155] px-4 py-3 z-30">
          <div className="max-w-4xl mx-auto flex items-center justify-between text-sm">
            <div className="flex items-center gap-4">
              <span className="text-[#94A3B8]">Your Rank:</span>
              <span className="font-bold text-prokip-gold text-lg">#{myRank.rank}</span>
            </div>
            <div className="flex items-center gap-4">
              <span className="text-[#94A3B8]">
                Reward Points:{" "}
                <span className="text-white font-semibold">
                  {myRank.rewardPoints.toLocaleString()}
                </span>
              </span>
              {myRank.pointsToNext > 0 && (
                <span className="text-[#94A3B8]">
                  <span className="text-prokip-gold font-semibold">
                    {myRank.pointsToNext}
                  </span>{" "}
                  pts to next rank
                </span>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function LeaderboardRow({
  entry,
  currentUserId,
}: {
  entry: LeaderboardEntry;
  currentUserId?: string;
}) {
  const isMe = entry.userId === currentUserId;
  const rankColors: Record<number, string> = {
    1: "text-[#F5B731]",
    2: "text-[#C0C0C0]",
    3: "text-[#CD7F32]",
  };

  return (
    <tr
      className={`border-b border-[#334155]/50 hover:bg-[#1E293B]/50 transition-colors ${
        isMe ? "bg-prokip-gold/5" : ""
      }`}
    >
      <td className="px-4 py-3">
        <span
          className={`font-bold text-sm ${
            rankColors[entry.rank] || "text-[#64748B]"
          }`}
        >
          #{entry.rank}
        </span>
      </td>
      <td className="px-4 py-3">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-prokip-navy flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
            {getInitials(entry.firstName, entry.lastName)}
          </div>
          <div>
            <p className={`text-sm font-medium ${isMe ? "text-prokip-gold" : "text-white"}`}>
              {entry.firstName} {entry.lastName}
              {isMe && (
                <span className="ml-1.5 text-[10px] bg-prokip-gold/20 text-prokip-gold px-1.5 py-0.5 rounded-full font-semibold">
                  YOU
                </span>
              )}
            </p>
            <p className="text-xs text-[#64748B] sm:hidden">{entry.department || "—"}</p>
          </div>
        </div>
      </td>
      <td className="px-4 py-3 text-sm text-[#94A3B8] hidden sm:table-cell">
        {entry.department || "—"}
      </td>
      <td className="px-4 py-3 text-right">
        <span className="text-sm font-semibold text-white">
          {entry.rewardPoints.toLocaleString()}
        </span>
      </td>
    </tr>
  );
}
