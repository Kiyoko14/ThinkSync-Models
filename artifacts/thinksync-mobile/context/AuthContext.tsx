import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { createContext, useContext, useEffect, useState } from "react";

import { apiClient, type Profile } from "@/lib/api";

interface AuthContextType {
  token: string | null;
  profile: Profile | null;
  isLoading: boolean;
  isAdmin: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, displayName?: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

const TOKEN_KEY = "thinksync_token";
const PROFILE_KEY = "thinksync_profile";

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [token, setToken] = useState<string | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    AsyncStorage.multiGet([TOKEN_KEY, PROFILE_KEY]).then(([tokenRes, profileRes]) => {
      const savedToken = tokenRes[1];
      const savedProfile = profileRes[1];
      if (savedToken) setToken(savedToken);
      if (savedProfile) {
        try {
          setProfile(JSON.parse(savedProfile));
        } catch {}
      }
      setIsLoading(false);
    });
  }, []);

  const login = async (email: string, password: string) => {
    const { token, profile } = await apiClient.login(email, password);
    await AsyncStorage.setItem(TOKEN_KEY, token);
    await AsyncStorage.setItem(PROFILE_KEY, JSON.stringify(profile));
    setToken(token);
    setProfile(profile);
  };

  const register = async (email: string, password: string, displayName?: string) => {
    const { token, profile } = await apiClient.register(email, password, displayName);
    await AsyncStorage.setItem(TOKEN_KEY, token);
    await AsyncStorage.setItem(PROFILE_KEY, JSON.stringify(profile));
    setToken(token);
    setProfile(profile);
  };

  const logout = async () => {
    await AsyncStorage.multiRemove([TOKEN_KEY, PROFILE_KEY]);
    setToken(null);
    setProfile(null);
  };

  const isAdmin = (profile?.email || "").toLowerCase() === "admin@thinksync.ai";

  return (
    <AuthContext.Provider value={{ token, profile, isLoading, isAdmin, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
