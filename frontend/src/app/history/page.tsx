"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { PointLog } from "@/lib/types";
import api from "@/lib/api";
import AppShell from "@/components/AppShell";
import { PageSkeleton } from "@/components/LoadingSkeleton";
import { formatPoints } from "@/lib/grades";
import { ExternalLink, ArrowLeft, ArrowUp, ArrowDown, Filter } from "lucide-react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";

export default function HistoryPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [logs, setLogs] = useState<PointLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [totalPerformance, setTotalPerformance] = useState(0);
  const [totalReward, setTotalReward] = useState(0);
  const [categoryFilter, setCategoryFilter] = useState<string>("");
  const limit = 20;

  useEffect(() => {
    if (!user) return;
    setPage(1);
  }, [categoryFilter]);

  useEffect(() => {
    if (!user) return;
    loadHistory();
  }, [user, page, categoryFilter]);

  const loadHistory = async () => {
    if (!user) return;
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
      });
      if (categoryFilter) {
        params.set("category", categoryFilter);
      }
      const response = await api.get(
        `/api/points/history/${user.id}?${params}`
      );
      setLogs(response.data.logs);
      setTotal(response.data.total);
      setTotalPerformance(response.data.totalPerformance ?? response.data.totalAdded ?? 0);
      setTotalReward(response.data.totalReward ?? response.data.totalDeducted ?? 0);
    } catch (error) {
      toast.error("Failed to load history");
    } finally {
      setLoading(false);
    }
  };

  const totalPages = Math.ceil(total / limit);

  if (loading) {
    return (
      <AppShell>
        <PageSkeleton />
      </AppShell>
    );
  }

  return (
    <AppShell title="Point Ledger">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <button
            onClick={() => router.push("/")}
            className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-prokip-navy">Point Ledger</h1>
            <p className="text-gray-600">
              {total} {total === 1 ? "entry" : "entries"} total
            </p>
          </div>
        </div>

        {/* Aggregate Summary */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="card flex items-center gap-4">
            <div className="p-3 bg-slate-100 rounded-lg">
              <ArrowDown className="w-5 h-5 text-prokip-navy" />
            </div>
            <div>
              <p className="text-sm text-gray-500">⚙️ Performance Points</p>
              <p className="text-2xl font-bold text-prokip-navy">{totalPerformance}</p>
            </div>
          </div>
          <div className="card flex items-center gap-4">
            <div className="p-3 bg-amber-100 rounded-lg">
              <ArrowUp className="w-5 h-5 text-amber-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">🌟 Reward Points</p>
              <p className="text-2xl font-bold text-prokip-gold">{totalReward}</p>
            </div>
          </div>
        </div>

        {/* Category Filter */}
        <div className="flex items-center gap-3">
          <Filter className="w-4 h-4 text-gray-400" />
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="input-field max-w-[200px] text-sm"
          >
            <option value="">All Categories</option>
            <option value="PERFORMANCE">Performance</option>
            <option value="REWARD">Reward</option>
          </select>
        </div>

        {/* History Table */}
        <div className="card">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-3 px-3 font-semibold text-prokip-navy text-sm">
                    Date
                  </th>
                  <th className="text-left py-3 px-3 font-semibold text-prokip-navy text-sm">
                    Category
                  </th>
                  <th className="text-left py-3 px-3 font-semibold text-prokip-navy text-sm">
                    Activity Type
                  </th>
                  <th className="text-left py-3 px-3 font-semibold text-prokip-navy text-sm">
                    Points
                  </th>
                  <th className="text-left py-3 px-3 font-semibold text-prokip-navy text-sm">
                    Notes / Links
                  </th>
                  <th className="text-left py-3 px-3 font-semibold text-prokip-navy text-sm">
                    Added By
                  </th>
                  <th className="text-right py-3 px-3 font-semibold text-prokip-navy text-sm">
                    Balance After
                  </th>
                  <th className="text-left py-3 px-3 font-semibold text-prokip-navy text-sm">
                    Evidence
                  </th>
                </tr>
              </thead>
              <tbody>
                {logs.map((log) => (
                  <tr
                    key={log.id}
                    className="border-b border-gray-100 hover:bg-gray-50 transition-colors"
                  >
                    <td className="py-3 px-3 text-gray-500 text-sm whitespace-nowrap">
                      {new Date(log.createdAt).toLocaleDateString("en-US", {
                        year: "numeric",
                        month: "short",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </td>
                    <td className="py-3 px-3">
                      {log.category === "REWARD" ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-semibold rounded-full bg-amber-50 text-amber-700 border border-amber-200">
                          🌟 Reward
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-semibold rounded-full bg-slate-50 text-slate-600 border border-slate-200">
                          ⚙️ Performance
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-3">
                      {log.points > 0 ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-semibold rounded-full bg-green-50 text-green-700 border border-green-200">
                          Addition
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-semibold rounded-full bg-red-50 text-red-700 border border-red-200">
                          Deduction
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-3">
                      <span
                        className={`font-semibold px-2 py-1 rounded-md text-sm ${
                          log.points > 0
                            ? "text-green-700 bg-green-50"
                            : "text-red-700 bg-red-50"
                        }`}
                      >
                        {formatPoints(log.points)}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-prokip-navy text-sm max-w-[250px]">
                      <span className="line-clamp-2">{log.reason}</span>
                      {log.ticketLink && (
                        <a
                          href={log.ticketLink}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-prokip-navy hover:underline flex items-center gap-1 mt-1 text-xs"
                        >
                          <ExternalLink className="w-3 h-3" />
                          View Ticket
                        </a>
                      )}
                    </td>
                    <td className="py-3 px-3 text-gray-600 text-sm whitespace-nowrap">
                      {log.givenBy
                        ? `${log.givenBy.firstName} ${log.givenBy.lastName}`
                        : "System"}
                    </td>
                    <td className="py-3 px-3 text-right">
                      {log.balanceAfter !== undefined ? (
                        <span className="font-semibold text-sm text-prokip-navy">
                          {log.balanceAfter}
                        </span>
                      ) : (
                        <span className="text-gray-300 text-xs">—</span>
                      )}
                    </td>
                    <td className="py-3 px-3">
                      {log.imageUrl ? (
                        <a
                          href={`${process.env.NEXT_PUBLIC_API_URL || ""}${log.imageUrl}`}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          <img
                            src={`${process.env.NEXT_PUBLIC_API_URL || ""}${log.imageUrl}`}
                            alt="Evidence"
                            className="w-10 h-10 rounded-md object-cover border border-gray-200 hover:opacity-80 transition-opacity cursor-pointer"
                          />
                        </a>
                      ) : (
                        <span className="text-gray-300 text-xs">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {logs.length === 0 && (
              <div className="text-center py-8 text-gray-500">
                {categoryFilter
                  ? `No ${categoryFilter.toLowerCase()} entries found`
                  : "No point history yet"}
              </div>
            )}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex justify-center gap-2 mt-6">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="btn-secondary disabled:opacity-50"
              >
                Previous
              </button>
              <span className="flex items-center px-4 text-prokip-navy">
                Page {page} of {totalPages}
              </span>
              <button
                onClick={() => setPage((p) => p + 1)}
                disabled={page >= totalPages}
                className="btn-secondary disabled:opacity-50"
              >
                Next
              </button>
            </div>
          )}
        </div>
      </div>
    </AppShell>
  );
}
