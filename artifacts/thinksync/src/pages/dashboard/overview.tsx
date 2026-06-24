import { StatCard } from "@/components/common/stat-card";
import { useBillingQuery, useProfileQuery, useStatsQuery } from "@/lib/api/hooks";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Mail, Activity, Coins, Zap, User, BadgeCheck, Clock } from "lucide-react";

export default function DashboardOverviewPage() {
  const profile = useProfileQuery();
  const stats = useStatsQuery();
  const billing = useBillingQuery();

  const formatNumber = (n: number | undefined) => {
    if (n === undefined || n === 0) return '0';
    if (n >= 1000000) return (n / 1000000).toFixed(1) + 'M';
    if (n >= 1000) return (n / 1000).toFixed(1) + 'K';
    return n.toLocaleString();
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground mt-1">Welcome back! Here's your account overview.</p>
        </div>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Clock className="h-4 w-4" />
          Last updated: {new Date().toLocaleTimeString()}
        </div>
      </div>

      {/* Account Summary Card */}
      <Card className="border-primary/20 bg-gradient-to-r from-primary/5 to-transparent">
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row sm:items-center gap-4">
            <div className="h-14 w-14 rounded-full bg-primary/10 flex items-center justify-center">
              <User className="h-7 w-7 text-primary" />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-semibold">{profile.data?.display_name || 'User'}</h2>
                {profile.data?.is_active && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
                    <BadgeCheck className="h-3 w-3" /> Active
                  </span>
                )}
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">
                  {profile.data?.plan_tier || 'Free'}
                </span>
              </div>
              <p className="text-muted-foreground text-sm mt-0.5 flex items-center gap-1">
                <Mail className="h-3 w-3" /> {profile.data?.email || '-'}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Stats Grid - Premium Style */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard 
          title="Balance" 
          value={`$${((billing.data?.balance ?? 0) / 100).toFixed(2)}`}
          hint="Available for API calls"
          icon={Coins}
          className="border-green-200 dark:border-green-900/50 bg-gradient-to-br from-green-50/50 to-transparent dark:from-green-950/10"
        />
        <StatCard 
          title="API Requests" 
          value={formatNumber(stats.data?.total_requests)}
          hint="Total requests made"
          icon={Activity}
          className="border-blue-200 dark:border-blue-900/50 bg-gradient-to-br from-blue-50/50 to-transparent dark:from-blue-950/10"
        />
        <StatCard 
          title="Total Tokens" 
          value={formatNumber(stats.data?.total_tokens)}
          hint="Input + output tokens"
          icon={Zap}
          className="border-amber-200 dark:border-amber-900/50 bg-gradient-to-br from-amber-50/50 to-transparent dark:from-amber-950/10"
        />
        <StatCard 
          title="Account Status" 
          value={profile.data?.is_active ? 'Active' : 'Inactive'}
          hint={`Tier: ${profile.data?.plan_tier || 'Free'}`}
          icon={BadgeCheck}
          className={profile.data?.is_active 
            ? "border-green-200 dark:border-green-900/50 bg-gradient-to-br from-green-50/50 to-transparent dark:from-green-950/10"
            : "border-red-200 dark:border-red-900/50 bg-gradient-to-br from-red-50/50 to-transparent dark:from-red-950/10"
          }
        />
      </div>

      {/* Quick Actions - Premium Card */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Quick Actions</CardTitle>
          <CardDescription>Get started with these common tasks</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 sm:grid-cols-3">
            <a href="/dashboard/keys" className="flex items-center gap-3 p-3 rounded-lg border hover:bg-muted/50 transition-colors">
              <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <Activity className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="font-medium text-sm">Create API Key</p>
                <p className="text-xs text-muted-foreground">Generate new credentials</p>
              </div>
            </a>
            <a href="/dashboard/billing" className="flex items-center gap-3 p-3 rounded-lg border hover:bg-muted/50 transition-colors">
              <div className="h-10 w-10 rounded-lg bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                <Coins className="h-5 w-5 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <p className="font-medium text-sm">Add Funds</p>
                <p className="text-xs text-muted-foreground">Deposit to wallet</p>
              </div>
            </a>
            <a href="/dashboard/usage" className="flex items-center gap-3 p-3 rounded-lg border hover:bg-muted/50 transition-colors">
              <div className="h-10 w-10 rounded-lg bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
                <Zap className="h-5 w-5 text-amber-600 dark:text-amber-400" />
              </div>
              <div>
                <p className="font-medium text-sm">View Usage</p>
                <p className="text-xs text-muted-foreground">Track your consumption</p>
              </div>
            </a>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
