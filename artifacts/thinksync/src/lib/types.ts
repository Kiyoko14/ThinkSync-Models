export interface Profile {
  id: string;
  supabase_uid: string;
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

export interface ModelListResponse {
  object: "list";
  data: ModelItem[];
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

export interface PackageListResponse {
  object: "list";
  data: PackageItem[];
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

export interface BillingResponse {
  balance: number;
  total_spent: number;
  total_requests: number;
  total_tokens: number;
  total_cost_usd: number;
}

export interface PaymentRequestItem {
  id: string;
  user_id: string;
  amount: number;
  currency: string;
  screenshot_url?: string | null;
  status: "pending" | "approved" | "rejected";
  admin_id?: string | null;
  admin_email?: string | null;
  admin_note?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
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
  reference_type?: string | null;
  reference_id?: string | null;
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

export interface ApiErrorShape {
  error?: {
    message?: string;
    code?: string;
    detail?: string;
  };
}

export interface AdminAnalytics {
  users_total: number;
  users_active: number;
  models_total: number;
  models_active: number;
  api_requests_total: number;
  api_cost_total: number;
  transactions_total: number;
  package_revenue_cents: number;
}

export interface AdminModel {
  id: string;
  slug: string;
  provider_model_id: string;
  provider_name: string;
  display_name: string;
  description?: string | null;
  pricing_input_per_m: number;
  pricing_output_per_m: number;
  supports_streaming: boolean;
  supports_functions: boolean;
  is_active: boolean;
  context_window: number;
  max_output_tokens: number;
  sort_order: number;
  created_at?: string | null;
  updated_at?: string | null;
}

export interface AdminUser {
  id: string;
  supabase_uid: string;
  email: string;
  display_name?: string | null;
  plan_tier: string;
  is_active: boolean;
  total_spent: number;
  balance: number;
  rate_limit_rpm?: number | null;
  rate_limit_tpm?: number | null;
  created_at?: string | null;
  updated_at?: string | null;
}

export interface AdminTransaction {
  id: string;
  profile_id: string;
  amount: number;
  balance_after: number;
  transaction_type: string;
  status: string;
  description?: string | null;
  reference_type?: string | null;
  reference_id?: string | null;
  payment_provider?: string | null;
  payment_id?: string | null;
  created_at?: string | null;
}

export interface AdminPackage {
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
  created_at?: string | null;
  updated_at?: string | null;
}

export interface AdminPromocode {
  id: string;
  code: string;
  description?: string | null;
  discount_type: string;
  discount_value: number;
  max_uses: number;
  max_uses_per_user: number;
  current_uses: number;
  min_package_price_cents?: number | null;
  is_active: boolean;
  starts_at?: string | null;
  expires_at?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
}

export interface AdminApiLog {
  id: string;
  profile_id?: string | null;
  model_slug: string;
  auth_method: string;
  input_tokens: number;
  output_tokens: number;
  total_tokens: number;
  estimated_cost: number;
  duration_ms: number;
  status: string;
  status_code: number;
  error_message?: string | null;
  request_model?: string | null;
  stream_enabled: boolean;
  ip_address?: string | null;
  user_agent?: string | null;
  created_at?: string | null;
}

export interface PaginationMeta {
  page: number;
  page_size: number;
  total: number;
  total_pages: number;
}

export interface Paginated<T> {
  data: T[];
  meta: PaginationMeta;
}
