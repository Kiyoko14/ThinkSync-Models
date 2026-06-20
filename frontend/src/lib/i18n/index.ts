"use client";

import { useMemo } from "react";

import { translations, type Language } from "@/lib/i18n/translations";
import { useSettingsStore } from "@/store/settings-store";

function getByPath(obj: unknown, path: string): string {
  const parts = path.split(".");
  let current: any = obj;
  for (const p of parts) {
    current = current?.[p];
  }
  if (typeof current === "string") {
    return current;
  }
  return path;
}

export function useI18n() {
  const language = useSettingsStore((state) => state.language);

  const t = useMemo(() => {
    return (path: string) => getByPath(translations[language], path);
  }, [language]);

  return { t, language };
}

export const languages: Array<{ code: Language; label: string }> = [
  { code: "uz", label: "O'zbek" },
  { code: "ru", label: "Русский" },
  { code: "en", label: "English" },
];
