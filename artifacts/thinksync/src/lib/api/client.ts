import type {
  AdminAnalytics, AdminApiLog, AdminModel, AdminPackage, AdminPromocode, AdminTransaction, AdminUser,
  ApiErrorShape, ApiKeyCreateResponse, ApiKeyItem, BalanceResponse, ModelItem, ModelListResponse,
  PackageItem, PackageListResponse, Paginated, Profile, TransactionItem, UsageExtendedResponse, UserStats,
} from "@/lib/types";

export const API_BASE_URL = "https://api.thinksync.art";

function getApiBaseUrl(): string {
  if (typeof window === "undefined") return API_BASE_URL;
  const hostname = window.location.hostname;

  // Local development
  if (hostname === "localhost" || hostname === "127.0.0.1") {
    return "http://localhost:8080/api";
  }

  // Replit environment (domain contains .replit)
  if (hostname.includes(".replit")) {
    return `${window.location.protocol}//${hostname}:8080/api`;
  }

  // Production
  return API_BASE_URL;
}

export class ApiClientError extends Error {
  status: number;
  code?: string;
  detail?: string;

  constructor(message: string, status: number, code?: string, detail?: string) {
    super(message);
    this.name = "ApiClientError";
    this.status = status;
    this.code = code;
    this.detail = detail;
  }
}

function buildQuery(params: Record<string, string | number | boolean | null | undefined>) {
  const search = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined || value === null || value === "") return;
    search.set(key, String(value));
  });
  const serialized = search.toString();
  return serialized ? `?${serialized}` : "";
}

export class ApiClient {
  private readonly baseUrl: string;

  constructor(baseUrl?: string) {
    this.baseUrl = (baseUrl || getApiBaseUrl()).replace(/\/$/, "");
  }

  private async request<T>(path: string, init?: RequestInit, token?: string | null): Promise<T> {
    const headers = new Headers(init?.headers || {});
    headers.set("Content-Type", "application/json");
    if (token) headers.set("Authorization", `Bearer ${token}`);

    const response = await fetch(`${this.baseUrl}${path}`, { ...init, headers, cache: "no-store" });

    if (!response.ok) {
      const body = (await response.json().catch(() => ({}))) as ApiErrorShape;
      const message = body.error?.message || `HTTP ${response.status}`;
      throw new ApiClientError(message, response.status, body.error?.code, body.error?.detail);
    }
    if (response.status === 204) return {} as T;
    return (await response.json()) as T;
  }

  async login(email: string, password: string): Promise<{ token: string; profile: Profile }> {
    return this.request("/v1/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    });
  }

  async register(email: string, password: string, displayName?: string): Promise<{ token: string; profile: Profile }> {
    return this.request("/v1/auth/register", {
      method: "POST",
      body: JSON.stringify({ email, password, display_name: displayName }),
    });
  }

  async health() {
    return this.request<{ status: string; database: string; redis: string; provider: string }>("/health");
  }

  async listModels(): Promise<ModelItem[]> {
    const data = await this.request<ModelListResponse>("/v1/models");
    return data.data;
  }

  async getModel(id: string): Promise<ModelItem> {
    return this.request<ModelItem>(`/v1/models/${id}`);
  }

  async listPackages(): Promise<PackageItem[]> {
    const data = await this.request<PackageListResponse>("/v1/packages");
    return data.data;
  }

  async getProfile(token: string): Promise<Profile> {
    return this.request<Profile>("/v1/user/profile", undefined, token);
  }

  async getStats(token: string): Promise<UserStats> {
    return this.request<UserStats>("/v1/user/stats", undefined, token);
  }

  async getBalance(token: string): Promise<BalanceResponse> {
    return this.request<BalanceResponse>("/v1/user/balance", undefined, token);
  }

  async getUsage(token: string): Promise<UsageExtendedResponse> {
    return this.request<UsageExtendedResponse>("/v1/user/usage", undefined, token);
  }

  async getTransactions(token: string): Promise<TransactionItem[]> {
    return this.request<TransactionItem[]>("/v1/user/transactions", undefined, token);
  }

  async getApiKeys(token: string): Promise<ApiKeyItem[]> {
    return this.request<ApiKeyItem[]>("/v1/user/tokens", undefined, token);
  }

  async generateApiKey(token: string, name: string, expiresInDays?: number): Promise<ApiKeyCreateResponse> {
    return this.request<ApiKeyCreateResponse>("/v1/user/tokens/generate", {
      method: "POST",
      body: JSON.stringify({ name, expires_in_days: expiresInDays ?? null }),
    }, token);
  }

  async revokeApiKey(token: string, keyId: string): Promise<{ id: string; status: string }> {
    return this.request<{ id: string; status: string }>(`/v1/user/tokens/${keyId}/revoke`, { method: "POST" }, token);
  }

  async rotateApiKey(token: string, keyId: string): Promise<ApiKeyCreateResponse> {
    return this.request<ApiKeyCreateResponse>(`/v1/user/tokens/${keyId}/rotate`, { method: "POST" }, token);
  }

  async getAdminAnalytics(token: string): Promise<AdminAnalytics> {
    return this.request<AdminAnalytics>("/v1/admin/analytics", undefined, token);
  }

  async listAdminModels(token: string, params: { page: number; pageSize: number; search?: string; isActive?: string }): Promise<Paginated<AdminModel>> {
    const query = buildQuery({ page: params.page, page_size: params.pageSize, search: params.search, is_active: params.isActive === "all" ? undefined : params.isActive });
    return this.request<Paginated<AdminModel>>(`/v1/admin/models${query}`, undefined, token);
  }

  async createAdminModel(token: string, payload: Omit<AdminModel, "id" | "created_at" | "updated_at">): Promise<AdminModel> {
    return this.request<AdminModel>("/v1/admin/models", { method: "POST", body: JSON.stringify(payload) }, token);
  }

  async updateAdminModel(token: string, id: string, payload: Partial<AdminModel>): Promise<AdminModel> {
    return this.request<AdminModel>(`/v1/admin/models/${id}`, { method: "PATCH", body: JSON.stringify(payload) }, token);
  }

  async listAdminUsers(token: string, params: { page: number; pageSize: number; search?: string; planTier?: string; isActive?: string }): Promise<Paginated<AdminUser>> {
    const query = buildQuery({ page: params.page, page_size: params.pageSize, search: params.search, plan_tier: params.planTier === "all" ? undefined : params.planTier, is_active: params.isActive === "all" ? undefined : params.isActive });
    return this.request<Paginated<AdminUser>>(`/v1/admin/users${query}`, undefined, token);
  }

  async updateAdminUser(token: string, id: string, payload: Partial<AdminUser>): Promise<AdminUser> {
    return this.request<AdminUser>(`/v1/admin/users/${id}`, { method: "PATCH", body: JSON.stringify(payload) }, token);
  }

  async listAdminTransactions(token: string, params: { page: number; pageSize: number; profileId?: string; transactionType?: string; status?: string }): Promise<Paginated<AdminTransaction>> {
    const query = buildQuery({ page: params.page, page_size: params.pageSize, profile_id: params.profileId, transaction_type: params.transactionType, status: params.status });
    return this.request<Paginated<AdminTransaction>>(`/v1/admin/transactions${query}`, undefined, token);
  }

  async listAdminPackages(token: string, params: { page: number; pageSize: number; search?: string; status?: string }): Promise<Paginated<AdminPackage>> {
    const query = buildQuery({ page: params.page, page_size: params.pageSize, search: params.search, status: params.status === "all" ? undefined : params.status });
    return this.request<Paginated<AdminPackage>>(`/v1/admin/packages${query}`, undefined, token);
  }

  async createAdminPackage(token: string, payload: Omit<AdminPackage, "id" | "created_at" | "updated_at">): Promise<AdminPackage> {
    return this.request<AdminPackage>("/v1/admin/packages", { method: "POST", body: JSON.stringify(payload) }, token);
  }

  async updateAdminPackage(token: string, id: string, payload: Partial<AdminPackage>): Promise<AdminPackage> {
    return this.request<AdminPackage>(`/v1/admin/packages/${id}`, { method: "PATCH", body: JSON.stringify(payload) }, token);
  }

  async listAdminPromocodes(token: string, params: { page: number; pageSize: number; search?: string; isActive?: string }): Promise<Paginated<AdminPromocode>> {
    const query = buildQuery({ page: params.page, page_size: params.pageSize, search: params.search, is_active: params.isActive === "all" ? undefined : params.isActive });
    return this.request<Paginated<AdminPromocode>>(`/v1/admin/promocodes${query}`, undefined, token);
  }

  async createAdminPromocode(token: string, payload: Omit<AdminPromocode, "id" | "current_uses" | "created_at" | "updated_at">): Promise<AdminPromocode> {
    return this.request<AdminPromocode>("/v1/admin/promocodes", { method: "POST", body: JSON.stringify(payload) }, token);
  }

  async updateAdminPromocode(token: string, id: string, payload: Partial<AdminPromocode>): Promise<AdminPromocode> {
    return this.request<AdminPromocode>(`/v1/admin/promocodes/${id}`, { method: "PATCH", body: JSON.stringify(payload) }, token);
  }

  async listAdminLogs(token: string, params: { page: number; pageSize: number; profileId?: string; modelSlug?: string; status?: string; search?: string }): Promise<Paginated<AdminApiLog>> {
    const query = buildQuery({ page: params.page, page_size: params.pageSize, profile_id: params.profileId, model_slug: params.modelSlug, status: params.status, search: params.search });
    return this.request<Paginated<AdminApiLog>>(`/v1/admin/logs${query}`, undefined, token);
  }
}
