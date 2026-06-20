const API_BASE = process.env.EXPO_PUBLIC_DOMAIN
  ? `https://${process.env.EXPO_PUBLIC_DOMAIN}/api`
  : "http://localhost:8080/api";

export class ApiClientError extends Error {
  status: number;
  code?: string;
  constructor(message: string, status: number, code?: string) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

async function request<T>(path: string, init?: RequestInit, token?: string | null): Promise<T> {
  const headers = new Headers(init?.headers || {});
  headers.set("Content-Type", "application/json");
  if (token) headers.set("Authorization", `Bearer ${token}`);

  const response = await fetch(`${API_BASE}${path}`, { ...init, headers });

  if (!response.ok) {
    const body = (await response.json().catch(() => ({}))) as any;
    const message = body.error?.message || `HTTP ${response.status}`;
    throw new ApiClientError(message, response.status, body.error?.code);
  }
  if (response.status === 204) return {} as T;
  return (await response.json()) as T;
}

export interface Profile {
  id: string;
  email: string;
  display_name?: string | null;
  plan_tier: string;
  is_active: boolean;
  total_spent: number;
  created_at?: string | null;
}

export interface ModelItem {
  id: string;
  owned_by: string;
  active: boolean;
  context_window: number;
  max_output_tokens: number;
  pricing_input_per_m: number;
  pricing_output_per_m: number;
}

export interface PackageItem {
  id: string;
  name: string;
  description?: string | null;
  token_amount: number;
  bonus_tokens: number;
  price_usd_cents: number;
  display_price: string;
  is_featured: boolean;
  sort_order: number;
  status: string;
}

export interface UserStats {
  total_requests: number;
  total_tokens: number;
  total_cost: number;
}

export interface BalanceResponse {
  balance: number;
  active_package_tokens: number;
  total_available: number;
}

export interface UsageExtendedResponse {
  total_requests: number;
  total_tokens: number;
  total_cost_usd: number;
  total_billed_from_balance: number;
  total_billed_from_packages: number;
}

export interface TransactionItem {
  id: string;
  amount: number;
  balance_after: number;
  transaction_type: string;
  status: string;
  description?: string | null;
  created_at?: string | null;
}

export interface ApiKeyItem {
  id: string;
  key_prefix: string;
  name: string;
  status: string;
  created_at?: string | null;
  last_used_at?: string | null;
  expires_at?: string | null;
}

export interface ApiKeyCreateResponse {
  id: string;
  key_prefix: string;
  name: string;
  raw_key: string;
  status: string;
}

export const apiClient = {
  login: (email: string, password: string) =>
    request<{ token: string; profile: Profile }>("/v1/auth/login", { method: "POST", body: JSON.stringify({ email, password }) }),
  register: (email: string, password: string, displayName?: string) =>
    request<{ token: string; profile: Profile }>("/v1/auth/register", { method: "POST", body: JSON.stringify({ email, password, display_name: displayName }) }),
  health: () => request<{ status: string }>("/healthz"),
  listModels: () => request<{ data: ModelItem[] }>("/v1/models").then(r => r.data),
  listPackages: () => request<{ data: PackageItem[] }>("/v1/packages").then(r => r.data),
  getProfile: (token: string) => request<Profile>("/v1/user/profile", undefined, token),
  getStats: (token: string) => request<UserStats>("/v1/user/stats", undefined, token),
  getBalance: (token: string) => request<BalanceResponse>("/v1/user/balance", undefined, token),
  getUsage: (token: string) => request<UsageExtendedResponse>("/v1/user/usage", undefined, token),
  getTransactions: (token: string) => request<{ data: TransactionItem[] }>("/v1/user/transactions", undefined, token).then(r => r.data),
  getApiKeys: (token: string) => request<{ data: ApiKeyItem[] }>("/v1/user/tokens", undefined, token).then(r => r.data),
  generateApiKey: (token: string, name: string) =>
    request<ApiKeyCreateResponse>("/v1/user/tokens/generate", { method: "POST", body: JSON.stringify({ name }) }, token),
  revokeApiKey: (token: string, keyId: string) =>
    request<{ id: string; status: string }>(`/v1/user/tokens/${keyId}/revoke`, { method: "POST" }, token),
};
