import { Link, useLocation } from "wouter";
import { BarChart3, Box, FileText, Gift, LayoutDashboard, Package, Users, Tag } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const items = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard },
  { href: "/admin/models", label: "Models", icon: Box },
  { href: "/admin/users", label: "Users", icon: Users },
  { href: "/admin/transactions", label: "Transactions", icon: FileText },
  { href: "/admin/packages", label: "Packages", icon: Package },
  { href: "/admin/promocodes", label: "Promocodes", icon: Tag },
  { href: "/admin/logs", label: "Audit Logs", icon: BarChart3 },
];

export function AdminShell({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();

  return (
    <div className="grid gap-6 lg:grid-cols-[260px_1fr]">
      <aside className="rounded-lg border p-3">
        <nav className="grid gap-1">
          {items.map((item) => {
            const Icon = item.icon;
            return (
              <Button key={item.href} asChild variant={location === item.href ? "secondary" : "ghost"} className={cn("justify-start gap-2")}>
                <Link href={item.href}>
                  <Icon className="h-4 w-4" />
                  {item.label}
                </Link>
              </Button>
            );
          })}
        </nav>
      </aside>
      <section className="min-w-0">{children}</section>
    </div>
  );
}
