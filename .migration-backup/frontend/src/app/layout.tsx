import type { Metadata } from "next";

import "./globals.css";

import { AppFooter } from "@/components/layout/app-footer";
import { AppHeader } from "@/components/layout/app-header";
import { AppProvider } from "@/providers/app-provider";

export const metadata: Metadata = {
  title: "ThinkSync Models",
  description: "AI API gateway frontend for ThinkSync Models",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="uz" suppressHydrationWarning>
      <body className="font-sans">
        <AppProvider>
          <div className="flex min-h-screen flex-col">
            <AppHeader />
            <main className="flex-1">{children}</main>
            <AppFooter />
          </div>
        </AppProvider>
      </body>
    </html>
  );
}
