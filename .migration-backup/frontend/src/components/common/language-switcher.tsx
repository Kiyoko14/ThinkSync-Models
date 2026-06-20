"use client";

import { Globe } from "lucide-react";

import { languages } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import { useSettingsStore } from "@/store/settings-store";

export function LanguageSwitcher() {
  const language = useSettingsStore((state) => state.language);
  const setLanguage = useSettingsStore((state) => state.setLanguage);

  return (
    <div className="flex items-center gap-1 rounded-md border p-1">
      <Globe className="ml-1 h-4 w-4 text-muted-foreground" />
      {languages.map((item) => (
        <Button
          key={item.code}
          size="sm"
          variant={language === item.code ? "secondary" : "ghost"}
          onClick={() => setLanguage(item.code)}
        >
          {item.code.toUpperCase()}
        </Button>
      ))}
    </div>
  );
}
