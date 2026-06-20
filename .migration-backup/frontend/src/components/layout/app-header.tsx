"use client";

import Link from "next/link";
import { Menu, X } from "lucide-react";
import { useState } from "react";

import { LanguageSwitcher } from "@/components/common/language-switcher";
import { ThemeToggle } from "@/components/common/theme-toggle";
import { Container } from "@/components/layout/container";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/lib/i18n";
import { useAuthStore } from "@/store/auth-store";

export function AppHeader() {
  const { t } = useI18n();
  const token = useAuthStore((state) => state.token);
  const clearSession = useAuthStore((state) => state.clearSession);
  const [open, setOpen] = useState(false);

  const links = [
    { href: "/", label: t("nav.home") },
    { href: "/models", label: t("nav.models") },
    { href: "/pricing", label: t("nav.pricing") },
    { href: "/docs", label: t("nav.docs") },
  ];

  return (
    <header className="sticky top-0 z-40 border-b bg-background/95 backdrop-blur">
      <Container className="flex h-16 items-center justify-between">
        <div className="flex items-center gap-6">
          <Link href="/" className="font-semibold tracking-tight">
            {t("appName")}
          </Link>
          <nav className="hidden items-center gap-4 md:flex">
            {links.map((link) => (
              <Link key={link.href} href={link.href} className="text-sm text-muted-foreground hover:text-foreground">
                {link.label}
              </Link>
            ))}
          </nav>
        </div>

        <div className="hidden items-center gap-2 md:flex">
          <LanguageSwitcher />
          <ThemeToggle />
          {token ? (
            <>
              <Button asChild variant="secondary" size="sm">
                <Link href="/dashboard">{t("nav.dashboard")}</Link>
              </Button>
              <Button size="sm" variant="ghost" onClick={clearSession}>
                {t("nav.logout")}
              </Button>
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

      {open ? (
        <div className="border-t md:hidden">
          <Container className="space-y-3 py-4">
            <nav className="grid gap-2">
              {links.map((link) => (
                <Link key={link.href} href={link.href} className="text-sm" onClick={() => setOpen(false)}>
                  {link.label}
                </Link>
              ))}
              <Link href="/dashboard" className="text-sm" onClick={() => setOpen(false)}>
                {t("nav.dashboard")}
              </Link>
            </nav>
            <div className="flex flex-wrap items-center gap-2">
              <LanguageSwitcher />
              <ThemeToggle />
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
                <Button size="sm" variant="ghost" onClick={clearSession}>
                  {t("nav.logout")}
                </Button>
              )}
            </div>
          </Container>
        </div>
      ) : null}
    </header>
  );
}
