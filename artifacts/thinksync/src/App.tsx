import { lazy, Suspense } from "react";
import { Switch, Route, Router as WouterRouter } from "wouter";

import { ThemeProvider } from "@/providers/theme-provider";
import { QueryProvider } from "@/providers/query-provider";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AppHeader } from "@/components/layout/app-header";
import { AppFooter } from "@/components/layout/app-footer";
import { ThemeToggle } from "@/components/common/theme-toggle";

const HomePage = lazy(() => import("@/pages/home"));
const ModelsPage = lazy(() => import("@/pages/models"));
const PricingPage = lazy(() => import("@/pages/pricing"));
const DocsPage = lazy(() => import("@/pages/docs"));
const LoginPage = lazy(() => import("@/pages/login"));
const RegisterPage = lazy(() => import("@/pages/register"));

const DashboardLayout = lazy(() => import("@/pages/dashboard/layout"));
const DashboardOverview = lazy(() => import("@/pages/dashboard/overview"));
const DashboardProfile = lazy(() => import("@/pages/dashboard/profile"));
const DashboardUsage = lazy(() => import("@/pages/dashboard/usage"));
const DashboardBilling = lazy(() => import("@/pages/dashboard/billing"));
const DashboardKeys = lazy(() => import("@/pages/dashboard/keys"));

const AdminLayout = lazy(() => import("@/pages/admin/layout"));
const AdminOverview = lazy(() => import("@/pages/admin/overview"));
const AdminModels = lazy(() => import("@/pages/admin/models"));
const AdminUsers = lazy(() => import("@/pages/admin/users"));
const AdminTransactions = lazy(() => import("@/pages/admin/transactions"));
const AdminPackages = lazy(() => import("@/pages/admin/packages"));
const AdminPromocodes = lazy(() => import("@/pages/admin/promocodes"));
const AdminLogs = lazy(() => import("@/pages/admin/logs"));

const NotFound = lazy(() => import("@/pages/not-found"));

function PageShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col">
      <AppHeader />
      <main className="flex-1">{children}</main>
      <AppFooter />
    </div>
  );
}

function Router() {
  return (
    <Switch>
      {/* Public */}
      <Route path="/" component={() => <PageShell><HomePage /></PageShell>} />
      <Route path="/models" component={() => <PageShell><ModelsPage /></PageShell>} />
      <Route path="/pricing" component={() => <PageShell><PricingPage /></PageShell>} />
      <Route path="/docs" component={() => <PageShell><DocsPage /></PageShell>} />
      <Route path="/login" component={() => <PageShell><LoginPage /></PageShell>} />
      <Route path="/register" component={() => <PageShell><RegisterPage /></PageShell>} />

      {/* Dashboard */}
      <Route path="/dashboard" component={() => <DashboardLayout><DashboardOverview /></DashboardLayout>} />
      <Route path="/dashboard/profile" component={() => <DashboardLayout><DashboardProfile /></DashboardLayout>} />
      <Route path="/dashboard/usage" component={() => <DashboardLayout><DashboardUsage /></DashboardLayout>} />
      <Route path="/dashboard/billing" component={() => <DashboardLayout><DashboardBilling /></DashboardLayout>} />
      <Route path="/dashboard/keys" component={() => <DashboardLayout><DashboardKeys /></DashboardLayout>} />

      {/* Admin */}
      <Route path="/admin" component={() => <AdminLayout><AdminOverview /></AdminLayout>} />
      <Route path="/admin/models" component={() => <AdminLayout><AdminModels /></AdminLayout>} />
      <Route path="/admin/users" component={() => <AdminLayout><AdminUsers /></AdminLayout>} />
      <Route path="/admin/transactions" component={() => <AdminLayout><AdminTransactions /></AdminLayout>} />
      <Route path="/admin/packages" component={() => <AdminLayout><AdminPackages /></AdminLayout>} />
      <Route path="/admin/promocodes" component={() => <AdminLayout><AdminPromocodes /></AdminLayout>} />
      <Route path="/admin/logs" component={() => <AdminLayout><AdminLogs /></AdminLayout>} />

      {/* Not found */}
      <Route component={() => <PageShell><NotFound /></PageShell>} />
    </Switch>
  );
}

function App() {
  return (
    <QueryProvider>
      <ThemeProvider>
        <TooltipProvider>
          <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
            <Suspense fallback={
              <div className="flex min-h-screen items-center justify-center">
                <div className="animate-pulse text-sm text-muted-foreground">Loading...</div>
              </div>
            }>
              <Router />
            </Suspense>
          </WouterRouter>
          <Toaster />
          <div className="fixed bottom-4 right-4 z-50">
            <ThemeToggle />
          </div>
        </TooltipProvider>
      </ThemeProvider>
    </QueryProvider>
  );
}

export default App;
