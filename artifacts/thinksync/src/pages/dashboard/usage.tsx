import { StatCard } from "@/components/common/stat-card";
import { useStatsQuery, useUsageQuery } from "@/lib/api/hooks";

export default function DashboardUsagePage() {
  const stats = useStatsQuery();
  const usage = useUsageQuery();

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Usage</h1>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        <StatCard title="Total requests" value={String(stats.data?.total_requests ?? 0)} />
        <StatCard title="Total tokens" value={String(stats.data?.total_tokens ?? 0)} />
        <StatCard title="Total cost (USD)" value={String(usage.data?.total_cost_usd ?? 0)} />
        <StatCard title="Billed from balance" value={String(usage.data?.total_billed_from_balance ?? 0)} />
        <StatCard title="Billed from packages" value={String(usage.data?.total_billed_from_packages ?? 0)} />
      </div>
    </div>
  );
}
