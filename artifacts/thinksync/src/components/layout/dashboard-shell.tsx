import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { LayoutDashboard, User, BarChart3, CreditCard, Key, Menu, X } from "lucide-react";
import { useState } from "react";

const items = [
  { href: "/dashboard", label: "Overview", icon: LayoutDashboard },
  { href: "/dashboard/profile", label: "Profile", icon: User },
  { href: "/dashboard/usage", label: "Usage", icon: BarChart3 },
  { href: "/dashboard/billing", label: "Billing", icon: CreditCard },
  { href: "/dashboard/keys", label: "API Keys", icon: Key },
];

export function DashboardShell({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <div className="min-h-screen">
      {/* Mobile Header */}
      <header className="lg:hidden sticky top-0 z-50 bg-background border-b px-4 py-3 flex items-center justify-between">
        <span className="font-semibold">ThinkSync</span>
        <Button variant="ghost" size="sm" onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
          {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </Button>
      </header>

      {/* Mobile Navigation Menu */}
      {mobileMenuOpen && (
        <div className="lg:hidden fixed inset-0 top-[57px] z-40 bg-background/95 backdrop-blur-sm">
          <nav className="grid gap-1 p-4">
            {items.map((item) => {
              const Icon = item.icon;
              return (
                <Button 
                  key={item.href} 
                  asChild 
                  variant={location === item.href ? "secondary" : "ghost"} 
                  className={cn("justify-start gap-3", location === item.href && "bg-muted")}
                  onClick={() => setMobileMenuOpen(false)}
                >
                  <Link href={item.href}>
                    <Icon className="h-5 w-5" /> {item.label}
                  </Link>
                </Button>
              );
            })}
          </nav>
        </div>
      )}

      <div className="flex">
        {/* Desktop Sidebar - Hidden on mobile */}
        <aside className="hidden lg:block w-60 fixed inset-y-0 left-0 z-30 border-r bg-background pt-20">
          <nav className="grid gap-1 p-3">
            {items.map((item) => {
              const Icon = item.icon;
              return (
                <Button 
                  key={item.href} 
                  asChild 
                  variant={location === item.href ? "secondary" : "ghost"} 
                  className={cn("justify-start gap-3", location === item.href && "bg-muted")}
                >
                  <Link href={item.href}>
                    <Icon className="h-5 w-5" /> {item.label}
                  </Link>
                </Button>
              );
            })}
          </nav>
        </aside>

        {/* Main Content */}
        <main className="flex-1 lg:ml-60 min-w-0">
          <div className="p-4 lg:p-8">{children}</div>
        </main>
      </div>
    </div>
  );
}
