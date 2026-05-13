"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { PointLog } from "@/lib/types";
import api from "@/lib/api";
import AppShell from "@/components/AppShell";
import { PageSkeleton } from "@/components/LoadingSkeleton";
import { formatPoints } from "@/lib/grades";
import { ExternalLink, ArrowLeft } from "lucide-react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";

export default function HistoryPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [logs, setLogs] = useState<PointLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [totalAdded, setTotalAdded] = useState(0);
  const [totalDeducted, setTotalDeducted] = useState(0);
  const [categoryFilter, setCategoryFilter] = useState<"ALL" | "PERFORMANCE" | "REWARD">("ALL");
  const limit = 20;

  useEffect(() => {
    if (!user) return;
    loadHistory();
  }, [user, page]);

  // Load aggregates once
  useEffect(() => {
    if (!user) return;
    api.get("/api/dashboard/member").then((res) => {
      setTotalAdded(res.data.totalAdded || 0);
      setTotalDeducted(res.data.totalDeducted || 0);
    }).catch(() => {});
  }, [user]);

  const loadHistory = async () => {
    if (!user) return;
    try {
      const response = await api.get(
        `/api/points/history/${user.id}?page=${page}&limit=${limit}`
      );
      setLogs(response.data.logs);
      setTotal(response.data.total);
    } catch (error) {
      toast.error("Failed to load history");
    } finally {
      setLoading(false);
    }
  };

  const filteredLogs = categoryFilter === "ALL"
    ? logs
    : logs.filter((log) => log.category === categoryFilter);

  const totalPages = Math.ceil(total / limit);

  if (loading) {
    return (
      <AppShell>
        <PageSkeleton />
      </AppShell>
    );
  }

  return (
    <AppShell title="Point History">
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
            <h1 className="text-2xl font-bold text-prokip-navy">Point History</h1>
            <p className="text-gray-600">
              {total} {total === 1 ? "entry" : "entries"} total
            </p>
          </div>
        </div>

        {/* Aggregate Totals */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="card flex items-center gap-4">
            <div className="p-3 bg-green-100 rounded-lg">
              <ArrowLeft className="w-5 h-5 text-green-600 rotate-[135deg]" />
            </div>
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Total Added</p>
              <p className="text-2xl font-bold text-green-600">+{totalAdded}</p>
            </div>
          </div>
          <div className="card flex items-center gap-4">
            <div className="p-3 bg-red-100 rounded-lg">
              <ArrowLeft className="w-5 h-5 text-red-600 rotate-[-45deg]" />
            </div>
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Total Deducted</p>
              <p className="text-2xl font-bold text-red-600">-{totalDeducted}</p>
            </div>
          </div>
          <div className="card flex items-center gap-4">
            <div className="p-3 bg-prokip-navy/10 rounded-lg">
              <ExternalLink className="w-5 h-5 text-prokip-navy" />
            </div>
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Net Balance</p>
              <p className={`text-2xl font-bold ${totalAdded - totalDeducted >= 0 ? "text-prokip-navy" : "text-red-600"}`}>
                {totalAdded - totalDeducted}
              </p>
            </div>
          </div>
        </div>

        {/* Filter */}
        <div className="flex gap-1 bg-gray-100 rounded-lg p-1 w-fit">
          {([
            { key: "ALL" as const, label: "All" },
            { key: "PERFORMANCE" as const, label: "Performance" },
            { key: "REWARD" as const, label: "🌟 Reward" },
          ]).map((tab) => (
            <button
              key={tab.key}
              onClick={() => setCategoryFilter(tab.key)}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
                categoryFilter === tab.key
                  ? "bg-white text-prokip-navy shadow-sm"
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* History Table */}
        <div className="card">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-3 px-3 font-semibold text-prokip-navy text-sm">
                    Points
                  </th>
                  <th className="text-left py-3 px-3 font-semibold text-prokip-navy text-sm">
                    Type
                  </th>
                  <th className="text-left py-3 px-3 font-semibold text-prokip-navy text-sm">
                    Policy
                  </th>
                  <th className="text-left py-3 px-3 font-semibold text-prokip-navy text-sm">
                    Reason
                  </th>
                  <th className="text-left py-3 px-3 font-semibold text-prokip-navy text-sm">
                    Added By
                  </th>
                  <th className="text-left py-3 px-3 font-semibold text-prokip-navy text-sm">
                    Date
                  </th>
                  <th className="text-left py-3 px-3 font-semibold text-prokip-navy text-sm">
                    Evidence
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredLogs.map((log) => (
                  <tr
                    key={log.id}
                    className="border-b border-gray-100 hover:bg-gray-50 transition-colors"
                  >
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
                    <td className="py-3 px-3">
                      {log.category === "REWARD" ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-semibold rounded-full bg-amber-50 text-amber-700 border border-amber-200">
                          🌟 Reward
                        </span>
                      ) : (
                        <span className="text-sm text-gray-600">Performance</span>
                      )}
                    </td>
                    <td className="py-3 px-3 text-gray-600 text-sm">
                      {log.policy?.name || "—"}
                    </td>
                    <td className="py-3 px-3 text-prokip-navy text-sm max-w-[300px]">
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

            {filteredLogs.length === 0 && (
              <div className="text-center py-8 text-gray-500">
                No point history yet
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
