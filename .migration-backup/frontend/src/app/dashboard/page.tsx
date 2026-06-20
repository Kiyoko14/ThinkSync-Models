"use client";

import { StatCard } from "@/components/common/stat-card";
import { useBalanceQuery, useProfileQuery, useStatsQuery } from "@/lib/api/hooks";

export default function DashboardOverviewPage() {
  const profile = useProfileQuery();
  const stats = useStatsQuery();
  const balance = useBalanceQuery();

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Dashboard</h1>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard title="Email" value={profile.data?.email || "-"} />
        <StatCard title="Requests" value={String(stats.data?.total_requests ?? 0)} />
        <StatCard title="Total tokens" value={String(stats.data?.total_tokens ?? 0)} />
        <StatCard title="Available tokens" value={String(balance.data?.total_available ?? 0)} />
      </div>
    </div>
  );
}
