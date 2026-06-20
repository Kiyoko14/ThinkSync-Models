"use client";

import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

import type { Language } from "@/lib/i18n/translations";

interface SettingsState {
  language: Language;
  apiBaseUrl: string;
  setLanguage: (language: Language) => void;
  setApiBaseUrl: (url: string) => void;
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      language: "uz",
      apiBaseUrl: process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000",
      setLanguage: (language) => set({ language }),
      setApiBaseUrl: (apiBaseUrl) => set({ apiBaseUrl: apiBaseUrl.replace(/\/$/, "") }),
    }),
    {
      name: "thinksync-settings",
      storage: createJSONStorage(() => localStorage),
    },
  ),
);
