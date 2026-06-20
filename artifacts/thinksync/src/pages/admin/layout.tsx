import { Container } from "@/components/layout/container";
import { AdminShell } from "@/components/layout/admin-shell";
import { AdminGuard } from "@/components/common/admin-guard";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <AdminGuard>
      <Container className="py-8">
        <AdminShell>{children}</AdminShell>
      </Container>
    </AdminGuard>
  );
}
