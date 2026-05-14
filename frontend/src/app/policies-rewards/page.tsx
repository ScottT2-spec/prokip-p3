"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { EnhancedMemberDashboard, RewardPolicy } from "@/lib/types";
import api from "@/lib/api";
import AppShell from "@/components/AppShell";
import GradeBadge from "@/components/GradeBadge";
import { PageSkeleton } from "@/components/LoadingSkeleton";
import { Shield } from "lucide-react";
import { getGradeConfig } from "@/lib/grades";

export default function PoliciesRewardsPage() {
  const { user } = useAuth();
  const [memberData, setMemberData] = useState<EnhancedMemberDashboard | null>(null);
  const [rewardPolicies, setRewardPolicies] = useState<RewardPolicy[]>([]);
  const [loading, setLoading] = useState(true);
  const [policyLimit, setPolicyLimit] = useState(10);

  useEffect(() => {
    if (!user) return;
    loadData();
  }, [user]);

  const loadData = async () => {
    try {
      const [dashRes, rewardsRes] = await Promise.all([
        api.get("/api/dashboard/member"),
        api.get("/api/grades/rewards"),
      ]);
      setMemberData(dashRes.data);
      setRewardPolicies(rewardsRes.data.rewards || []);
    } catch (error) {
      console.error("Failed to load policies & rewards data");
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
            Grade definitions, company policies, and reward structures
          </p>
        </div>

        {/* Grade Definitions */}
        <div className="card">
          <h3 className="text-lg font-semibold text-prokip-navy mb-4">Grade Definitions</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {(memberData.rewardThresholds.length > 0 ? memberData.rewardThresholds : []).map((threshold) => {
              const gradeKey = threshold.grade as keyof typeof import("@/lib/grades").GRADE_CONFIG;
              const config = getGradeConfig(gradeKey as any);
              return (
                <div
                  key={threshold.id}
                  className="rounded-lg border-2 p-4"
                  style={{ borderColor: config.color }}
                >
                  <div className="flex items-center gap-3 mb-3">
                    <GradeBadge grade={threshold.grade as any} size="sm" />
                    <div>
                      <p className="font-semibold text-prokip-navy">{threshold.title}</p>
                      <p className="text-xs text-gray-500">
                        {threshold.minPoints}+ pts{threshold.maxPoints ? ` (up to ${threshold.maxPoints})` : ""}
                      </p>
                    </div>
                  </div>
                  <p className="text-sm text-gray-600 mb-2">{threshold.description}</p>
                  {threshold.reward && (
                    <p className="text-sm text-green-600">
                      <span className="font-medium">✅ Reward:</span> {threshold.reward}
                    </p>
                  )}
                  {threshold.consequence && (
                    <p className="text-sm text-red-600">
                      <span className="font-medium">⚠️ Consequence:</span> {threshold.consequence}
                    </p>
                  )}
                </div>
              );
            })}
            {memberData.rewardThresholds.length === 0 && (
              <p className="text-gray-500 col-span-full text-center py-6">No grade definitions configured</p>
            )}
          </div>
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

        {/* Rewards by Grade */}
        <div className="card">
          <h3 className="text-lg font-semibold text-prokip-navy mb-4">Rewards by Grade</h3>
          {rewardPolicies.length > 0 ? (
            <div className="space-y-4">
              {(["A_PLUS", "A", "B", "C", "F"] as const).map((grade) => {
                const gradeRewards = rewardPolicies.filter(r => r.grade === grade);
                if (gradeRewards.length === 0) return null;
                const isCurrentGrade = memberData.grade === grade;
                return (
                  <div key={grade} className={`rounded-lg border p-4 ${isCurrentGrade ? "border-prokip-gold bg-prokip-gold/5" : "border-gray-200"}`}>
                    <div className="flex items-center gap-2 mb-3">
                      <GradeBadge grade={grade} size="sm" />
                      {isCurrentGrade && (
                        <span className="text-xs font-semibold text-prokip-gold bg-prokip-gold/10 px-2 py-0.5 rounded-full">Your Grade</span>
                      )}
                    </div>
                    <div className="space-y-2">
                      {gradeRewards.map((reward) => {
                        const typeColors: Record<string, string> = {
                          MONETARY: "text-green-600",
                          GROWTH: "text-blue-600",
                          FLEXIBILITY: "text-purple-600",
                          RECOGNITION: "text-yellow-600",
                          CONSEQUENCE: "text-red-600",
                        };
                        return (
                          <div key={reward.id} className="flex items-start gap-2">
                            <span className={`text-xs font-semibold mt-0.5 ${typeColors[reward.type] || "text-gray-500"}`}>
                              {reward.type === "CONSEQUENCE" ? "⚠️" : "✅"}
                            </span>
                            <div>
                              <p className="text-sm font-medium text-prokip-navy">{reward.title}</p>
                              <p className="text-xs text-gray-600">{reward.description}</p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-gray-500 text-center py-6">No reward policies configured yet</p>
          )}
        </div>
      </div>
    </AppShell>
  );
}
