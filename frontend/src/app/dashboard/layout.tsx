import { Container } from "@/components/layout/container";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { AuthGuard } from "@/components/common/auth-guard";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthGuard>
      <Container className="py-8">
        <DashboardShell>{children}</DashboardShell>
      </Container>
    </AuthGuard>
  );
}
