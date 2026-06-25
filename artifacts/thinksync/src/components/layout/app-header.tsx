import { useState } from "react";
import { Link } from "wouter";
import { Menu, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Container } from "@/components/layout/container";
import { useAuthStore } from "@/store/auth-store";
import { useSettingsStore } from "@/store/settings-store";
import { tFunc } from "@/lib/i18n/translations";

export function AppHeader() {
  const token = useAuthStore((state) => state.token);
  const isAdmin = useAuthStore((state) => state.isAdmin);
  const clearSession = useAuthStore((state) => state.clearSession);
  const language = useSettingsStore((state) => state.language);
  const [open, setOpen] = useState(false);
  const t = tFunc(language);

  const links = [
    { href: "/", label: t("nav.home") },
    { href: "/models", label: t("nav.models") },
    { href: "/docs", label: t("nav.docs") },
  ];

  return (
    <header className="sticky top-0 z-40 border-b bg-background/95 backdrop-blur">
      <Container className="flex h-16 items-center justify-between">
        <div className="flex items-center gap-6">
          <Link href="/" className="font-semibold tracking-tight">{t("appName")}</Link>
          <nav className="hidden items-center gap-4 md:flex">
            {links.map((link) => (
              <Link key={link.href} href={link.href} className="text-sm text-muted-foreground hover:text-foreground">
                {link.label}
              </Link>
            ))}
          </nav>
        </div>

        <div className="hidden items-center gap-2 md:flex">
          {isAdmin && (
            <Button asChild variant="outline" size="sm">
              <Link href="/admin">{t("nav.admin")}</Link>
            </Button>
          )}
          {token ? (
            <>
              <Button asChild variant="secondary" size="sm">
                <Link href="/dashboard">{t("nav.dashboard")}</Link>
              </Button>
              <Button size="sm" variant="ghost" onClick={clearSession}>{t("nav.logout")}</Button>
            </>
          ) : (
            <>
              <Button asChild variant="ghost" size="sm">
                <Link href="/login">{t("nav.login")}</Link>
              </Button>
              <Button asChild size="sm">
                <Link href="/register">{t("nav.register")}</Link>
              </Button>
            </>
          )}
        </div>

        <Button variant="ghost" size="sm" className="md:hidden" onClick={() => setOpen((v) => !v)}>
          {open ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
        </Button>
      </Container>

      {open && (
        <div className="border-t md:hidden">
          <Container className="space-y-3 py-4">
            <nav className="grid gap-2">
              {links.map((link) => (
                <Link key={link.href} href={link.href} className="text-sm" onClick={() => setOpen(false)}>{link.label}</Link>
              ))}
              <Link href="/dashboard" className="text-sm" onClick={() => setOpen(false)}>{t("nav.dashboard")}</Link>
              {isAdmin && <Link href="/admin" className="text-sm" onClick={() => setOpen(false)}>{t("nav.admin")}</Link>}
            </nav>
            <div className="flex flex-wrap items-center gap-2">
              {!token ? (
                <>
                  <Button asChild variant="ghost" size="sm">
                    <Link href="/login">{t("nav.login")}</Link>
                  </Button>
                  <Button asChild size="sm">
                    <Link href="/register">{t("nav.register")}</Link>
                  </Button>
                </>
              ) : (
                <Button size="sm" variant="ghost" onClick={clearSession}>{t("nav.logout")}</Button>
              )}
            </div>
          </Container>
        </div>
      )}
    </header>
  );
}
