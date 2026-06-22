import { describe, it, expect, beforeEach } from "vitest";
import request from "supertest";
import app from "../app";
import { cleanup, createTestUser, getJwtToken } from "../lib/test-utils";
import { hashApiKey } from "../lib/api-key";
import { createApiKey, listApiKeysForUser, getApiKeyById } from "../services/api-key";
import { generateToken } from "../middlewares/auth";

const API = "/api/v1";

beforeEach(() => {
  cleanup();
});

// =============================================================================
// AUTHENTICATION
// =============================================================================

describe("POST /auth/register", () => {
  it("registers a new user with valid credentials", async () => {
    const res = await request(app)
      .post(`${API}/auth/register`)
      .send({ email: "new@example.com", password: "password123", display_name: "New User" });

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("token");
    expect(res.body).toHaveProperty("profile");
    expect(res.body.profile.email).toBe("new@example.com");
    expect(res.body.profile.display_name).toBe("New User");
    expect(res.body.profile.plan_tier).toBe("free");
  });

  it("rejects duplicate email", async () => {
    await createTestUser("dup@example.com", "password123");
    const res = await request(app)
      .post(`${API}/auth/register`)
      .send({ email: "dup@example.com", password: "password123" });

    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe("email_exists");
  });

  it("rejects short passwords", async () => {
    const res = await request(app)
      .post(`${API}/auth/register`)
      .send({ email: "short@example.com", password: "1234567" });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("password_too_short");
  });

  it("rejects missing credentials", async () => {
    const res = await request(app)
      .post(`${API}/auth/register`)
      .send({});

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("missing_credentials");
  });
});

describe("POST /auth/login", () => {
  it("logs in with valid credentials", async () => {
    const { user } = await createTestUser("login@example.com", "password123");
    const res = await request(app)
      .post(`${API}/auth/login`)
      .send({ email: "login@example.com", password: "password123" });

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("token");
    expect(res.body.profile.email).toBe("login@example.com");
  });

  it("rejects invalid password", async () => {
    await createTestUser("badpass@example.com", "password123");
    const res = await request(app)
      .post(`${API}/auth/login`)
      .send({ email: "badpass@example.com", password: "wrongpassword" });

    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe("invalid_credentials");
  });

  it("rejects non-existent user", async () => {
    const res = await request(app)
      .post(`${API}/auth/login`)
      .send({ email: "nobody@example.com", password: "password123" });

    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe("invalid_credentials");
  });

  it("rejects missing credentials", async () => {
    const res = await request(app)
      .post(`${API}/auth/login`)
      .send({});

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("missing_credentials");
  });
});

// =============================================================================
// PROTECTED USER ENDPOINTS
// =============================================================================

describe("GET /user/profile", () => {
  it("returns profile for authenticated user", async () => {
    const { user } = await createTestUser("profile@example.com", "password123");
    const token = generateToken(user.id, user.email, user.role);
    const res = await request(app)
      .get(`${API}/user/profile`)
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.email).toBe("profile@example.com");
  });

  it("returns 401 without token", async () => {
    const res = await request(app).get(`${API}/user/profile`);
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe("unauthorized");
  });

  it("returns 401 with invalid token", async () => {
    const res = await request(app)
      .get(`${API}/user/profile`)
      .set("Authorization", "Bearer invalid_token");
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe("invalid_token");
  });
});

// =============================================================================
// API KEY MANAGEMENT
// =============================================================================

describe("GET /user/tokens", () => {
  it("lists API keys for authenticated user", async () => {
    const { user } = await createTestUser("keys@example.com", "password123");
    const token = generateToken(user.id, user.email, user.role);
    const rawKey = "thc_" + "a".repeat(32);
    createApiKey({
      profile_id: user.id,
      key_prefix: rawKey.slice(0, 10),
      key_hash: hashApiKey(rawKey),
      name: "My Key",
      status: "active",
    });

    const res = await request(app)
      .get(`${API}/user/tokens`)
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBe(1);
    expect(res.body[0].name).toBe("My Key");
    expect(res.body[0]).not.toHaveProperty("key_hash");
    expect(res.body[0]).not.toHaveProperty("raw_key");
  });
});

describe("POST /user/tokens/generate", () => {
  it("generates a new API key with thc_ prefix", async () => {
    const { user } = await createTestUser("genkey@example.com", "password123");
    const token = generateToken(user.id, user.email, user.role);
    const res = await request(app)
      .post(`${API}/user/tokens/generate`)
      .set("Authorization", `Bearer ${token}`)
      .send({ name: "Production Key" });

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("raw_key");
    expect(res.body.raw_key).toMatch(/^thc_[a-f0-9]{32}$/);
    expect(res.body.name).toBe("Production Key");
    expect(res.body.status).toBe("active");
  });

  it("stores only hashed key", async () => {
    const { user } = await createTestUser("hashkey@example.com", "password123");
    const token = generateToken(user.id, user.email, user.role);
    const res = await request(app)
      .post(`${API}/user/tokens/generate`)
      .set("Authorization", `Bearer ${token}`)
      .send({ name: "Test Key" });

    const keys = listApiKeysForUser(user.id);
    expect(keys.length).toBe(1);
    expect(keys[0].key_hash).toBe(hashApiKey(res.body.raw_key));
    expect(keys[0].key_hash).not.toBe(res.body.raw_key);
  });
});

describe("POST /user/tokens/:id/revoke", () => {
  it("revokes an API key", async () => {
    const { user } = await createTestUser("revoke@example.com", "password123");
    const token = generateToken(user.id, user.email, user.role);
    const rawKey = "thc_" + "b".repeat(32);
    const key = createApiKey({
      profile_id: user.id,
      key_prefix: rawKey.slice(0, 10),
      key_hash: hashApiKey(rawKey),
      name: "To Revoke",
      status: "active",
    });

    const res = await request(app)
      .post(`${API}/user/tokens/${key.id}/revoke`)
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.status).toBe("revoked");
  });

  it("returns 404 for other user's key", async () => {
    const { user: user1 } = await createTestUser("u1@example.com", "password123");
    const { user: user2 } = await createTestUser("u2@example.com", "password123");
    const token = generateToken(user1.id, user1.email, user1.role);
    const rawKey = "thc_" + "c".repeat(32);
    const key = createApiKey({
      profile_id: user2.id,
      key_prefix: rawKey.slice(0, 10),
      key_hash: hashApiKey(rawKey),
      name: "Not Mine",
      status: "active",
    });

    const res = await request(app)
      .post(`${API}/user/tokens/${key.id}/revoke`)
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(404);
  });
});

describe("POST /user/tokens/:id/rotate", () => {
  it("rotates an API key", async () => {
    const { user } = await createTestUser("rotate@example.com", "password123");
    const token = generateToken(user.id, user.email, user.role);
    const rawKey = "thc_" + "d".repeat(32);
    const key = createApiKey({
      profile_id: user.id,
      key_prefix: rawKey.slice(0, 10),
      key_hash: hashApiKey(rawKey),
      name: "To Rotate",
      status: "active",
    });

    const res = await request(app)
      .post(`${API}/user/tokens/${key.id}/rotate`)
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.raw_key).toMatch(/^thc_[a-f0-9]{32}$/);
    expect(res.body.raw_key).not.toBe(rawKey);
  });
});

// =============================================================================
// ADMIN PROTECTION
// =============================================================================

describe("GET /admin/analytics", () => {
  it("allows admin access", async () => {
    const { user: admin } = await createTestUser("admin@example.com", "password123", { role: "admin" });
    const token = generateToken(admin.id, admin.email, admin.role);
    const res = await request(app)
      .get(`${API}/admin/analytics`)
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("users_total");
  });

  it("forbids non-admin user", async () => {
    const { user } = await createTestUser("user@example.com", "password123", { role: "user" });
    const token = generateToken(user.id, user.email, user.role);
    const res = await request(app)
      .get(`${API}/admin/analytics`)
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe("forbidden");
  });
});

// =============================================================================
// ADMIN MANAGEMENT
// =============================================================================

describe("GET /admin/admins", () => {
  it("lists all admins", async () => {
    const { user: admin } = await createTestUser("admin2@example.com", "password123", { role: "admin" });
    const token = generateToken(admin.id, admin.email, admin.role);
    const res = await request(app)
      .get(`${API}/admin/admins`)
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("data");
    expect(Array.isArray(res.body.data)).toBe(true);
  });
});

describe("POST /admin/admins", () => {
  it("allows primary admin to create new admin", async () => {
    const { user: primaryAdmin } = await createTestUser("jdusi908@gmail.com", "password123", { role: "admin" });
    const token = generateToken(primaryAdmin.id, primaryAdmin.email, primaryAdmin.role);
    const res = await request(app)
      .post(`${API}/admin/admins`)
      .set("Authorization", `Bearer ${token}`)
      .send({ email: "newadmin@example.com", password: "password123", display_name: "New Admin" });

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("id");
    expect(res.body.email).toBe("newadmin@example.com");
  });

  it("forbids non-primary admin to create admin", async () => {
    const { user: regularAdmin } = await createTestUser("regularadmin@example.com", "password123", { role: "admin" });
    const token = generateToken(regularAdmin.id, regularAdmin.email, regularAdmin.role);
    const res = await request(app)
      .post(`${API}/admin/admins`)
      .set("Authorization", `Bearer ${token}`)
      .send({ email: "newadmin2@example.com", password: "password123" });

    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe("not_primary_admin");
  });
});

describe("DELETE /admin/admins/:id", () => {
  it("allows primary admin to delete admin", async () => {
    const { user: primaryAdmin } = await createTestUser("jdusi908@gmail.com", "password123", { role: "admin" });
    const { user: targetAdmin } = await createTestUser("targetadmin@example.com", "password123", { role: "admin" });
    const token = generateToken(primaryAdmin.id, primaryAdmin.email, primaryAdmin.role);
    const res = await request(app)
      .delete(`${API}/admin/admins/${targetAdmin.id}`)
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.status).toBe("deleted");
  });

  it("prevents deleting primary admin", async () => {
    const { user: primaryAdmin } = await createTestUser("jdusi908@gmail.com", "password123", { role: "admin" });
    const token = generateToken(primaryAdmin.id, primaryAdmin.email, primaryAdmin.role);
    const res = await request(app)
      .delete(`${API}/admin/admins/${primaryAdmin.id}`)
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe("cannot_delete_primary");
  });
});

// =============================================================================
// USER MANAGEMENT
// =============================================================================

describe("POST /admin/users/:id/balance", () => {
  it("adjusts user balance", async () => {
    const { user: admin } = await createTestUser("admin3@example.com", "password123", { role: "admin" });
    const { user: targetUser } = await createTestUser("targetuser@example.com", "password123", { balance: 1000 });
    const token = generateToken(admin.id, admin.email, admin.role);
    const res = await request(app)
      .post(`${API}/admin/users/${targetUser.id}/balance`)
      .set("Authorization", `Bearer ${token}`)
      .send({ amount: 500, reason: "Test credit" });

    expect(res.status).toBe(200);
    expect(res.body.balance).toBe(1500);
    expect(res.body.adjustment).toBe(500);
  });

  it("rejects non-admin", async () => {
    const { user: regularUser } = await createTestUser("regular2@example.com", "password123");
    const { user: targetUser } = await createTestUser("targetuser2@example.com", "password123");
    const token = generateToken(regularUser.id, regularUser.email, regularUser.role);
    const res = await request(app)
      .post(`${API}/admin/users/${targetUser.id}/balance`)
      .set("Authorization", `Bearer ${token}`)
      .send({ amount: 500 });

    expect(res.status).toBe(403);
  });
});

// =============================================================================
// AUDIT LOG
// =============================================================================

describe("GET /admin/audit-log", () => {
  it("returns audit logs for admin", async () => {
    const { user: admin } = await createTestUser("admin4@example.com", "password123", { role: "admin" });
    const token = generateToken(admin.id, admin.email, admin.role);
    const res = await request(app)
      .get(`${API}/admin/audit-log`)
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("data");
    expect(res.body).toHaveProperty("meta");
  });
});

// =============================================================================
// MODEL MANAGEMENT
// =============================================================================

describe("POST /admin/models", () => {
  it("creates a new model with RPM/TPM", async () => {
    const { user: admin } = await createTestUser("admin5@example.com", "password123", { role: "admin" });
    const token = generateToken(admin.id, admin.email, admin.role);
    const res = await request(app)
      .post(`${API}/admin/models`)
      .set("Authorization", `Bearer ${token}`)
      .send({
        id: "test-model",
        slug: "test-model",
        provider_model_id: "test-model-v1",
        provider_name: "TestProvider",
        display_name: "Test Model",
        pricing_input_per_m: 1.0,
        pricing_output_per_m: 2.0,
        rate_limit_rpm: 500,
        rate_limit_tpm: 5000,
        is_active: true,
      });

    expect(res.status).toBe(200);
    expect(res.body.rate_limit_rpm).toBe(500);
    expect(res.body.rate_limit_tpm).toBe(5000);
  });
});

describe("PATCH /admin/models/:id", () => {
  it("disables a model", async () => {
    const { user: admin } = await createTestUser("admin6@example.com", "password123", { role: "admin" });
    const token = generateToken(admin.id, admin.email, admin.role);
    const res = await request(app)
      .patch(`${API}/admin/models/gpt-4o`)
      .set("Authorization", `Bearer ${token}`)
      .send({ is_active: false });

    expect(res.status).toBe(200);
    expect(res.body.is_active).toBe(false);
  });
});

// =============================================================================
// PUBLIC ENDPOINTS
// =============================================================================

describe("GET /models", () => {
  it("returns list of models without auth", async () => {
    const res = await request(app).get(`${API}/models`);
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("data");
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.data.length).toBeGreaterThan(0);
  });
});

describe("GET /packages", () => {
  it("returns list of packages without auth", async () => {
    const res = await request(app).get(`${API}/packages`);
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("data");
    expect(Array.isArray(res.body.data)).toBe(true);
  });
});

// =============================================================================
// BILLING
// =============================================================================

describe("POST /billing/calculate", () => {
  it("calculates cost for a model", async () => {
    const res = await request(app).post(`${API}/billing/calculate`).send({
      model_id: "gpt-4o",
      input_tokens: 1_000_000,
      output_tokens: 0,
    });
    expect(res.status).toBe(200);
    expect(res.body.cost).toBe(250); // $2.50/1M = 250 cents
    expect(res.body.model_slug).toBe("gpt-4o");
  });

  it("returns 0 for unknown model", async () => {
    const res = await request(app).post(`${API}/billing/calculate`).send({
      model_id: "unknown-model",
      input_tokens: 1000,
      output_tokens: 1000,
    });
    expect(res.status).toBe(200);
    expect(res.body.cost).toBe(0);
  });

  it("rejects missing fields", async () => {
    const res = await request(app).post(`${API}/billing/calculate`).send({
      model_id: "gpt-4o",
      input_tokens: 1000,
    });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("missing_fields");
  });
});

describe("POST /billing/charge", () => {
  it("charges user balance for API usage", async () => {
    const { user } = await createTestUser("charge@example.com", "password123", { balance: 1000 });
    const token = generateToken(user.id, user.email, user.role);
    const res = await request(app)
      .post(`${API}/billing/charge`)
      .set("Authorization", `Bearer ${token}`)
      .send({
        model_id: "gpt-4o-mini",
        input_tokens: 1_000_000,
        output_tokens: 0,
      });
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.cost).toBe(15); // $0.15/1M = 15 cents
    expect(res.body.balance_after).toBe(985);
  });

  it("returns 402 for insufficient balance", async () => {
    const { user } = await createTestUser("poor@example.com", "password123", { balance: 5 });
    const token = generateToken(user.id, user.email, user.role);
    const res = await request(app)
      .post(`${API}/billing/charge`)
      .set("Authorization", `Bearer ${token}`)
      .send({
        model_id: "gpt-4o-mini",
        input_tokens: 1_000_000,
        output_tokens: 0,
      });
    expect(res.status).toBe(402);
    expect(res.body.error.code).toBe("insufficient_balance");
    expect(res.body.error.cost).toBe(15);
  });
});

describe("GET /user/billing", () => {
  it("returns billing summary", async () => {
    const { user } = await createTestUser("billing@example.com", "password123", { balance: 500 });
    const token = generateToken(user.id, user.email, user.role);
    const res = await request(app)
      .get(`${API}/user/billing`)
      .set("Authorization", `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.balance).toBe(500);
    expect(res.body).toHaveProperty("total_spent");
    expect(res.body).toHaveProperty("total_requests");
    expect(res.body).toHaveProperty("total_tokens");
    expect(res.body).toHaveProperty("total_cost_usd");
  });
});

// =============================================================================
// PAYMENT REQUESTS
// =============================================================================

describe("POST /user/payment-requests", () => {
  it("creates a payment request", async () => {
    const { user } = await createTestUser("pr@example.com", "password123");
    const token = generateToken(user.id, user.email, user.role);
    const res = await request(app)
      .post(`${API}/user/payment-requests`)
      .set("Authorization", `Bearer ${token}`)
      .send({ amount: 5000, currency: "USD", screenshot_url: "http://example.com/screenshot.png" });
    expect(res.status).toBe(201);
    expect(res.body.amount).toBe(5000);
    expect(res.body.currency).toBe("USD");
    expect(res.body.status).toBe("pending");
    expect(res.body.screenshot_url).toBe("http://example.com/screenshot.png");
  });

  it("rejects invalid amount", async () => {
    const { user } = await createTestUser("pr2@example.com", "password123");
    const token = generateToken(user.id, user.email, user.role);
    const res = await request(app)
      .post(`${API}/user/payment-requests`)
      .set("Authorization", `Bearer ${token}`)
      .send({ amount: -100, currency: "USD" });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("invalid_amount");
  });
});

describe("GET /user/payment-requests", () => {
  it("lists user payment requests", async () => {
    const { user } = await createTestUser("pr3@example.com", "password123");
    const token = generateToken(user.id, user.email, user.role);
    await request(app)
      .post(`${API}/user/payment-requests`)
      .set("Authorization", `Bearer ${token}`)
      .send({ amount: 1000, currency: "USD" });
    const res = await request(app)
      .get(`${API}/user/payment-requests`)
      .set("Authorization", `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBe(1);
    expect(res.body[0].amount).toBe(1000);
  });
});

describe("GET /admin/payment-requests", () => {
  it("lists all payment requests for admin", async () => {
    const { user: admin } = await createTestUser("admin7@example.com", "password123", { role: "admin" });
    const { user: regular } = await createTestUser("regular@example.com", "password123");
    const adminToken = generateToken(admin.id, admin.email, admin.role);
    const userToken = generateToken(regular.id, regular.email, regular.role);
    await request(app)
      .post(`${API}/user/payment-requests`)
      .set("Authorization", `Bearer ${userToken}`)
      .send({ amount: 2000, currency: "USD" });
    const res = await request(app)
      .get(`${API}/admin/payment-requests`)
      .set("Authorization", `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBeGreaterThan(0);
  });

  it("rejects non-admin", async () => {
    const { user } = await createTestUser("user7@example.com", "password123");
    const token = generateToken(user.id, user.email, user.role);
    const res = await request(app)
      .get(`${API}/admin/payment-requests`)
      .set("Authorization", `Bearer ${token}`);
    expect(res.status).toBe(403);
  });
});

describe("POST /admin/payment-requests/:id/approve", () => {
  it("approves payment request and adds balance", async () => {
    const { user: admin } = await createTestUser("admin8@example.com", "password123", { role: "admin" });
    const { user: regular } = await createTestUser("req@example.com", "password123", { balance: 0 });
    const adminToken = generateToken(admin.id, admin.email, admin.role);
    const userToken = generateToken(regular.id, regular.email, regular.role);
    const prRes = await request(app)
      .post(`${API}/user/payment-requests`)
      .set("Authorization", `Bearer ${userToken}`)
      .send({ amount: 5000, currency: "USD" });
    const prId = prRes.body.id;
    const res = await request(app)
      .post(`${API}/admin/payment-requests/${prId}/approve`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ note: "Approved" });
    expect(res.status).toBe(200);
    expect(res.body.status).toBe("approved");
    expect(res.body.balance_after).toBe(5000);
  });

  it("rejects already processed request", async () => {
    const { user: admin } = await createTestUser("admin9@example.com", "password123", { role: "admin" });
    const { user: regular } = await createTestUser("req2@example.com", "password123");
    const adminToken = generateToken(admin.id, admin.email, admin.role);
    const userToken = generateToken(regular.id, regular.email, regular.role);
    const prRes = await request(app)
      .post(`${API}/user/payment-requests`)
      .set("Authorization", `Bearer ${userToken}`)
      .send({ amount: 1000, currency: "USD" });
    const prId = prRes.body.id;
    await request(app)
      .post(`${API}/admin/payment-requests/${prId}/approve`)
      .set("Authorization", `Bearer ${adminToken}`);
    const res = await request(app)
      .post(`${API}/admin/payment-requests/${prId}/approve`)
      .set("Authorization", `Bearer ${adminToken}`);
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("already_processed");
  });
});

describe("POST /admin/payment-requests/:id/reject", () => {
  it("rejects payment request", async () => {
    const { user: admin } = await createTestUser("admin10@example.com", "password123", { role: "admin" });
    const { user: regular } = await createTestUser("req3@example.com", "password123");
    const adminToken = generateToken(admin.id, admin.email, admin.role);
    const userToken = generateToken(regular.id, regular.email, regular.role);
    const prRes = await request(app)
      .post(`${API}/user/payment-requests`)
      .set("Authorization", `Bearer ${userToken}`)
      .send({ amount: 1000, currency: "USD" });
    const prId = prRes.body.id;
    const res = await request(app)
      .post(`${API}/admin/payment-requests/${prId}/reject`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ note: "Invalid screenshot" });
    expect(res.status).toBe(200);
    expect(res.body.status).toBe("rejected");
  });
});
