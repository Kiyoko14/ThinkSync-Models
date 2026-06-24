import { StatCard } from "@/components/common/stat-card";
import { useStatsQuery, useUsageQuery } from "@/lib/api/hooks";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Activity, Zap, DollarSign, Wallet, Package, TrendingUp, FileText, BarChart3, PieChart } from "lucide-react";
import { useState } from "react";

export default function DashboardUsagePage() {
  const stats = useStatsQuery();
  const usage = useUsageQuery();
  const [timeRange, setTimeRange] = useState<'7d' | '30d' | 'all'>('30d');

  const formatNumber = (n: number | undefined) => {
    if (n === undefined || n === 0) return '0';
    if (n >= 1000000) return (n / 1000000).toFixed(1) + 'M';
    if (n >= 1000) return (n / 1000).toFixed(1) + 'K';
    return n.toLocaleString();
  };

  const formatCurrency = (n: number | undefined) => {
    if (n === undefined || n === 0) return '$0.00';
    return '$' + n.toFixed(2);
  };

  const hasUsage = (stats.data?.total_requests ?? 0) > 0;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Usage</h1>
          <p className="text-muted-foreground mt-1">Monitor your API consumption and costs.</p>
        </div>
        {/* Time Range Selector */}
        <div className="flex items-center gap-1 p-1 bg-muted rounded-lg">
          {(['7d', '30d', 'all'] as const).map((range) => (
            <button
              key={range}
              onClick={() => setTimeRange(range)}
              className={`px-3 py-1.5 text-sm rounded-md transition-colors ${
                timeRange === range
                  ? 'bg-background shadow-sm font-medium'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {range === '7d' ? '7 days' : range === '30d' ? '30 days' : 'All time'}
            </button>
          ))}
        </div>
      </div>

      {/* Usage Summary Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <StatCard 
          title="Total Requests" 
          value={formatNumber(stats.data?.total_requests)}
          hint="API calls to ThinkSync"
          icon={Activity}
          className="border-blue-200 dark:border-blue-900/50"
        />
        <StatCard 
          title="Total Tokens" 
          value={formatNumber(stats.data?.total_tokens)}
          hint="Input + output"
          icon={Zap}
          className="border-amber-200 dark:border-amber-900/50"
        />
        <StatCard 
          title="Total Cost" 
          value={formatCurrency(usage.data?.total_cost_usd)}
          hint="Total spending"
          icon={DollarSign}
          className="border-red-200 dark:border-red-900/50"
        />
        <StatCard 
          title="From Balance" 
          value={formatCurrency(usage.data?.total_billed_from_balance)}
          hint="Wallet deduction"
          icon={Wallet}
          className="border-green-200 dark:border-green-900/50"
        />
        <StatCard 
          title="From Packages" 
          value={formatCurrency(usage.data?.total_billed_from_packages)}
          hint="Package usage"
          icon={Package}
          className="border-purple-200 dark:border-purple-900/50"
        />
      </div>

      {/* Premium Empty State - When No Usage */}
      {!hasUsage && (
        <Card className="border-dashed">
          <CardContent className="py-16">
            <div className="text-center">
              <div className="mx-auto h-16 w-16 rounded-full bg-muted flex items-center justify-center mb-4">
                <BarChart3 className="h-8 w-8 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-semibold mb-2">No usage yet</h3>
              <p className="text-muted-foreground text-sm max-w-sm mx-auto mb-6">
                Start making API calls to see your usage statistics here. Create an API key to get started.
              </p>
              <a 
                href="/dashboard/keys" 
                className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
              >
                <Activity className="h-4 w-4" />
                Create API Key
              </a>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Usage Details - When Has Usage */}
      {hasUsage && (
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Usage Breakdown */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <PieChart className="h-5 w-5 text-primary" />
                Usage Breakdown
              </CardTitle>
              <CardDescription>Distribution of your API usage</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="h-3 w-3 rounded-full bg-chart-1" />
                    <span className="text-sm">API Requests</span>
                  </div>
                  <span className="font-medium">{formatNumber(stats.data?.total_requests)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="h-3 w-3 rounded-full bg-chart-2" />
                    <span className="text-sm">Total Tokens</span>
                  </div>
                  <span className="font-medium">{formatNumber(stats.data?.total_tokens)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="h-3 w-3 rounded-full bg-chart-3" />
                    <span className="text-sm">Cost</span>
                  </div>
                  <span className="font-medium">{formatCurrency(usage.data?.total_cost_usd)}</span>
                </div>
              </div>
              {/* Visual Bar */}
              <div className="h-2 rounded-full bg-muted overflow-hidden flex">
                <div className="h-full bg-chart-1" style={{ width: '33%' }} />
                <div className="h-full bg-chart-2" style={{ width: '33%' }} />
                <div className="h-full bg-chart-3" style={{ width: '34%' }} />
              </div>
            </CardContent>
          </Card>

          {/* Cost Summary */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-green-600" />
                Cost Summary
              </CardTitle>
              <CardDescription>Where your costs come from</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="rounded-lg bg-muted/50 p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-muted-foreground">Average cost per request</span>
                  <span className="font-medium">
                    {stats.data?.total_requests ? formatCurrency((usage.data?.total_cost_usd || 0) / stats.data.total_requests) : '$0.00'}
                  </span>
                </div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-muted-foreground">Average tokens per request</span>
                  <span className="font-medium">
                    {stats.data?.total_requests ? formatNumber(Math.round((stats.data?.total_tokens || 0) / stats.data.total_requests)) : '0'}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Cost per 1M tokens</span>
                  <span className="font-medium">$2.50</span>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-lg border p-3">
                  <p className="text-xs text-muted-foreground">Wallet Balance Used</p>
                  <p className="text-lg font-semibold text-green-600">{formatCurrency(usage.data?.total_billed_from_balance)}</p>
                </div>
                <div className="rounded-lg border p-3">
                  <p className="text-xs text-muted-foreground">Packages Used</p>
                  <p className="text-lg font-semibold text-purple-600">{formatCurrency(usage.data?.total_billed_from_packages)}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Recent Activity Placeholder */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Recent Activity
          </CardTitle>
          <CardDescription>Your latest API calls</CardDescription>
        </CardHeader>
        <CardContent>
          {hasUsage ? (
            <div className="rounded-lg border p-8 text-center">
              <p className="text-muted-foreground">Activity details coming soon...</p>
            </div>
          ) : (
            <p className="text-muted-foreground text-sm text-center py-4">
              No recent activity to display
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
