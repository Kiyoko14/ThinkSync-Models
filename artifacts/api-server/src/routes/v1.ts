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
import { createPaymentRequest, listPaymentRequests, getPaymentRequestById, updatePaymentRequest } from "../services/payment-request";
import { chargeUser, calculateCost } from "../services/billing";
import { chatCompletions, extractUsage, streamChatCompletions, estimateTokens } from "../services/provider/siliconflow";
import { chatAuthMiddleware, generateToken, verifyToken, type AuthenticatedRequest } from "../middlewares/auth-api-key";

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

// =============================================================================
// CHAT COMPLETIONS (Phase 5B.1 - AI Gateway Foundation)
// =============================================================================

/**
 * POST /v1/chat/completions
 * OpenAI-compatible chat endpoint using SiliconFlow
 */
router.post("/chat/completions", chatAuthMiddleware, async (req: AuthenticatedRequest, res) => {
  const startTime = Date.now();

  try {
    // 1. Parse request
    const { model, messages, temperature, top_p, max_tokens, stream } = req.body || {};

    // 2. Validate required fields
    if (!model) {
      res.status(400).json({
        error: {
          message: "Missing required field: model",
          type: "invalid_request_error",
          code: "missing_model",
        },
      });
      return;
    }

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      res.status(400).json({
        error: {
          message: "Missing required field: messages",
          type: "invalid_request_error",
          code: "missing_messages",
        },
      });
      return;
    }

    // 3. Get model from database
    const { getModelBySlug } = await import("../services/model");
    const modelData = await getModelBySlug(model);

    if (!modelData) {
      res.status(404).json({
        error: {
          message: `Model not found: ${model}`,
          type: "invalid_request_error",
          code: "model_not_found",
        },
      });
      return;
    }

    // 4. Check model is active
    if (!modelData.is_active) {
      res.status(400).json({
        error: {
          message: `Model is inactive: ${model}`,
          type: "invalid_request_error",
          code: "model_inactive",
        },
      });
      return;
    }

    // 5. Check model is visible (for non-admin users)
    if (!modelData.is_visible && req.user?.role !== "admin") {
      res.status(404).json({
        error: {
          message: `Model not found: ${model}`,
          type: "invalid_request_error",
          code: "model_not_found",
        },
      });
      return;
    }

    // 5.5. Check user tier access to model (Phase 5C)
    if (req.user) {
      const { canUserAccessModel } = await import("../services/tier");
      const tierCheck = await canUserAccessModel(req.user.id, modelData.id);
      if (!tierCheck.allowed) {
        res.status(403).json({
          error: {
            message: tierCheck.error || "Tier access denied",
            type: "access_denied",
            code: "tier_required",
            current_tier: tierCheck.userTier?.display_name || 'free',
          },
        });
        return;
      }
    }

    // 6. Handle streaming or non-streaming
    if (stream) {
      // ===================== STREAMING MODE =====================
      
      // Check if model supports streaming (future: check model.supports_streaming)
      if (!modelData.is_visible) {
        res.status(400).json({
          error: {
            message: "Model is not available for streaming",
            type: "invalid_request_error",
            code: "model_not_available",
          },
        });
        return;
      }

      // Set SSE headers
      res.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'X-Accel-Buffering': 'no',
      });

      // Send initial ping to establish connection
      res.write(': connected\n\n');

      let fullContent = '';
      let promptTokens = 0;
      let completionTokens = 0;
      let messageId = `chatcmpl-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      let startTimestamp = Math.floor(Date.now() / 1000);

      try {
        const streamResult = await streamChatCompletions(
          model,
          messages,
          { temperature, top_p, max_tokens }
        );

        // Set up cleanup on client disconnect
        const clientDisconnected = () => {
          console.log(`[STREAM] Client disconnected for ${messageId}`);
          streamResult.close?.();
        };
        req.on('close', clientDisconnected);

        const reader = streamResult.stream.getReader();
        const decoder = new TextDecoder();
        let buffer = '';

        while (true) {
          const { done, value } = await reader.read();
          
          if (done) {
            break;
          }

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() || '';

          for (const line of lines) {
            if (line.startsWith('data: ')) {
              const data = line.slice(6);
              
              if (data === '[DONE]') {
                // Stream completed
                continue;
              }

              try {
                const chunk = JSON.parse(data);
                
                // Extract content delta from SiliconFlow format
                const contentDelta = chunk.choices?.[0]?.delta?.content || '';
                const finishReason = chunk.choices?.[0]?.finish_reason;

                if (contentDelta) {
                  fullContent += contentDelta;
                  completionTokens += estimateTokens(contentDelta);

                  // Send SSE chunk to client
                  const sseChunk = {
                    id: messageId,
                    object: 'chat.completion.chunk',
                    created: startTimestamp,
                    model: model,
                    choices: [
                      {
                        index: 0,
                        delta: { content: contentDelta },
                        finish_reason: finishReason || null,
                      },
                    ],
                  };
                  res.write(`data: ${JSON.stringify(sseChunk)}\n\n`);
                }

                // Get final usage from last chunk if available
                if (chunk.usage) {
                  promptTokens = chunk.usage.prompt_tokens || promptTokens;
                  completionTokens = chunk.usage.completion_tokens || completionTokens;
                }
              } catch (e) {
                // Skip invalid JSON chunks
              }
            }
          }
        }

        // Clean up listener
        req.removeListener('close', clientDisconnected);

        // Send final chunk with usage
        const usage = {
          prompt_tokens: promptTokens,
          completion_tokens: completionTokens,
          total_tokens: promptTokens + completionTokens,
        };

        const finalChunk = {
          id: messageId,
          object: 'chat.completion.chunk',
          created: startTimestamp,
          model: model,
          choices: [
            {
              index: 0,
              delta: {},
              finish_reason: 'stop',
            },
          ],
          usage: usage,
        };
        res.write(`data: ${JSON.stringify(finalChunk)}\n\n`);
        res.write('data: [DONE]\n\n');

        // ===================== BILLING AFTER STREAM =====================
        const totalCost = Math.ceil(
          (usage.prompt_tokens / 1000000) * (modelData.pricing_input_per_m || 2500) +
          (usage.completion_tokens / 1000000) * (modelData.pricing_output_per_m || 10000)
        );

        // Only charge if there's actual usage
        if (totalCost > 0) {
          const { chargeUser } = await import("../services/billing");
          const chargeResult = await chargeUser({
            user_id: req.user!.id,
            model_id: modelData.id,
            input_tokens: usage.prompt_tokens,
            output_tokens: usage.completion_tokens,
            ip_address: req.ip || req.socket.remoteAddress,
            user_agent: req.headers["user-agent"],
          });

          if (!chargeResult.success) {
            console.error(`[STREAM] Billing failed after stream: ${chargeResult.error}`);
          }

          // Log API request
          try {
            const { createApiLog } = await import("../services/api-log");
            await createApiLog({
              profile_id: req.user!.id,
              api_key_id: req.apiKeyId || undefined,
              model_id: modelData.id,
              model_slug: model,
              prompt_tokens: usage.prompt_tokens,
              completion_tokens: usage.completion_tokens,
              total_tokens: usage.total_tokens,
              input_cost: Math.ceil((usage.prompt_tokens / 1000000) * (modelData.pricing_input_per_m || 2500)),
              output_cost: Math.ceil((usage.completion_tokens / 1000000) * (modelData.pricing_output_per_m || 10000)),
              total_cost: totalCost,
              status: chargeResult.success ? 'success' : 'billing_failed',
              stream_enabled: true,
              ip_address: req.ip || req.socket.remoteAddress,
              user_agent: req.headers["user-agent"],
            });
          } catch (logError) {
            console.error(`[STREAM] Failed to create API log:`, logError);
          }
        }

        console.log(`[STREAM] Completed: ${messageId}, tokens: ${usage.prompt_tokens} in / ${usage.completion_tokens} out`);

      } catch (streamError: any) {
        console.error(`[STREAM] Error:`, streamError.message);
        res.write(`data: ${JSON.stringify({ error: { message: streamError.message, type: 'streaming_error' } })}\n\n`);
        res.write('data: [DONE]\n\n');
      }

      res.end();
      return;
    }

    // 6.5. PRE-FLIGHT BALANCE CHECK (prevent negative balance race condition)
    const { getUserById } = await import("../services/user");
    const currentUser = await getUserById(req.user!.id);
    if (!currentUser) {
      res.status(401).json({ error: { message: "User not found", code: "user_not_found" } });
      return;
    }

    const sfResponse = await chatCompletions(
      model,
      messages,
      false,
      { temperature, top_p, max_tokens }
    );

    // 7. Build prompt text for usage estimation fallback
    const promptText = messages.map(m => m.content).join('\n');
    
    // 8. Extract usage from SiliconFlow response (with fallback estimation)
    const completionText = sfResponse.choices?.[0]?.message?.content || '';
    const usage = extractUsage(sfResponse, promptText, completionText);

    // 8.5. Log estimation events for auditing
    if (usage.source === 'estimated') {
      console.warn(`[USAGE-ESTIMATED] Model: ${model}, Prompt tokens: ${usage.prompt_tokens}, Completion tokens: ${usage.completion_tokens}`);
    }

    // 9. Charge user for API usage (Phase 5B.2)
    const { chargeUser } = await import("../services/billing");
    const chargeResult = await chargeUser({
      user_id: req.user!.id,
      model_id: modelData.id,
      input_tokens: usage.prompt_tokens,
      output_tokens: usage.completion_tokens,
      ip_address: req.ip || req.socket.remoteAddress,
      user_agent: req.headers["user-agent"],
    });

    // Handle insufficient balance
    if (!chargeResult.success) {
      if (chargeResult.error === 'insufficient_balance') {
        res.status(402).json({
          error: {
            message: `Insufficient balance. Required: ${chargeResult.cost}, Available: ${chargeResult.balance_before}`,
            type: "insufficient_balance",
            code: "insufficient_balance",
          },
        });
        return;
      }
      // Other billing errors - log but continue (user already got response)
      console.error("Billing error:", chargeResult.error);
    }

    // 9. Create API log entry with actual cost
    const duration = Date.now() - startTime;
    const { createApiLog } = await import("../services/api-log");
    const inputCost = Math.ceil((usage.prompt_tokens / 1000000) * (modelData.pricing_input_per_m || 2500));
    const outputCost = Math.ceil((usage.completion_tokens / 1000000) * (modelData.pricing_output_per_m || 10000));
    const totalCost = chargeResult.success ? chargeResult.cost : (inputCost + outputCost);
    
    // Log creation with error handling - don't fail response if logging fails
    try {
      await createApiLog({
        profile_id: req.user!.id,
        api_key_id: req.apiKeyId || undefined,
        model_id: modelData.id,
        model_slug: model,
        prompt_tokens: usage.prompt_tokens,
        completion_tokens: usage.completion_tokens,
        total_tokens: usage.total_tokens,
        input_cost: inputCost,
        output_cost: outputCost,
        total_cost: totalCost,
        status: "success",
        duration_ms: duration,
        request_model: model,
        stream_enabled: false,
        ip_address: req.ip || req.socket.remoteAddress,
        user_agent: req.headers["user-agent"],
      });
    } catch (logError) {
      // Log failure - balance already deducted, but log is missing
      console.error("CRITICAL: Failed to create API log after successful charge:", logError);
    }

    // 10. Return OpenAI-compatible response
    res.json({
      id: sfResponse.id,
      object: "chat.completion",
      created: sfResponse.created,
      model: model, // Return user-facing model name, not provider_model_id
      choices: sfResponse.choices.map((choice: any) => ({
        index: choice.index,
        message: {
          role: choice.message.role,
          content: choice.message.content,
        },
        finish_reason: choice.finish_reason,
      })),
      usage: {
        prompt_tokens: usage.prompt_tokens,
        completion_tokens: usage.completion_tokens,
        total_tokens: usage.total_tokens,
      },
    });
  } catch (error: any) {
    // Error handling
    const duration = Date.now() - startTime;

    // Log error
    try {
      const { createApiLog } = await import("../services/api-log");
      await createApiLog({
        profile_id: req.user!.id,
        api_key_id: req.apiKeyId || undefined,
        model_slug: req.body?.model || "unknown",
        prompt_tokens: 0,
        completion_tokens: 0,
        total_tokens: 0,
        total_cost: 0,
        status: "error",
        error_message: error.message,
        duration_ms: duration,
        request_model: req.body?.model,
        stream_enabled: false,
        ip_address: req.ip || req.socket.remoteAddress,
        user_agent: req.headers["user-agent"],
      });
    } catch (logError) {
      console.error("Failed to create error log:", logError);
    }

    // Determine error type
    if (error.message?.includes("not found")) {
      res.status(404).json({
        error: {
          message: error.message,
          type: "invalid_request_error",
          code: "model_not_found",
        },
      });
    } else if (error.message?.includes("inactive")) {
      res.status(400).json({
        error: {
          message: error.message,
          type: "invalid_request_error",
          code: "model_inactive",
        },
      });
    } else if (error.message?.includes("not configured")) {
      res.status(503).json({
        error: {
          message: "AI provider not configured",
          type: "server_error",
          code: "provider_not_configured",
        },
      });
    } else {
      res.status(500).json({
        error: {
          message: error.message || "Internal server error",
          type: "server_error",
          code: "internal_error",
        },
      });
    }
  }
});

// =============================================================================
// EXISTING ROUTES BELOW
// =============================================================================

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
router.post("/user/tokens/generate", authMiddleware, async (req: AuthenticatedRequest, res) => {
  const { name, expires_in_days } = req.body || {};
  
  // Check tier API key limit (Phase 5C)
  const { canUserCreateApiKey } = await import("../services/tier");
  const keyCheck = await canUserCreateApiKey(req.user!.id);
  if (!keyCheck.allowed) {
    res.status(403).json({
      error: {
        message: keyCheck.error || "API key limit reached",
        type: "access_denied",
        code: "api_key_limit_reached",
        current: keyCheck.current,
        max: keyCheck.max,
      },
    });
    return;
  }
  
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

// =============================================================================
// BILLING
// =============================================================================

// POST /v1/billing/charge — charge user for API usage
router.post("/billing/charge", authMiddleware, async (req: AuthenticatedRequest, res) => {
  const { model_id, input_tokens, output_tokens } = req.body || {};
  if (!model_id || typeof input_tokens !== "number" || typeof output_tokens !== "number") {
    res.status(400).json({ error: { message: "model_id, input_tokens, output_tokens required", code: "missing_fields" } });
    return;
  }
  const result = await chargeUser({
    user_id: req.user!.id,
    model_id,
    input_tokens,
    output_tokens,
    ip_address: req.ip || req.socket.remoteAddress || undefined,
    user_agent: req.headers["user-agent"],
  });
  if (!result.success) {
    if (result.error === "insufficient_balance") {
      res.status(402).json({ error: { message: "Insufficient balance", code: "insufficient_balance", cost: result.cost, balance: result.balance_before } });
      return;
    }
    res.status(400).json({ error: { message: result.error, code: "charge_failed" } });
    return;
  }
  res.json({ success: true, cost: result.cost, balance_after: result.balance_after, log_id: result.log_id });
});

// POST /v1/billing/calculate — calculate cost without charging
router.post("/billing/calculate", (req, res) => {
  const { model_id, input_tokens, output_tokens } = req.body || {};
  if (!model_id || typeof input_tokens !== "number" || typeof output_tokens !== "number") {
    res.status(400).json({ error: { message: "model_id, input_tokens, output_tokens required", code: "missing_fields" } });
    return;
  }
  const result = calculateCost(model_id, input_tokens, output_tokens);
  res.json({ cost: result.cost, model_slug: result.model_slug });
});

// GET /v1/user/billing — billing summary
router.get("/user/billing", authMiddleware, (req: AuthenticatedRequest, res) => {
  const user = getUserById(req.user!.id);
  if (!user) {
    res.status(404).json({ error: { message: "User not found", code: "user_not_found" } });
    return;
  }
  const userLogs = listApiLogs().filter((l) => l.profile_id === user.id);
  const total_cost = userLogs.reduce((sum, l) => sum + l.estimated_cost, 0);
  const total_tokens = userLogs.reduce((sum, l) => sum + l.total_tokens, 0);
  const total_requests = userLogs.length;
  res.json({
    balance: user.balance,
    total_spent: user.total_spent,
    total_requests,
    total_tokens,
    total_cost_usd: total_cost,
  });
});

// =============================================================================
// PAYMENT REQUESTS (User)
// =============================================================================
// PAYMENT REQUESTS (User)
// =============================================================================

// POST /v1/payments/request - Create payment request
router.post("/payments/request", authMiddleware, async (req: AuthenticatedRequest, res) => {
  try {
    const { amount, currency, screenshot_url, source } = req.body || {};
    
    if (!amount || typeof amount !== "number" || amount <= 0) {
      res.status(400).json({ error: { message: "Amount must be a positive number", code: "invalid_amount" } });
      return;
    }
    
    const { createPaymentRequest } = await import("../services/payment-request");
    const payment = await createPaymentRequest({
      user_id: req.user!.id,
      amount,
      currency: currency || "USD",
      screenshot_url: screenshot_url || undefined,
      source: source || 'frontend',
      // Store user email for admin notification
      user_email: req.user!.email,
    });
    
    // Import admin bot notifier if available (async, don't wait)
    import("../bot/admin-bot").then(({ notifyNewPaymentRequest }) => {
      notifyNewPaymentRequest(payment, req.user!.email).catch(console.error);
    }).catch(() => {}); // Silently ignore if bot not running
    
    res.status(201).json(payment);
  } catch (error: any) {
    console.error('[PAYMENT] Create error:', error);
    res.status(500).json({ error: { message: error.message, code: "internal_error" } });
  }
});

// GET /v1/payments/my-requests - Get user's payment requests
router.get("/payments/my-requests", authMiddleware, async (req: AuthenticatedRequest, res) => {
  try {
    const status = req.query.status as string;
    const limit = parseInt(req.query.limit as string) || 20;
    const offset = parseInt(req.query.offset as string) || 0;
    
    const { listPaymentRequestsForUser } = await import("../services/payment-request");
    const payments = await listPaymentRequestsForUser(req.user!.id, { status, limit, offset });
    
    res.json({ data: payments, total: payments.length });
  } catch (error: any) {
    console.error('[PAYMENT] List error:', error);
    res.status(500).json({ error: { message: error.message, code: "internal_error" } });
  }
});

// =============================================================================
// PAYMENT REQUESTS (Admin)
// =============================================================================

// GET /v1/admin/payment-requests - List all payment requests (admin)
router.get("/admin/payment-requests", authMiddleware, requireAdmin, async (req: AuthenticatedRequest, res) => {
  try {
    const status = req.query.status as string;
    const userId = req.query.user_id as string;
    const limit = parseInt(req.query.limit as string) || 50;
    const offset = parseInt(req.query.offset as string) || 0;
    
    const { listAllPaymentRequests } = await import("../services/payment-request");
    const payments = await listAllPaymentRequests({ status, user_id: userId, limit, offset });
    
    res.json({ data: payments, total: payments.length });
  } catch (error: any) {
    console.error('[PAYMENT] Admin list error:', error);
    res.status(500).json({ error: { message: error.message, code: "internal_error" } });
  }
});

// POST /v1/admin/payment-requests/:id/approve - Approve payment
router.post("/admin/payment-requests/:id/approve", authMiddleware, requireAdmin, async (req: AuthenticatedRequest, res) => {
  try {
    const { id } = req.params;
    const { note } = req.body || {};
    
    const { approvePaymentRequest } = await import("../services/payment-request");
    const result = await approvePaymentRequest(id, req.user!.id, req.user!.email, note);
    
    if (!result.success) {
      res.status(400).json({ error: { message: result.error, code: "approval_failed" } });
      return;
    }
    
    console.log(`[PAYMENT] Approved: ${id} by ${req.user!.email}`);
    res.json({ success: true, payment: result.payment });
  } catch (error: any) {
    console.error('[PAYMENT] Approve error:', error);
    res.status(500).json({ error: { message: error.message, code: "internal_error" } });
  }
});

// POST /v1/admin/payment-requests/:id/reject - Reject payment
router.post("/admin/payment-requests/:id/reject", authMiddleware, requireAdmin, async (req: AuthenticatedRequest, res) => {
  try {
    const { id } = req.params;
    const { note } = req.body || {};
    
    const { rejectPaymentRequest } = await import("../services/payment-request");
    const result = await rejectPaymentRequest(id, req.user!.id, req.user!.email, note);
    
    if (!result.success) {
      res.status(400).json({ error: { message: result.error, code: "rejection_failed" } });
      return;
    }
    
    console.log(`[PAYMENT] Rejected: ${id} by ${req.user!.email}`);
    res.json({ success: true, payment: result.payment });
  } catch (error: any) {
    console.error('[PAYMENT] Reject error:', error);
    res.status(500).json({ error: { message: error.message, code: "internal_error" } });
  }
});

export default router;
