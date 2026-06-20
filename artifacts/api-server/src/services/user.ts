import { randomUUID } from "crypto";

export interface User {
  id: string;
  email: string;
  password_hash: string;
  display_name?: string | null;
  plan_tier: string;
  role: string;
  is_active: boolean;
  total_spent: number;
  balance: number;
  created_at: string;
  updated_at: string;
  rate_limit_rpm: number;
  rate_limit_tpm: number;
}

const users = new Map<string, User>();

export function createUser(user: Omit<User, "id" | "created_at" | "updated_at"> & { id?: string }): User {
  const now = new Date().toISOString();
  const u: User = {
    id: user.id || randomUUID(),
    email: user.email,
    password_hash: user.password_hash,
    display_name: user.display_name || null,
    plan_tier: user.plan_tier,
    role: user.role,
    is_active: user.is_active,
    total_spent: user.total_spent,
    balance: user.balance,
    created_at: now,
    updated_at: now,
    rate_limit_rpm: user.rate_limit_rpm,
    rate_limit_tpm: user.rate_limit_tpm,
  };
  users.set(u.id, u);
  return u;
}

export function getUserById(id: string): User | undefined {
  return users.get(id);
}

export function getUserByEmail(email: string): User | undefined {
  return [...users.values()].find((u) => u.email === email);
}

export function updateUser(id: string, patch: Partial<User>): User | undefined {
  const user = users.get(id);
  if (!user) return undefined;
  Object.assign(user, patch, { updated_at: new Date().toISOString() });
  users.set(id, user);
  return user;
}

export function listUsers(): User[] {
  return [...users.values()];
}

export function clearUsers(): void {
  users.clear();
}
