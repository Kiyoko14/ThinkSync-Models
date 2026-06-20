import { createUser, clearUsers } from "../services/user";
import { createApiKey, clearApiKeys } from "../services/api-key";
import { hashPassword } from "./password";
import { generateApiKey, hashApiKey, prefixApiKey } from "./api-key";
import { generateToken } from "../middlewares/auth";

export async function createTestUser(
  email: string,
  password: string,
  overrides?: {
    display_name?: string;
    role?: string;
    plan_tier?: string;
    is_active?: boolean;
  }
): Promise<{ user: ReturnType<typeof createUser>; rawPassword: string }> {
  const user = createUser({
    email,
    password_hash: await hashPassword(password),
    display_name: overrides?.display_name || "Test User",
    plan_tier: overrides?.plan_tier || "free",
    role: overrides?.role || "user",
    is_active: overrides?.is_active ?? true,
    total_spent: 0,
    balance: 0,
    rate_limit_rpm: 60,
    rate_limit_tpm: 10000,
  });
  return { user, rawPassword: password };
}

export function createTestApiKey(userId: string, name?: string): { key: ReturnType<typeof createApiKey>; rawKey: string } {
  const rawKey = generateApiKey();
  const key = createApiKey({
    profile_id: userId,
    key_prefix: prefixApiKey(rawKey),
    key_hash: hashApiKey(rawKey),
    name: name || "Test Key",
    status: "active",
  });
  return { key, rawKey };
}

export function getJwtToken(userId: string, email: string, role: string): string {
  return generateToken(userId, email, role);
}

export function cleanup(): void {
  clearUsers();
  clearApiKeys();
}
