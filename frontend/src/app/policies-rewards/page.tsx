"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { EnhancedMemberDashboard } from "@/lib/types";
import api from "@/lib/api";
import AppShell from "@/components/AppShell";
import { PageSkeleton } from "@/components/LoadingSkeleton";
import { Shield } from "lucide-react";

export default function PoliciesRewardsPage() {
  const { user } = useAuth();
  const [memberData, setMemberData] = useState<EnhancedMemberDashboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [policyLimit, setPolicyLimit] = useState(10);

  useEffect(() => {
    if (!user) return;
    loadData();
  }, [user]);

  const loadData = async () => {
    try {
      const dashRes = await api.get("/api/dashboard/member");
      setMemberData(dashRes.data);
    } catch (error) {
      console.error("Failed to load policies data");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <AppShell>
        <PageSkeleton />
      </AppShell>
    );
  }

  if (!memberData) return null;

  return (
    <AppShell title="Policies & Rewards">
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-prokip-navy flex items-center gap-2">
            <Shield className="w-7 h-7 text-prokip-navy" />
            Policies & Rewards
          </h1>
          <p className="text-gray-500 mt-1">
            Company policies and point impact rules
          </p>
        </div>

        {/* Policy List */}
        <div className="card">
          <h3 className="text-lg font-semibold text-prokip-navy mb-4">Policy List</h3>
          {memberData.policies.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-3 px-2 font-semibold text-prokip-navy text-sm">Policy</th>
                    <th className="text-left py-3 px-2 font-semibold text-prokip-navy text-sm">Description</th>
                    <th className="text-right py-3 px-2 font-semibold text-prokip-navy text-sm">Impact</th>
                  </tr>
                </thead>
                <tbody>
                  {memberData.policies.slice(0, policyLimit).map((policy) => (
                    <tr key={policy.id} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="py-3 px-2 text-sm font-medium text-prokip-navy">{policy.name}</td>
                      <td className="py-3 px-2 text-sm text-gray-600 max-w-[300px]">{policy.description}</td>
                      <td className={`py-3 px-2 text-sm text-right font-semibold ${
                        policy.pointImpact > 0 ? "text-green-600" : policy.pointImpact < 0 ? "text-red-600" : "text-gray-500"
                      }`}>
                        {policy.pointImpact > 0 ? `+${policy.pointImpact}` : policy.pointImpact}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {memberData.policies.length > policyLimit && (
                <button
                  onClick={() => setPolicyLimit(prev => prev + 10)}
                  className="mt-3 w-full py-2 text-sm font-medium text-prokip-navy hover:bg-gray-50 rounded-lg transition-colors"
                >
                  Load More ({memberData.policies.length - policyLimit} remaining)
                </button>
              )}
            </div>
          ) : (
            <p className="text-gray-500 text-center py-6">No policies configured</p>
          )}
        </div>
      </div>
    </AppShell>
  );
}
