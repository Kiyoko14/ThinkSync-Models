import { create } from "zustand";
import { persist } from "zustand/middleware";

export type Language = "uz" | "ru" | "en";

export const API_BASE_URL = "https://api.thinksync.art";

interface SettingsState {
  language: Language;
  setLanguage: (language: Language) => void;
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      language: "en",
      setLanguage: (language) => set({ language }),
    }),
    { name: "thinksync-settings" }
  )
);
