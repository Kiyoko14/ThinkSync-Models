import { create } from "zustand";
import { persist } from "zustand/middleware";

import type { Profile } from "@/lib/types";

interface AuthState {
  token: string | null;
  profile: Profile | null;
  isAdmin: boolean;
  setSession: (token: string, profile: Profile) => void;
  clearSession: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      token: null,
      profile: null,
      isAdmin: false,
      setSession: (token, profile) =>
        set({
          token,
          profile,
          isAdmin: (profile.email || "").toLowerCase() === "admin@thinksync.ai",
        }),
      clearSession: () => set({ token: null, profile: null, isAdmin: false }),
    }),
    { name: "thinksync-auth" }
  )
);
