"use client";

import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

import type { Profile } from "@/lib/types";

interface AuthState {
  token: string | null;
  profile: Profile | null;
  setSession: (token: string, profile: Profile) => void;
  clearSession: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      token: null,
      profile: null,
      setSession: (token, profile) => set({ token, profile }),
      clearSession: () => set({ token: null, profile: null }),
    }),
    {
      name: "thinksync-auth",
      storage: createJSONStorage(() => localStorage),
    },
  ),
);
