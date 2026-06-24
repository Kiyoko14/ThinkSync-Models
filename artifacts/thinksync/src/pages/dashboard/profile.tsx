import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useProfileQuery } from "@/lib/api/hooks";
import { 
  User, 
  Mail, 
  Calendar, 
  Shield, 
  BadgeCheck, 
  AlertCircle, 
  Loader2,
  Settings,
  Key,
  CreditCard,
  ExternalLink
} from "lucide-react";

export default function DashboardProfilePage() {
  const { data, isLoading, error } = useProfileQuery();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4">
        <AlertCircle className="h-12 w-12 text-destructive" />
        <p className="text-destructive">{(error as Error).message}</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Profile</h1>
        <p className="text-muted-foreground mt-1">Manage your account details and preferences.</p>
      </div>

      {/* Profile Card */}
      <Card className="border-primary/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            Account Information
          </CardTitle>
          <CardDescription>Your ThinkSync account details</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-6">
            {/* Avatar */}
            <div className="flex flex-col items-center gap-3">
              <div className="h-24 w-24 rounded-full bg-primary/10 flex items-center justify-center">
                <span className="text-3xl font-bold text-primary">
                  {(data?.display_name || data?.email || 'U')[0].toUpperCase()}
                </span>
              </div>
              <div className="flex items-center gap-2">
                {data?.is_active ? (
                  <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
                    <BadgeCheck className="h-4 w-4" /> Active
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400">
                    <AlertCircle className="h-4 w-4" /> Inactive
                  </span>
                )}
              </div>
            </div>

            {/* Details */}
            <div className="flex-1 grid gap-4 sm:grid-cols-2">
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground flex items-center gap-2">
                  <Mail className="h-4 w-4" /> Email
                </p>
                <p className="font-medium">{data?.email}</p>
              </div>
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground flex items-center gap-2">
                  <User className="h-4 w-4" /> Display Name
                </p>
                <p className="font-medium">{data?.display_name || '-'}</p>
              </div>
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground flex items-center gap-2">
                  <Shield className="h-4 w-4" /> Plan
                </p>
                <p className="font-medium">{data?.plan_tier || 'Free'}</p>
              </div>
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground flex items-center gap-2">
                  <Calendar className="h-4 w-4" /> Account ID
                </p>
                <p className="font-mono text-sm">{data?.id}</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Quick Links */}
      <div className="grid gap-4 sm:grid-cols-3">
        <a href="/dashboard/keys" className="flex items-center gap-3 p-4 rounded-lg border hover:bg-muted/50 transition-colors">
          <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
            <Key className="h-5 w-5 text-primary" />
          </div>
          <div>
            <p className="font-medium text-sm">API Keys</p>
            <p className="text-xs text-muted-foreground">Manage credentials</p>
          </div>
          <ExternalLink className="h-4 w-4 ml-auto text-muted-foreground" />
        </a>
        <a href="/dashboard/billing" className="flex items-center gap-3 p-4 rounded-lg border hover:bg-muted/50 transition-colors">
          <div className="h-10 w-10 rounded-lg bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
            <CreditCard className="h-5 w-5 text-green-600 dark:text-green-400" />
          </div>
          <div>
            <p className="font-medium text-sm">Billing</p>
            <p className="text-xs text-muted-foreground">Add funds</p>
          </div>
          <ExternalLink className="h-4 w-4 ml-auto text-muted-foreground" />
        </a>
        <a href="/dashboard" className="flex items-center gap-3 p-4 rounded-lg border hover:bg-muted/50 transition-colors">
          <div className="h-10 w-10 rounded-lg bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
            <Settings className="h-5 w-5 text-amber-600 dark:text-amber-400" />
          </div>
          <div>
            <p className="font-medium text-sm">Settings</p>
            <p className="text-xs text-muted-foreground">Account settings</p>
          </div>
          <ExternalLink className="h-4 w-4 ml-auto text-muted-foreground" />
        </a>
      </div>

      {/* Danger Zone */}
      <Card className="border-destructive/20">
        <CardHeader>
          <CardTitle className="text-destructive flex items-center gap-2">
            <AlertCircle className="h-5 w-5" />
            Danger Zone
          </CardTitle>
          <CardDescription>Irreversible account actions</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 rounded-lg border border-destructive/20">
              <div>
                <p className="font-medium text-sm">Delete Account</p>
                <p className="text-xs text-muted-foreground">Permanently delete your account and all data</p>
              </div>
              <button className="px-3 py-1.5 text-sm font-medium text-destructive border border-destructive rounded-md hover:bg-destructive hover:text-destructive-foreground transition-colors">
                Delete
              </button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
