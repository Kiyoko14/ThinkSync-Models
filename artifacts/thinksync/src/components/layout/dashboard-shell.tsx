import { Link, useLocation } from "wouter";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const items = [
  { href: "/dashboard", label: "Overview" },
  { href: "/dashboard/profile", label: "Profile" },
  { href: "/dashboard/usage", label: "Usage" },
  { href: "/dashboard/billing", label: "Billing" },
  { href: "/dashboard/keys", label: "API Keys" },
];

export function DashboardShell({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();

  return (
    <div className="grid gap-6 lg:grid-cols-[240px_1fr]">
      <aside className="rounded-lg border p-3">
        <nav className="grid gap-1">
          {items.map((item) => (
            <Button key={item.href} asChild variant={location === item.href ? "secondary" : "ghost"} className={cn("justify-start")}>
              <Link href={item.href}>{item.label}</Link>
            </Button>
          ))}
        </nav>
      </aside>
      <section className="min-w-0">{children}</section>
    </div>
  );
}
