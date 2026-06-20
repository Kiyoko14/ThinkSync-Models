import { Router, type IRouter } from "express";
import { randomUUID, createHash } from "crypto";

// Simple hash for demo. In production, use bcrypt or argon2.
function hashPassword(password: string): string {
  return createHash("sha256").update(password).digest("hex");
}

function verifyPassword(password: string, hash: string): boolean {
  return hashPassword(password) === hash;
}

const router: IRouter = Router();

// =============================================================================
// IN-MEMORY DATA STORES
// =============================================================================

const users: Map<string, {
  id: string;
  email: string;
  password_hash: string;
  display_name?: string;
  plan_tier: string;
  role: string;
  is_active: boolean;
  total_spent: number;
  balance: number;
  created_at: string;
  updated_at: string;
  rate_limit_rpm: number;
  rate_limit_tpm: number;
}> = new Map();

const apiKeys: Map<string, {
  id: string;
  profile_id: string;
  key_prefix: string;
  raw_key: string;
  name: string;
  status: string;
  created_at: string;
  last_used_at?: string;
  expires_at?: string;
}> = new Map();

const transactions: Map<string, {
  id: string;
  profile_id: string;
  amount: number;
  balance_after: number;
  transaction_type: string;
  status: string;
  description?: string;
  reference_type?: string;
  reference_id?: string;
  created_at: string;
}> = new Map();

const models: Map<string, {
  id: string;
  slug: string;
  provider_model_id: string;
  provider_name: string;
  display_name: string;
  description?: string;
  pricing_input_per_m: number;
  pricing_output_per_m: number;
  supports_streaming: boolean;
  supports_functions: boolean;
  is_active: boolean;
  context_window: number;
  max_output_tokens: number;
  sort_order: number;
  created_at: string;
  updated_at: string;
}> = new Map();

const packages: Map<string, {
  id: string;
  name: string;
  description?: string;
  token_amount: number;
  bonus_tokens: number;
  price_usd_cents: number;
  display_price: string;
  is_featured: boolean;
  sort_order: number;
  status: string;
  created_at: string;
  updated_at: string;
}> = new Map();

const promocodes: Map<string, {
  id: string;
  code: string;
  description?: string;
  discount_type: string;
  discount_value: number;
  max_uses: number;
  max_uses_per_user: number;
  current_uses: number;
  min_package_price_cents?: number;
  is_active: boolean;
  starts_at?: string;
  expires_at?: string;
  created_at: string;
  updated_at: string;
}> = new Map();

const apiLogs: Map<string, {
  id: string;
  profile_id?: string;
  model_slug: string;
  auth_method: string;
  input_tokens: number;
  output_tokens: number;
  total_tokens: number;
  estimated_cost: number;
  duration_ms: number;
  status: string;
  status_code: number;
  error_message?: string;
  request_model?: string;
  stream_enabled: boolean;
  ip_address?: string;
  user_agent?: string;
  created_at: string;
}> = new Map();

// Seed admin user
const adminId = "admin-001";
users.set(adminId, {
  id: adminId,
  email: "admin@thinksync.ai",
  password_hash: hashPassword("admin123"),
  display_name: "Admin",
  plan_tier: "enterprise",
  role: "admin",
  is_active: true,
  total_spent: 0,
  balance: 0,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  rate_limit_rpm: 1000,
  rate_limit_tpm: 100000,
});

// Seed models
[
  {
    id: "gpt-4o",
    slug: "gpt-4o",
    provider_model_id: "gpt-4o",
    provider_name: "OpenAI",
    display_name: "GPT-4o",
    description: "OpenAI's GPT-4o model",
    pricing_input_per_m: 2.5,
    pricing_output_per_m: 10.0,
    supports_streaming: true,
    supports_functions: true,
    is_active: true,
    context_window: 128000,
    max_output_tokens: 16384,
    sort_order: 1,
  },
  {
    id: "gpt-4o-mini",
    slug: "gpt-4o-mini",
    provider_model_id: "gpt-4o-mini",
    provider_name: "OpenAI",
    display_name: "GPT-4o Mini",
    description: "OpenAI's GPT-4o-mini model",
    pricing_input_per_m: 0.15,
    pricing_output_per_m: 0.6,
    supports_streaming: true,
    supports_functions: true,
    is_active: true,
    context_window: 128000,
    max_output_tokens: 16384,
    sort_order: 2,
  },
  {
    id: "gpt-4-turbo",
    slug: "gpt-4-turbo",
    provider_model_id: "gpt-4-turbo",
    provider_name: "OpenAI",
    display_name: "GPT-4 Turbo",
    description: "OpenAI's GPT-4 Turbo",
    pricing_input_per_m: 10.0,
    pricing_output_per_m: 30.0,
    supports_streaming: true,
    supports_functions: true,
    is_active: true,
    context_window: 128000,
    max_output_tokens: 4096,
    sort_order: 3,
  },
  {
    id: "deepseek-v3",
    slug: "deepseek-v3",
    provider_model_id: "deepseek-chat",
    provider_name: "DeepSeek",
    display_name: "DeepSeek V3",
    description: "DeepSeek V3 model",
    pricing_input_per_m: 0.07,
    pricing_output_per_m: 0.27,
    supports_streaming: true,
    supports_functions: false,
    is_active: true,
    context_window: 64000,
    max_output_tokens: 8192,
    sort_order: 4,
  },
  {
    id: "deepseek-r1",
    slug: "deepseek-r1",
    provider_model_id: "deepseek-reasoner",
    provider_name: "DeepSeek",
    display_name: "DeepSeek R1",
    description: "DeepSeek R1 reasoning model",
    pricing_input_per_m: 0.55,
    pricing_output_per_m: 2.19,
    supports_streaming: true,
    supports_functions: false,
    is_active: true,
    context_window: 64000,
    max_output_tokens: 8192,
    sort_order: 5,
  },
  {
    id: "claude-3-5-sonnet",
    slug: "claude-3-5-sonnet",
    provider_model_id: "claude-3-5-sonnet-20241022",
    provider_name: "Anthropic",
    display_name: "Claude 3.5 Sonnet",
    description: "Anthropic's Claude 3.5 Sonnet",
    pricing_input_per_m: 3.0,
    pricing_output_per_m: 15.0,
    supports_streaming: true,
    supports_functions: true,
    is_active: true,
    context_window: 200000,
    max_output_tokens: 8192,
    sort_order: 6,
  },
].forEach((m) => {
  models.set(m.id, {
    ...m,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  });
});

// Seed packages
[
  {
    id: "starter",
    name: "Starter",
    description: "500K tokens + 5% bonus",
    token_amount: 500000,
    bonus_tokens: 25000,
    price_usd_cents: 500,
    display_price: "$5.00",
    is_featured: false,
    sort_order: 1,
    status: "active",
  },
  {
    id: "pro",
    name: "Pro",
    description: "2M tokens + 10% bonus",
    token_amount: 2000000,
    bonus_tokens: 200000,
    price_usd_cents: 1800,
    display_price: "$18.00",
    is_featured: true,
    sort_order: 2,
    status: "active",
  },
  {
    id: "enterprise",
    name: "Enterprise",
    description: "10M tokens + 15% bonus",
    token_amount: 10000000,
    bonus_tokens: 1500000,
    price_usd_cents: 8000,
    display_price: "$80.00",
    is_featured: false,
    sort_order: 3,
    status: "active",
  },
].forEach((p) => {
  packages.set(p.id, {
    ...p,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  });
});

// Seed transactions for admin
[
  {
    id: "txn-1",
    profile_id: adminId,
    amount: 100000,
    balance_after: 100000,
    transaction_type: "package_purchase",
    status: "completed",
    description: "Pro package purchased",
    reference_type: "package",
    reference_id: "pro",
  },
  {
    id: "txn-2",
    profile_id: adminId,
    amount: 50000,
    balance_after: 50000,
    transaction_type: "api_usage",
    status: "completed",
    description: "API usage deduction",
  },
].forEach((t) => {
  transactions.set(t.id, {
    ...t,
    created_at: new Date().toISOString(),
  });
});

// Seed API logs
[
  {
    id: "log-1",
    profile_id: adminId,
    model_slug: "gpt-4o",
    auth_method: "api_key",
    input_tokens: 500,
    output_tokens: 300,
    total_tokens: 800,
    estimated_cost: 0.0035,
    duration_ms: 1200,
    status: "success",
    status_code: 200,
    request_model: "gpt-4o",
    stream_enabled: false,
    ip_address: "192.168.1.1",
  },
  {
    id: "log-2",
    profile_id: adminId,
    model_slug: "deepseek-v3",
    auth_method: "api_key",
    input_tokens: 2000,
    output_tokens: 800,
    total_tokens: 2800,
    estimated_cost: 0.014,
    duration_ms: 3500,
    status: "success",
    status_code: 200,
    request_model: "deepseek-v3",
    stream_enabled: true,
    ip_address: "192.168.1.1",
  },
].forEach((l) => {
  apiLogs.set(l.id, {
    ...l,
    created_at: new Date().toISOString(),
  });
});

// =============================================================================
// AUTH HELPERS
// =============================================================================

function generateToken(): string {
  return "thc_" + randomUUID().replace(/-/g, "");
}

function getTokenFromHeader(req: { headers: { authorization?: string } }): string | null {
  const header = req.headers.authorization;
  if (!header) return null;
  if (!header.startsWith("Bearer ")) return null;
  return header.slice(7);
}

function authenticate(req: { headers: { authorization?: string } }):
  { user: typeof users extends Map<string, infer V> ? V : never; token: string } | null {
  const token = getTokenFromHeader(req);
  if (!token) return null;
  const entry = [...apiKeys.entries()].find(([, v]) => v.raw_key === token && v.status === "active");
  if (!entry) return null;
  const user = users.get(entry[1].profile_id);
  if (!user || !user.is_active) return null;
  return { user, token };
}

// =============================================================================
// PUBLIC ENDPOINTS
// =============================================================================

// GET /v1/models
router.get("/models", (_req, res) => {
  const activeModels = [...models.values()]
    .filter((m) => m.is_active)
    .sort((a, b) => a.sort_order - b.sort_order)
    .map((m) => ({
      id: m.id,
      owned_by: m.provider_name,
      active: m.is_active,
      context_window: m.context_window,
      max_output_tokens: m.max_output_tokens,
      pricing_input_per_m: m.pricing_input_per_m,
      pricing_output_per_m: m.pricing_output_per_m,
    }));
  res.json({ object: "list", data: activeModels });
});

// GET /v1/models/:id
router.get("/models/:id", (req, res) => {
  const model = models.get(req.params.id);
  if (!model) {
    res.status(404).json({ error: { message: "Model not found", code: "model_not_found" } });
    return;
  }
  res.json({
    id: model.id,
    owned_by: model.provider_name,
    active: model.is_active,
    context_window: model.context_window,
    max_output_tokens: model.max_output_tokens,
    pricing_input_per_m: model.pricing_input_per_m,
    pricing_output_per_m: model.pricing_output_per_m,
  });
});

// GET /v1/packages
router.get("/packages", (_req, res) => {
  const activePackages = [...packages.values()]
    .filter((p) => p.status === "active")
    .sort((a, b) => a.sort_order - b.sort_order)
    .map((p) => ({
      id: p.id,
      name: p.name,
      description: p.description,
      token_amount: p.token_amount,
      bonus_tokens: p.bonus_tokens,
      price_usd_cents: p.price_usd_cents,
      display_price: p.display_price,
      is_featured: p.is_featured,
      sort_order: p.sort_order,
      status: p.status,
    }));
  res.json({ object: "list", data: activePackages });
});

// POST /v1/auth/login
router.post("/auth/login", (req, res) => {
  const { email, password } = req.body || {};
  if (!email || !password) {
    res.status(400).json({ error: { message: "Email and password are required", code: "missing_credentials" } });
    return;
  }
  const user = [...users.values()].find((u) => u.email === email);
  if (!user || !verifyPassword(password, user.password_hash)) {
    res.status(401).json({ error: { message: "Invalid email or password", code: "invalid_credentials" } });
    return;
  }
  const token = generateToken();
  const keyId = randomUUID();
  apiKeys.set(keyId, {
    id: keyId,
    profile_id: user.id,
    key_prefix: token.slice(0, 10),
    raw_key: token,
    name: "Login token",
    status: "active",
    created_at: new Date().toISOString(),
  });
  res.json({
    token,
    profile: {
      id: user.id,
      supabase_uid: user.id,
      email: user.email,
      display_name: user.display_name,
      plan_tier: user.plan_tier,
      is_active: user.is_active,
      total_spent: user.total_spent,
      created_at: user.created_at,
    },
  });
});

// POST /v1/auth/register
router.post("/auth/register", (req, res) => {
  const { email, password, display_name } = req.body || {};
  if (!email || !password) {
    res.status(400).json({ error: { message: "Email and password are required", code: "missing_credentials" } });
    return;
  }
  if (password.length < 8) {
    res.status(400).json({ error: { message: "Password must be at least 8 characters", code: "password_too_short" } });
    return;
  }
  if ([...users.values()].some((u) => u.email === email)) {
    res.status(409).json({ error: { message: "Email already registered", code: "email_exists" } });
    return;
  }
  const userId = randomUUID();
  const user = {
    id: userId,
    email,
    password_hash: hashPassword(password),
    display_name: display_name || null,
    plan_tier: "free",
    role: "user",
    is_active: true,
    total_spent: 0,
    balance: 0,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    rate_limit_rpm: 60,
    rate_limit_tpm: 10000,
  };
  users.set(userId, user);
  const token = generateToken();
  const keyId = randomUUID();
  apiKeys.set(keyId, {
    id: keyId,
    profile_id: userId,
    key_prefix: token.slice(0, 10),
    raw_key: token,
    name: "Default token",
    status: "active",
    created_at: new Date().toISOString(),
  });
  res.json({
    token,
    profile: {
      id: user.id,
      supabase_uid: user.id,
      email: user.email,
      display_name: user.display_name,
      plan_tier: user.plan_tier,
      is_active: user.is_active,
      total_spent: user.total_spent,
      created_at: user.created_at,
    },
  });
});

// =============================================================================
// AUTHENTICATED USER ENDPOINTS
// =============================================================================

function requireAuth(req: { headers: { authorization?: string } }, res: { status: (n: number) => { json: (d: unknown) => void }; end: () => void }):
  NonNullable<ReturnType<typeof authenticate>> | null {
  const auth = authenticate(req);
  if (!auth) {
    res.status(401).json({ error: { message: "Unauthorized", code: "unauthorized" } });
    return null;
  }
  return auth;
}

// GET /v1/user/profile
router.get("/user/profile", (req, res) => {
  const auth = requireAuth(req, res);
  if (!auth) return;
  const user = auth.user;
  res.json({
    id: user.id,
    supabase_uid: user.id,
    email: user.email,
    display_name: user.display_name,
    plan_tier: user.plan_tier,
    is_active: user.is_active,
    total_spent: user.total_spent,
    created_at: user.created_at,
  });
});

// GET /v1/user/stats
router.get("/user/stats", (req, res) => {
  const auth = requireAuth(req, res);
  if (!auth) return;
  const userLogs = [...apiLogs.values()].filter((l) => l.profile_id === auth.user.id);
  const total_requests = userLogs.length;
  const total_tokens = userLogs.reduce((sum, l) => sum + l.total_tokens, 0);
  const total_cost = userLogs.reduce((sum, l) => sum + l.estimated_cost, 0);
  res.json({ total_requests, total_tokens, total_cost });
});

// GET /v1/user/balance
router.get("/user/balance", (req, res) => {
  const auth = requireAuth(req, res);
  if (!auth) return;
  const user = auth.user;
  const activePackageTokens = [...transactions.values()]
    .filter((t) => t.profile_id === user.id && t.transaction_type === "package_purchase" && t.status === "completed")
    .reduce((sum, t) => sum + t.amount, 0);
  res.json({
    balance: user.balance,
    active_package_tokens: activePackageTokens,
    total_available: user.balance + activePackageTokens,
  });
});

// GET /v1/user/usage
router.get("/user/usage", (req, res) => {
  const auth = requireAuth(req, res);
  if (!auth) return;
  const userLogs = [...apiLogs.values()].filter((l) => l.profile_id === auth.user.id);
  const total_requests = userLogs.length;
  const total_tokens = userLogs.reduce((sum, l) => sum + l.total_tokens, 0);
  const total_cost_usd = userLogs.reduce((sum, l) => sum + l.estimated_cost, 0);
  const total_billed_from_balance = userLogs.filter((l) => l.profile_id).reduce((sum, l) => sum + l.estimated_cost, 0);
  const total_billed_from_packages = 0;
  res.json({ total_requests, total_tokens, total_cost_usd, total_billed_from_balance, total_billed_from_packages });
});

// GET /v1/user/transactions
router.get("/user/transactions", (req, res) => {
  const auth = requireAuth(req, res);
  if (!auth) return;
  const userTxns = [...transactions.values()]
    .filter((t) => t.profile_id === auth.user.id)
    .map((t) => ({
      id: t.id,
      amount: t.amount,
      balance_after: t.balance_after,
      transaction_type: t.transaction_type,
      status: t.status,
      description: t.description,
      reference_type: t.reference_type,
      reference_id: t.reference_id,
      created_at: t.created_at,
    }));
  res.json(userTxns);
});

// GET /v1/user/tokens
router.get("/user/tokens", (req, res) => {
  const auth = requireAuth(req, res);
  if (!auth) return;
  const userKeys = [...apiKeys.values()]
    .filter((k) => k.profile_id === auth.user.id)
    .map((k) => ({
      id: k.id,
      key_prefix: k.key_prefix,
      name: k.name,
      status: k.status,
      created_at: k.created_at,
      last_used_at: k.last_used_at,
      expires_at: k.expires_at,
    }));
  res.json(userKeys);
});

// POST /v1/user/tokens/generate
router.post("/user/tokens/generate", (req, res) => {
  const auth = requireAuth(req, res);
  if (!auth) return;
  const { name, expires_in_days } = req.body || {};
  const token = generateToken();
  const keyId = randomUUID();
  const now = new Date();
  const expiresAt = expires_in_days ? new Date(now.getTime() + expires_in_days * 86400000).toISOString() : undefined;
  apiKeys.set(keyId, {
    id: keyId,
    profile_id: auth.user.id,
    key_prefix: token.slice(0, 10),
    raw_key: token,
    name: name || "API Key",
    status: "active",
    created_at: now.toISOString(),
    expires_at: expiresAt,
  });
  res.json({ id: keyId, key_prefix: token.slice(0, 10), name: name || "API Key", raw_key: token, status: "active" });
});

// POST /v1/user/tokens/:id/revoke
router.post("/user/tokens/:id/revoke", (req, res) => {
  const auth = requireAuth(req, res);
  if (!auth) return;
  const key = apiKeys.get(req.params.id);
  if (!key || key.profile_id !== auth.user.id) {
    res.status(404).json({ error: { message: "Token not found", code: "token_not_found" } });
    return;
  }
  key.status = "revoked";
  apiKeys.set(req.params.id, key);
  res.json({ id: req.params.id, status: "revoked" });
});

// POST /v1/user/tokens/:id/rotate
router.post("/user/tokens/:id/rotate", (req, res) => {
  const auth = requireAuth(req, res);
  if (!auth) return;
  const key = apiKeys.get(req.params.id);
  if (!key || key.profile_id !== auth.user.id) {
    res.status(404).json({ error: { message: "Token not found", code: "token_not_found" } });
    return;
  }
  const token = generateToken();
  key.raw_key = token;
  key.key_prefix = token.slice(0, 10);
  key.created_at = new Date().toISOString();
  apiKeys.set(req.params.id, key);
  res.json({ id: key.id, key_prefix: key.key_prefix, name: key.name, raw_key: token, status: "active" });
});

// =============================================================================
// ADMIN ENDPOINTS
// =============================================================================

function requireAdmin(req: { headers: { authorization?: string } }, res: { status: (n: number) => { json: (d: unknown) => void }; end: () => void }):
  NonNullable<ReturnType<typeof authenticate>> | null {
  const auth = requireAuth(req, res);
  if (!auth) return null;
  if (auth.user.role !== "admin") {
    res.status(403).json({ error: { message: "Forbidden", code: "forbidden" } });
    return null;
  }
  return auth;
}

function paginate<T>(items: T[], page: number, pageSize: number): T[] {
  const start = (page - 1) * pageSize;
  return items.slice(start, start + pageSize);
}

function paginateMeta(total: number, page: number, pageSize: number) {
  return {
    page,
    page_size: pageSize,
    total,
    total_pages: Math.ceil(total / pageSize),
  };
}

// GET /v1/admin/analytics
router.get("/admin/analytics", (req, res) => {
  const auth = requireAdmin(req, res);
  if (!auth) return;
  const activeUsers = [...users.values()].filter((u) => u.is_active).length;
  const activeModels = [...models.values()].filter((m) => m.is_active).length;
  const totalRequests = apiLogs.size;
  const totalCost = [...apiLogs.values()].reduce((sum, l) => sum + l.estimated_cost, 0);
  const totalTransactions = transactions.size;
  const packageRevenue = [...transactions.values()]
    .filter((t) => t.transaction_type === "package_purchase" && t.status === "completed")
    .reduce((sum, t) => sum + t.amount, 0);
  res.json({
    users_total: users.size,
    users_active: activeUsers,
    models_total: models.size,
    models_active: activeModels,
    api_requests_total: totalRequests,
    api_cost_total: totalCost,
    transactions_total: totalTransactions,
    package_revenue_cents: packageRevenue,
  });
});

// GET /v1/admin/models
router.get("/admin/models", (req, res) => {
  const auth = requireAdmin(req, res);
  if (!auth) return;
  const page = parseInt(req.query.page as string) || 1;
  const pageSize = parseInt(req.query.page_size as string) || 20;
  const search = (req.query.search as string)?.toLowerCase() || "";
  const isActive = req.query.is_active as string;
  let all = [...models.values()];
  if (search) {
    all = all.filter((m) => m.display_name.toLowerCase().includes(search) || m.id.toLowerCase().includes(search));
  }
  if (isActive && isActive !== "all") {
    all = all.filter((m) => m.is_active === (isActive === "true"));
  }
  res.json({ data: paginate(all, page, pageSize), meta: paginateMeta(all.length, page, pageSize) });
});

// POST /v1/admin/models
router.post("/admin/models", (req, res) => {
  const auth = requireAdmin(req, res);
  if (!auth) return;
  const payload = req.body;
  const id = payload.id || randomUUID();
  const now = new Date().toISOString();
  const model = {
    id,
    slug: payload.slug || id,
    provider_model_id: payload.provider_model_id || "",
    provider_name: payload.provider_name || "",
    display_name: payload.display_name || "",
    description: payload.description || null,
    pricing_input_per_m: payload.pricing_input_per_m || 0,
    pricing_output_per_m: payload.pricing_output_per_m || 0,
    supports_streaming: payload.supports_streaming ?? false,
    supports_functions: payload.supports_functions ?? false,
    is_active: payload.is_active ?? true,
    context_window: payload.context_window || 4096,
    max_output_tokens: payload.max_output_tokens || 4096,
    sort_order: payload.sort_order || 0,
    created_at: now,
    updated_at: now,
  };
  models.set(id, model);
  res.json(model);
});

// PATCH /v1/admin/models/:id
router.patch("/admin/models/:id", (req, res) => {
  const auth = requireAdmin(req, res);
  if (!auth) return;
  const model = models.get(req.params.id);
  if (!model) {
    res.status(404).json({ error: { message: "Model not found", code: "model_not_found" } });
    return;
  }
  Object.assign(model, req.body, { updated_at: new Date().toISOString() });
  models.set(req.params.id, model);
  res.json(model);
});

// GET /v1/admin/users
router.get("/admin/users", (req, res) => {
  const auth = requireAdmin(req, res);
  if (!auth) return;
  const page = parseInt(req.query.page as string) || 1;
  const pageSize = parseInt(req.query.page_size as string) || 20;
  const search = (req.query.search as string)?.toLowerCase() || "";
  const planTier = req.query.plan_tier as string;
  const isActive = req.query.is_active as string;
  let all = [...users.values()];
  if (search) {
    all = all.filter((u) => u.email.toLowerCase().includes(search) || (u.display_name || "").toLowerCase().includes(search));
  }
  if (planTier && planTier !== "all") {
    all = all.filter((u) => u.plan_tier === planTier);
  }
  if (isActive && isActive !== "all") {
    all = all.filter((u) => u.is_active === (isActive === "true"));
  }
  res.json({ data: paginate(all, page, pageSize), meta: paginateMeta(all.length, page, pageSize) });
});

// PATCH /v1/admin/users/:id
router.patch("/admin/users/:id", (req, res) => {
  const auth = requireAdmin(req, res);
  if (!auth) return;
  const user = users.get(req.params.id);
  if (!user) {
    res.status(404).json({ error: { message: "User not found", code: "user_not_found" } });
    return;
  }
  Object.assign(user, req.body, { updated_at: new Date().toISOString() });
  users.set(req.params.id, user);
  res.json(user);
});

// GET /v1/admin/transactions
router.get("/admin/transactions", (req, res) => {
  const auth = requireAdmin(req, res);
  if (!auth) return;
  const page = parseInt(req.query.page as string) || 1;
  const pageSize = parseInt(req.query.page_size as string) || 20;
  const profileId = req.query.profile_id as string;
  const transactionType = req.query.transaction_type as string;
  const status = req.query.status as string;
  let all = [...transactions.values()];
  if (profileId) all = all.filter((t) => t.profile_id === profileId);
  if (transactionType) all = all.filter((t) => t.transaction_type === transactionType);
  if (status) all = all.filter((t) => t.status === status);
  res.json({ data: paginate(all, page, pageSize), meta: paginateMeta(all.length, page, pageSize) });
});

// GET /v1/admin/packages
router.get("/admin/packages", (req, res) => {
  const auth = requireAdmin(req, res);
  if (!auth) return;
  const page = parseInt(req.query.page as string) || 1;
  const pageSize = parseInt(req.query.page_size as string) || 20;
  const search = (req.query.search as string)?.toLowerCase() || "";
  const status = req.query.status as string;
  let all = [...packages.values()];
  if (search) all = all.filter((p) => p.name.toLowerCase().includes(search));
  if (status && status !== "all") all = all.filter((p) => p.status === status);
  res.json({ data: paginate(all, page, pageSize), meta: paginateMeta(all.length, page, pageSize) });
});

// POST /v1/admin/packages
router.post("/admin/packages", (req, res) => {
  const auth = requireAdmin(req, res);
  if (!auth) return;
  const payload = req.body;
  const id = payload.id || randomUUID();
  const now = new Date().toISOString();
  const pkg = {
    id,
    name: payload.name || "",
    description: payload.description || null,
    token_amount: payload.token_amount || 0,
    bonus_tokens: payload.bonus_tokens || 0,
    price_usd_cents: payload.price_usd_cents || 0,
    display_price: payload.display_price || "$0.00",
    is_featured: payload.is_featured ?? false,
    sort_order: payload.sort_order || 0,
    status: payload.status || "active",
    created_at: now,
    updated_at: now,
  };
  packages.set(id, pkg);
  res.json(pkg);
});

// PATCH /v1/admin/packages/:id
router.patch("/admin/packages/:id", (req, res) => {
  const auth = requireAdmin(req, res);
  if (!auth) return;
  const pkg = packages.get(req.params.id);
  if (!pkg) {
    res.status(404).json({ error: { message: "Package not found", code: "package_not_found" } });
    return;
  }
  Object.assign(pkg, req.body, { updated_at: new Date().toISOString() });
  packages.set(req.params.id, pkg);
  res.json(pkg);
});

// GET /v1/admin/promocodes
router.get("/admin/promocodes", (req, res) => {
  const auth = requireAdmin(req, res);
  if (!auth) return;
  const page = parseInt(req.query.page as string) || 1;
  const pageSize = parseInt(req.query.page_size as string) || 20;
  const search = (req.query.search as string)?.toLowerCase() || "";
  const isActive = req.query.is_active as string;
  let all = [...promocodes.values()];
  if (search) all = all.filter((p) => p.code.toLowerCase().includes(search));
  if (isActive && isActive !== "all") all = all.filter((p) => p.is_active === (isActive === "true"));
  res.json({ data: paginate(all, page, pageSize), meta: paginateMeta(all.length, page, pageSize) });
});

// POST /v1/admin/promocodes
router.post("/admin/promocodes", (req, res) => {
  const auth = requireAdmin(req, res);
  if (!auth) return;
  const payload = req.body;
  const id = payload.id || randomUUID();
  const now = new Date().toISOString();
  const promocode = {
    id,
    code: payload.code || "",
    description: payload.description || null,
    discount_type: payload.discount_type || "percentage",
    discount_value: payload.discount_value || 0,
    max_uses: payload.max_uses || 0,
    max_uses_per_user: payload.max_uses_per_user || 1,
    current_uses: 0,
    min_package_price_cents: payload.min_package_price_cents || null,
    is_active: payload.is_active ?? true,
    starts_at: payload.starts_at || null,
    expires_at: payload.expires_at || null,
    created_at: now,
    updated_at: now,
  };
  promocodes.set(id, promocode);
  res.json(promocode);
});

// PATCH /v1/admin/promocodes/:id
router.patch("/admin/promocodes/:id", (req, res) => {
  const auth = requireAdmin(req, res);
  if (!auth) return;
  const promocode = promocodes.get(req.params.id);
  if (!promocode) {
    res.status(404).json({ error: { message: "Promocode not found", code: "promocode_not_found" } });
    return;
  }
  Object.assign(promocode, req.body, { updated_at: new Date().toISOString() });
  promocodes.set(req.params.id, promocode);
  res.json(promocode);
});

// GET /v1/admin/logs
router.get("/admin/logs", (req, res) => {
  const auth = requireAdmin(req, res);
  if (!auth) return;
  const page = parseInt(req.query.page as string) || 1;
  const pageSize = parseInt(req.query.page_size as string) || 20;
  const profileId = req.query.profile_id as string;
  const modelSlug = req.query.model_slug as string;
  const status = req.query.status as string;
  const search = (req.query.search as string)?.toLowerCase() || "";
  let all = [...apiLogs.values()];
  if (profileId) all = all.filter((l) => l.profile_id === profileId);
  if (modelSlug) all = all.filter((l) => l.model_slug === modelSlug);
  if (status) all = all.filter((l) => l.status === status);
  if (search) all = all.filter((l) => l.model_slug.toLowerCase().includes(search));
  res.json({ data: paginate(all, page, pageSize), meta: paginateMeta(all.length, page, pageSize) });
});

export default router;
