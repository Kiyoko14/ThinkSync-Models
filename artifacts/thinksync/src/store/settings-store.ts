import { create } from "zustand";
import { persist } from "zustand/middleware";

export type Language = "uz" | "ru" | "en";

interface SettingsState {
  language: Language;
  apiBaseUrl: string;
  setLanguage: (language: Language) => void;
  setApiBaseUrl: (url: string) => void;
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      language: "en",
      apiBaseUrl: import.meta.env.VITE_API_BASE_URL || "http://localhost:8000",
      setLanguage: (language) => set({ language }),
      setApiBaseUrl: (apiBaseUrl) => set({ apiBaseUrl: apiBaseUrl.replace(/\/$/, "") }),
    }),
    { name: "thinksync-settings" }
  )
);
