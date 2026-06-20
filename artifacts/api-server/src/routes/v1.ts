import { Router, type IRouter } from "express";
import { hashApiKey, prefixApiKey, generateApiKey } from "../lib/api-key";
import { hashPassword, verifyPassword } from "../lib/password";
import { authMiddleware, requireAdmin, requirePrimaryAdmin, generateToken, type AuthenticatedRequest } from "../middlewares/auth";
import { createUser, getUserByEmail, getUserById, updateUser, listUsers } from "../services/user";
import { createApiKey, getApiKeyById, listApiKeysForUser, revokeApiKey, rotateApiKey } from "../services/api-key";
import { createTransaction, listTransactions } from "../services/transaction";
import { createModel, listModels, updateModel } from "../services/model";
import { createPackage, listPackages, updatePackage } from "../services/package";
import { createPromocode, listPromocodes, updatePromocode } from "../services/promocode";
import { createApiLog, listApiLogs } from "../services/api-log";
import { createAuditLog, listAuditLogs } from "../services/audit-log";

const router: IRouter = Router();

// =============================================================================
// SEED DATA
// =============================================================================

// Seed admin user
async function seedData() {
  const admin = createUser({
    id: "admin-001",
    email: "admin@thinksync.ai",
    password_hash: await hashPassword("admin123"),
    display_name: "Admin",
    plan_tier: "enterprise",
    role: "admin",
    is_active: true,
    total_spent: 0,
    balance: 0,
    rate_limit_rpm: 1000,
    rate_limit_tpm: 100000,
  });

  const primaryAdmin = createUser({
    id: "admin-002",
    email: "jdusi908@gmail.com",
    password_hash: await hashPassword("admin123"),
    display_name: "Primary Admin",
    plan_tier: "enterprise",
    role: "admin",
    is_active: true,
    total_spent: 0,
    balance: 0,
    rate_limit_rpm: 1000,
    rate_limit_tpm: 100000,
  });

  // Seed models
  [
    { id: "gpt-4o", slug: "gpt-4o", provider_model_id: "gpt-4o", provider_name: "OpenAI", display_name: "GPT-4o", description: "OpenAI's GPT-4o model", pricing_input_per_m: 2.5, pricing_output_per_m: 10.0, supports_streaming: true, supports_functions: true, is_active: true, context_window: 128000, max_output_tokens: 16384, rate_limit_rpm: 1000, rate_limit_tpm: 10000, sort_order: 1 },
    { id: "gpt-4o-mini", slug: "gpt-4o-mini", provider_model_id: "gpt-4o-mini", provider_name: "OpenAI", display_name: "GPT-4o Mini", description: "OpenAI's GPT-4o-mini model", pricing_input_per_m: 0.15, pricing_output_per_m: 0.6, supports_streaming: true, supports_functions: true, is_active: true, context_window: 128000, max_output_tokens: 16384, rate_limit_rpm: 2000, rate_limit_tpm: 20000, sort_order: 2 },
    { id: "gpt-4-turbo", slug: "gpt-4-turbo", provider_model_id: "gpt-4-turbo", provider_name: "OpenAI", display_name: "GPT-4 Turbo", description: "OpenAI's GPT-4 Turbo", pricing_input_per_m: 10.0, pricing_output_per_m: 30.0, supports_streaming: true, supports_functions: true, is_active: true, context_window: 128000, max_output_tokens: 4096, rate_limit_rpm: 500, rate_limit_tpm: 5000, sort_order: 3 },
    { id: "deepseek-v3", slug: "deepseek-v3", provider_model_id: "deepseek-chat", provider_name: "DeepSeek", display_name: "DeepSeek V3", description: "DeepSeek V3 model", pricing_input_per_m: 0.07, pricing_output_per_m: 0.27, supports_streaming: true, supports_functions: false, is_active: true, context_window: 64000, max_output_tokens: 8192, rate_limit_rpm: 1000, rate_limit_tpm: 10000, sort_order: 4 },
    { id: "deepseek-r1", slug: "deepseek-r1", provider_model_id: "deepseek-reasoner", provider_name: "DeepSeek", display_name: "DeepSeek R1", description: "DeepSeek R1 reasoning model", pricing_input_per_m: 0.55, pricing_output_per_m: 2.19, supports_streaming: true, supports_functions: false, is_active: true, context_window: 64000, max_output_tokens: 8192, rate_limit_rpm: 500, rate_limit_tpm: 5000, sort_order: 5 },
    { id: "claude-3-5-sonnet", slug: "claude-3-5-sonnet", provider_model_id: "claude-3-5-sonnet-20241022", provider_name: "Anthropic", display_name: "Claude 3.5 Sonnet", description: "Anthropic's Claude 3.5 Sonnet", pricing_input_per_m: 3.0, pricing_output_per_m: 15.0, supports_streaming: true, supports_functions: true, is_active: true, context_window: 200000, max_output_tokens: 8192, rate_limit_rpm: 1000, rate_limit_tpm: 10000, sort_order: 6 },
  ].forEach((m) => createModel(m as Parameters<typeof createModel>[0]));

  // Seed packages
  [
    { id: "starter", name: "Starter", description: "500K tokens + 5% bonus", token_amount: 500000, bonus_tokens: 25000, price_usd_cents: 500, display_price: "$5.00", is_featured: false, sort_order: 1, status: "active" },
    { id: "pro", name: "Pro", description: "2M tokens + 10% bonus", token_amount: 2000000, bonus_tokens: 200000, price_usd_cents: 1800, display_price: "$18.00", is_featured: true, sort_order: 2, status: "active" },
    { id: "enterprise", name: "Enterprise", description: "10M tokens + 15% bonus", token_amount: 10000000, bonus_tokens: 1500000, price_usd_cents: 8000, display_price: "$80.00", is_featured: false, sort_order: 3, status: "active" },
  ].forEach((p) => createPackage(p as Parameters<typeof createPackage>[0]));

  // Seed transactions for admin
  createTransaction({ id: "txn-1", profile_id: admin.id, amount: 100000, balance_after: 100000, transaction_type: "package_purchase", status: "completed", description: "Pro package purchased", reference_type: "package", reference_id: "pro" });
  createTransaction({ id: "txn-2", profile_id: admin.id, amount: 50000, balance_after: 50000, transaction_type: "api_usage", status: "completed", description: "API usage deduction" });

  // Seed API logs
  createApiLog({ id: "log-1", profile_id: admin.id, model_slug: "gpt-4o", auth_method: "api_key", input_tokens: 500, output_tokens: 300, total_tokens: 800, estimated_cost: 0.0035, duration_ms: 1200, status: "success", status_code: 200, request_model: "gpt-4o", stream_enabled: false, ip_address: "192.168.1.1" });
  createApiLog({ id: "log-2", profile_id: admin.id, model_slug: "deepseek-v3", auth_method: "api_key", input_tokens: 2000, output_tokens: 800, total_tokens: 2800, estimated_cost: 0.014, duration_ms: 3500, status: "success", status_code: 200, request_model: "deepseek-v3", stream_enabled: true, ip_address: "192.168.1.1" });
}

seedData();

// =============================================================================
// HELPERS
// =============================================================================

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

function toPublicProfile(user: ReturnType<typeof getUserById>) {
  if (!user) return null;
  return {
    id: user.id,
    supabase_uid: user.id,
    email: user.email,
    display_name: user.display_name,
    plan_tier: user.plan_tier,
    is_active: user.is_active,
    total_spent: user.total_spent,
    created_at: user.created_at,
  };
}

// =============================================================================
// PUBLIC ENDPOINTS
// =============================================================================

// GET /v1/models
router.get("/models", (_req, res) => {
  const activeModels = listModels()
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
  const m = listModels().find((mm) => mm.id === req.params.id);
  if (!m) {
    res.status(404).json({ error: { message: "Model not found", code: "model_not_found" } });
    return;
  }
  res.json({
    id: m.id,
    owned_by: m.provider_name,
    active: m.is_active,
    context_window: m.context_window,
    max_output_tokens: m.max_output_tokens,
    pricing_input_per_m: m.pricing_input_per_m,
    pricing_output_per_m: m.pricing_output_per_m,
  });
});

// GET /v1/packages
router.get("/packages", (_req, res) => {
  const activePackages = listPackages()
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
router.post("/auth/login", async (req, res) => {
  const { email, password } = req.body || {};
  if (!email || !password) {
    res.status(400).json({ error: { message: "Email and password are required", code: "missing_credentials" } });
    return;
  }
  const user = getUserByEmail(email);
  if (!user || !(await verifyPassword(password, user.password_hash))) {
    res.status(401).json({ error: { message: "Invalid email or password", code: "invalid_credentials" } });
    return;
  }
  const token = generateToken(user.id, user.email, user.role);
  res.json({
    token,
    profile: toPublicProfile(user),
  });
});

// POST /v1/auth/register
router.post("/auth/register", async (req, res) => {
  const { email, password, display_name } = req.body || {};
  if (!email || !password) {
    res.status(400).json({ error: { message: "Email and password are required", code: "missing_credentials" } });
    return;
  }
  if (password.length < 8) {
    res.status(400).json({ error: { message: "Password must be at least 8 characters", code: "password_too_short" } });
    return;
  }
  if (getUserByEmail(email)) {
    res.status(409).json({ error: { message: "Email already registered", code: "email_exists" } });
    return;
  }
  const user = createUser({
    email,
    password_hash: await hashPassword(password),
    display_name: display_name || null,
    plan_tier: "free",
    role: "user",
    is_active: true,
    total_spent: 0,
    balance: 0,
    rate_limit_rpm: 60,
    rate_limit_tpm: 10000,
  });
  const token = generateToken(user.id, user.email, user.role);
  res.json({
    token,
    profile: toPublicProfile(user),
  });
});

// =============================================================================
// AUTHENTICATED USER ENDPOINTS
// =============================================================================

// GET /v1/user/profile
router.get("/user/profile", authMiddleware, (req: AuthenticatedRequest, res) => {
  const user = getUserById(req.user!.id);
  if (!user) {
    res.status(404).json({ error: { message: "User not found", code: "user_not_found" } });
    return;
  }
  res.json(toPublicProfile(user));
});

// GET /v1/user/stats
router.get("/user/stats", authMiddleware, (req: AuthenticatedRequest, res) => {
  const userLogs = listApiLogs().filter((l) => l.profile_id === req.user!.id);
  const total_requests = userLogs.length;
  const total_tokens = userLogs.reduce((sum, l) => sum + l.total_tokens, 0);
  const total_cost = userLogs.reduce((sum, l) => sum + l.estimated_cost, 0);
  res.json({ total_requests, total_tokens, total_cost });
});

// GET /v1/user/balance
router.get("/user/balance", authMiddleware, (req: AuthenticatedRequest, res) => {
  const user = getUserById(req.user!.id);
  if (!user) {
    res.status(404).json({ error: { message: "User not found", code: "user_not_found" } });
    return;
  }
  const activePackageTokens = listTransactions()
    .filter((t) => t.profile_id === user.id && t.transaction_type === "package_purchase" && t.status === "completed")
    .reduce((sum, t) => sum + t.amount, 0);
  res.json({
    balance: user.balance,
    active_package_tokens: activePackageTokens,
    total_available: user.balance + activePackageTokens,
  });
});

// GET /v1/user/usage
router.get("/user/usage", authMiddleware, (req: AuthenticatedRequest, res) => {
  const userLogs = listApiLogs().filter((l) => l.profile_id === req.user!.id);
  const total_requests = userLogs.length;
  const total_tokens = userLogs.reduce((sum, l) => sum + l.total_tokens, 0);
  const total_cost_usd = userLogs.reduce((sum, l) => sum + l.estimated_cost, 0);
  const total_billed_from_balance = userLogs.filter((l) => l.profile_id).reduce((sum, l) => sum + l.estimated_cost, 0);
  const total_billed_from_packages = 0;
  res.json({ total_requests, total_tokens, total_cost_usd, total_billed_from_balance, total_billed_from_packages });
});

// GET /v1/user/transactions
router.get("/user/transactions", authMiddleware, (req: AuthenticatedRequest, res) => {
  const userTxns = listTransactions()
    .filter((t) => t.profile_id === req.user!.id)
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

// GET /v1/user/tokens — list API keys
router.get("/user/tokens", authMiddleware, (req: AuthenticatedRequest, res) => {
  const userKeys = listApiKeysForUser(req.user!.id)
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

// POST /v1/user/tokens/generate — generate API key
router.post("/user/tokens/generate", authMiddleware, (req: AuthenticatedRequest, res) => {
  const { name, expires_in_days } = req.body || {};
  const rawKey = generateApiKey();
  const key = createApiKey({
    profile_id: req.user!.id,
    key_prefix: prefixApiKey(rawKey),
    key_hash: hashApiKey(rawKey),
    name: name || "API Key",
    status: "active",
    expires_at: expires_in_days ? new Date(Date.now() + expires_in_days * 86400000).toISOString() : undefined,
  });
  res.json({ id: key.id, key_prefix: key.key_prefix, name: key.name, raw_key: rawKey, status: "active" });
});

// POST /v1/user/tokens/:id/revoke
router.post("/user/tokens/:id/revoke", authMiddleware, (req: AuthenticatedRequest, res) => {
  const id = req.params.id as string;
  const key = getApiKeyById(id);
  if (!key || key.profile_id !== req.user!.id) {
    res.status(404).json({ error: { message: "Token not found", code: "token_not_found" } });
    return;
  }
  revokeApiKey(id);
  res.json({ id, status: "revoked" });
});

// POST /v1/user/tokens/:id/rotate
router.post("/user/tokens/:id/rotate", authMiddleware, (req: AuthenticatedRequest, res) => {
  const id = req.params.id as string;
  const key = getApiKeyById(id);
  if (!key || key.profile_id !== req.user!.id) {
    res.status(404).json({ error: { message: "Token not found", code: "token_not_found" } });
    return;
  }
  const rawKey = generateApiKey();
  rotateApiKey(id, hashApiKey(rawKey), prefixApiKey(rawKey));
  res.json({ id: key.id, key_prefix: prefixApiKey(rawKey), name: key.name, raw_key: rawKey, status: "active" });
});

// =============================================================================
// ADMIN ENDPOINTS
// =============================================================================

// GET /v1/admin/analytics
router.get("/admin/analytics", authMiddleware, requireAdmin, (req: AuthenticatedRequest, res) => {
  const activeUsers = listUsers().filter((u) => u.is_active).length;
  const activeModels = listModels().filter((m) => m.is_active).length;
  const totalRequests = listApiLogs().length;
  const totalCost = listApiLogs().reduce((sum, l) => sum + l.estimated_cost, 0);
  const totalTransactions = listTransactions().length;
  const packageRevenue = listTransactions()
    .filter((t) => t.transaction_type === "package_purchase" && t.status === "completed")
    .reduce((sum, t) => sum + t.amount, 0);
  res.json({
    users_total: listUsers().length,
    users_active: activeUsers,
    models_total: listModels().length,
    models_active: activeModels,
    api_requests_total: totalRequests,
    api_cost_total: totalCost,
    transactions_total: totalTransactions,
    package_revenue_cents: packageRevenue,
  });
});

// GET /v1/admin/models
router.get("/admin/models", authMiddleware, requireAdmin, (req: AuthenticatedRequest, res) => {
  const page = parseInt(req.query.page as string) || 1;
  const pageSize = parseInt(req.query.page_size as string) || 20;
  const search = (req.query.search as string)?.toLowerCase() || "";
  const isActive = req.query.is_active as string;
  let all = listModels();
  if (search) {
    all = all.filter((m) => m.display_name.toLowerCase().includes(search) || m.id.toLowerCase().includes(search));
  }
  if (isActive && isActive !== "all") {
    all = all.filter((m) => m.is_active === (isActive === "true"));
  }
  res.json({ data: paginate(all, page, pageSize), meta: paginateMeta(all.length, page, pageSize) });
});

// POST /v1/admin/models
router.post("/admin/models", authMiddleware, requireAdmin, (req: AuthenticatedRequest, res) => {
  const payload = req.body;
  const model = createModel({
    id: payload.id,
    slug: payload.slug,
    provider_model_id: payload.provider_model_id,
    provider_name: payload.provider_name,
    display_name: payload.display_name,
    description: payload.description,
    pricing_input_per_m: payload.pricing_input_per_m || 0,
    pricing_output_per_m: payload.pricing_output_per_m || 0,
    supports_streaming: payload.supports_streaming ?? false,
    supports_functions: payload.supports_functions ?? false,
    is_active: payload.is_active ?? true,
    context_window: payload.context_window || 4096,
    max_output_tokens: payload.max_output_tokens || 4096,
    rate_limit_rpm: payload.rate_limit_rpm || 1000,
    rate_limit_tpm: payload.rate_limit_tpm || 10000,
    sort_order: payload.sort_order || 0,
  });
  res.json(model);
});

// PATCH /v1/admin/models/:id
router.patch("/admin/models/:id", authMiddleware, requireAdmin, (req: AuthenticatedRequest, res) => {
  const model = updateModel(req.params.id as string, req.body);
  if (!model) {
    res.status(404).json({ error: { message: "Model not found", code: "model_not_found" } });
    return;
  }
  res.json(model);
});

// GET /v1/admin/users
router.get("/admin/users", authMiddleware, requireAdmin, (req: AuthenticatedRequest, res) => {
  const page = parseInt(req.query.page as string) || 1;
  const pageSize = parseInt(req.query.page_size as string) || 20;
  const search = (req.query.search as string)?.toLowerCase() || "";
  const planTier = req.query.plan_tier as string;
  const isActive = req.query.is_active as string;
  let all = listUsers();
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
router.patch("/admin/users/:id", authMiddleware, requireAdmin, (req: AuthenticatedRequest, res) => {
  const user = updateUser(req.params.id as string, req.body);
  if (!user) {
    res.status(404).json({ error: { message: "User not found", code: "user_not_found" } });
    return;
  }
  res.json(user);
});

// GET /v1/admin/transactions
router.get("/admin/transactions", authMiddleware, requireAdmin, (req: AuthenticatedRequest, res) => {
  const page = parseInt(req.query.page as string) || 1;
  const pageSize = parseInt(req.query.page_size as string) || 20;
  const profileId = req.query.profile_id as string;
  const transactionType = req.query.transaction_type as string;
  const status = req.query.status as string;
  let all = listTransactions();
  if (profileId) all = all.filter((t) => t.profile_id === profileId);
  if (transactionType) all = all.filter((t) => t.transaction_type === transactionType);
  if (status) all = all.filter((t) => t.status === status);
  res.json({ data: paginate(all, page, pageSize), meta: paginateMeta(all.length, page, pageSize) });
});

// GET /v1/admin/packages
router.get("/admin/packages", authMiddleware, requireAdmin, (req: AuthenticatedRequest, res) => {
  const page = parseInt(req.query.page as string) || 1;
  const pageSize = parseInt(req.query.page_size as string) || 20;
  const search = (req.query.search as string)?.toLowerCase() || "";
  const status = req.query.status as string;
  let all = listPackages();
  if (search) all = all.filter((p) => p.name.toLowerCase().includes(search));
  if (status && status !== "all") all = all.filter((p) => p.status === status);
  res.json({ data: paginate(all, page, pageSize), meta: paginateMeta(all.length, page, pageSize) });
});

// POST /v1/admin/packages
router.post("/admin/packages", authMiddleware, requireAdmin, (req: AuthenticatedRequest, res) => {
  const payload = req.body;
  const pkg = createPackage({
    id: payload.id,
    name: payload.name || "",
    description: payload.description,
    token_amount: payload.token_amount || 0,
    bonus_tokens: payload.bonus_tokens || 0,
    price_usd_cents: payload.price_usd_cents || 0,
    display_price: payload.display_price || "$0.00",
    is_featured: payload.is_featured ?? false,
    sort_order: payload.sort_order || 0,
    status: payload.status || "active",
  });
  res.json(pkg);
});

// PATCH /v1/admin/packages/:id
router.patch("/admin/packages/:id", authMiddleware, requireAdmin, (req: AuthenticatedRequest, res) => {
  const pkg = updatePackage(req.params.id as string, req.body);
  if (!pkg) {
    res.status(404).json({ error: { message: "Package not found", code: "package_not_found" } });
    return;
  }
  res.json(pkg);
});

// GET /v1/admin/promocodes
router.get("/admin/promocodes", authMiddleware, requireAdmin, (req: AuthenticatedRequest, res) => {
  const page = parseInt(req.query.page as string) || 1;
  const pageSize = parseInt(req.query.page_size as string) || 20;
  const search = (req.query.search as string)?.toLowerCase() || "";
  const isActive = req.query.is_active as string;
  let all = listPromocodes();
  if (search) all = all.filter((p) => p.code.toLowerCase().includes(search));
  if (isActive && isActive !== "all") all = all.filter((p) => p.is_active === (isActive === "true"));
  res.json({ data: paginate(all, page, pageSize), meta: paginateMeta(all.length, page, pageSize) });
});

// POST /v1/admin/promocodes
router.post("/admin/promocodes", authMiddleware, requireAdmin, (req: AuthenticatedRequest, res) => {
  const payload = req.body;
  const promocode = createPromocode({
    id: payload.id,
    code: payload.code || "",
    description: payload.description,
    discount_type: payload.discount_type || "percentage",
    discount_value: payload.discount_value || 0,
    max_uses: payload.max_uses || 0,
    max_uses_per_user: payload.max_uses_per_user || 1,
    min_package_price_cents: payload.min_package_price_cents || null,
    is_active: payload.is_active ?? true,
    starts_at: payload.starts_at || null,
    expires_at: payload.expires_at || null,
  });
  res.json(promocode);
});

// PATCH /v1/admin/promocodes/:id
router.patch("/admin/promocodes/:id", authMiddleware, requireAdmin, (req: AuthenticatedRequest, res) => {
  const promocode = updatePromocode(req.params.id as string, req.body);
  if (!promocode) {
    res.status(404).json({ error: { message: "Promocode not found", code: "promocode_not_found" } });
    return;
  }
  res.json(promocode);
});

// GET /v1/admin/logs
router.get("/admin/logs", authMiddleware, requireAdmin, (req: AuthenticatedRequest, res) => {
  const page = parseInt(req.query.page as string) || 1;
  const pageSize = parseInt(req.query.page_size as string) || 20;
  const profileId = req.query.profile_id as string;
  const modelSlug = req.query.model_slug as string;
  const status = req.query.status as string;
  const search = (req.query.search as string)?.toLowerCase() || "";
  let all = listApiLogs();
  if (profileId) all = all.filter((l) => l.profile_id === profileId);
  if (modelSlug) all = all.filter((l) => l.model_slug === modelSlug);
  if (status) all = all.filter((l) => l.status === status);
  if (search) all = all.filter((l) => l.model_slug.toLowerCase().includes(search));
  res.json({ data: paginate(all, page, pageSize), meta: paginateMeta(all.length, page, pageSize) });
});

// =============================================================================
// ADMIN MANAGEMENT (Primary Admin Only)
// =============================================================================

// GET /v1/admin/admins — list all admins
router.get("/admin/admins", authMiddleware, requireAdmin, (req: AuthenticatedRequest, res) => {
  const admins = listUsers().filter((u) => u.role === "admin");
  res.json({ data: admins.map((a) => ({ id: a.id, email: a.email, display_name: a.display_name, is_active: a.is_active, created_at: a.created_at })) });
});

// POST /v1/admin/admins — create new admin (primary admin only)
router.post("/admin/admins", authMiddleware, requirePrimaryAdmin, async (req: AuthenticatedRequest, res) => {
  const { email, password, display_name } = req.body || {};
  if (!email || !password) {
    res.status(400).json({ error: { message: "Email and password required", code: "missing_fields" } });
    return;
  }
  if (getUserByEmail(email)) {
    res.status(409).json({ error: { message: "Email already exists", code: "email_exists" } });
    return;
  }
  const admin = createUser({
    email,
    password_hash: await hashPassword(password),
    display_name: display_name || null,
    plan_tier: "enterprise",
    role: "admin",
    is_active: true,
    total_spent: 0,
    balance: 0,
    rate_limit_rpm: 1000,
    rate_limit_tpm: 100000,
  });
  createAuditLog(req.user!.id, req.user!.email, "create_admin", "admin", admin.id, `Created admin ${email}`);
  res.json({ id: admin.id, email: admin.email, display_name: admin.display_name, created_at: admin.created_at });
});

// DELETE /v1/admin/admins/:id — delete admin (primary admin only)
router.delete("/admin/admins/:id", authMiddleware, requirePrimaryAdmin, (req: AuthenticatedRequest, res) => {
  const id = req.params.id as string;
  const user = getUserById(id);
  if (!user || user.role !== "admin") {
    res.status(404).json({ error: { message: "Admin not found", code: "admin_not_found" } });
    return;
  }
  if (user.email === "jdusi908@gmail.com") {
    res.status(403).json({ error: { message: "Cannot delete primary admin", code: "cannot_delete_primary" } });
    return;
  }
  updateUser(id, { is_active: false, role: "user" });
  createAuditLog(req.user!.id, req.user!.email, "delete_admin", "admin", id, `Deleted admin ${user.email}`);
  res.json({ id, status: "deleted", email: user.email });
});

// =============================================================================
// USER MANAGEMENT ENHANCEMENTS
// =============================================================================

// POST /v1/admin/users/:id/balance — adjust user balance
router.post("/admin/users/:id/balance", authMiddleware, requireAdmin, (req: AuthenticatedRequest, res) => {
  const id = req.params.id as string;
  const { amount, reason } = req.body || {};
  if (typeof amount !== "number") {
    res.status(400).json({ error: { message: "Amount is required (number)", code: "missing_amount" } });
    return;
  }
  const user = getUserById(id);
  if (!user) {
    res.status(404).json({ error: { message: "User not found", code: "user_not_found" } });
    return;
  }
  const newBalance = user.balance + amount;
  updateUser(id, { balance: newBalance });
  createTransaction({
    profile_id: id,
    amount: Math.abs(amount),
    balance_after: newBalance,
    transaction_type: amount >= 0 ? "admin_credit" : "admin_debit",
    status: "completed",
    description: reason || `Admin balance adjustment by ${req.user!.email}`,
  });
  createAuditLog(req.user!.id, req.user!.email, "adjust_balance", "user", id, `Adjusted balance by ${amount} cents. Reason: ${reason || "N/A"}`);
  res.json({ id, balance: newBalance, adjustment: amount, reason: reason || "N/A" });
});

// =============================================================================
// AUDIT LOG
// =============================================================================

// GET /v1/admin/audit-log
router.get("/admin/audit-log", authMiddleware, requireAdmin, (req: AuthenticatedRequest, res) => {
  const page = parseInt(req.query.page as string) || 1;
  const pageSize = parseInt(req.query.page_size as string) || 20;
  const action = req.query.action as string;
  const adminId = req.query.admin_id as string;
  let all = listAuditLogs();
  if (action) all = all.filter((l) => l.action === action);
  if (adminId) all = all.filter((l) => l.admin_id === adminId);
  res.json({ data: paginate(all, page, pageSize), meta: paginateMeta(all.length, page, pageSize) });
});

export default router;
