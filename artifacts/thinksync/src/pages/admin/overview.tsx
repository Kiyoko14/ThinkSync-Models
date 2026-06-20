import { useMemo } from "react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatCard } from "@/components/common/stat-card";
import { Skeleton } from "@/components/ui/skeleton";
import { useAdminAnalyticsQuery } from "@/lib/api/hooks";

const CHART_COLORS = ["#2563eb", "#16a34a", "#ea580c", "#9333ea", "#dc2626", "#0891b2", "#7c3aed", "#db2777"];

export default function AdminOverviewPage() {
  const { data, isLoading, error } = useAdminAnalyticsQuery();

  const chartData = useMemo(() => {
    if (!data) return [];
    return [
      { name: "Users", value: data.users_total, active: data.users_active },
      { name: "Models", value: data.models_total, active: data.models_active },
      { name: "Requests", value: data.api_requests_total },
      { name: "Transactions", value: data.transactions_total },
    ];
  }, [data]);

  const pieData = useMemo(() => {
    if (!data) return [];
    return [
      { name: "Active Users", value: data.users_active },
      { name: "Inactive Users", value: data.users_total - data.users_active },
    ];
  }, [data]);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-semibold">Admin Dashboard</h1>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-semibold">Admin Dashboard</h1>
        <p className="text-destructive">Failed to load analytics: {(error as Error).message}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Admin Dashboard</h1>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard title="Total Users" value={String(data?.users_total ?? 0)} hint={`${data?.users_active ?? 0} active`} />
        <StatCard title="Total Models" value={String(data?.models_total ?? 0)} hint={`${data?.models_active ?? 0} active`} />
        <StatCard title="API Requests" value={String(data?.api_requests_total ?? 0)} />
        <StatCard title="API Cost" value={`$${(data?.api_cost_total ?? 0).toFixed(4)}`} />
        <StatCard title="Transactions" value={String(data?.transactions_total ?? 0)} />
        <StatCard title="Package Revenue" value={`$${((data?.package_revenue_cents ?? 0) / 100).toFixed(2)}`} />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader><CardTitle>Platform Overview</CardTitle></CardHeader>
          <CardContent>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="value" fill="#2563eb" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>User Activity</CardTitle></CardHeader>
          <CardContent>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={pieData} cx="50%" cy="50%" outerRadius={100} dataKey="value" label>
                    {pieData.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
