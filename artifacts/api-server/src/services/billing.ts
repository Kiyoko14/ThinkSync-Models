import { getUserById, updateUser } from "./user";
import { createTransaction } from "./transaction";
import { getModelById } from "./model";
import { createApiLog } from "./api-log";

export interface ChargeRequest {
  user_id: string;
  model_id: string;
  input_tokens: number;
  output_tokens: number;
  duration_ms?: number;
  stream_enabled?: boolean;
  ip_address?: string;
  user_agent?: string;
}

export interface ChargeResult {
  success: boolean;
  cost: number;
  balance_before: number;
  balance_after: number;
  error?: string;
  log_id?: string;
}

/**
 * Calculate cost in USD cents based on model pricing and token usage.
 * Returns cost in cents.
 */
export function calculateCost(
  modelId: string,
  inputTokens: number,
  outputTokens: number
): { cost: number; model_slug: string } {
  const model = getModelById(modelId);
  if (!model) {
    return { cost: 0, model_slug: modelId };
  }

  const inputCost = (inputTokens / 1_000_000) * model.pricing_input_per_m;
  const outputCost = (outputTokens / 1_000_000) * model.pricing_output_per_m;
  const totalCost = inputCost + outputCost;

  return {
    cost: Math.round(totalCost * 100),
    model_slug: model.slug,
  };
}

/**
 * Charge a user's balance for API usage.
 * Returns the charge result with updated balance.
 */
export function chargeUser(request: ChargeRequest): ChargeResult {
  const user = getUserById(request.user_id);
  if (!user) {
    return { success: false, cost: 0, balance_before: 0, balance_after: 0, error: "User not found" };
  }

  if (!user.is_active) {
    return { success: false, cost: 0, balance_before: user.balance, balance_after: user.balance, error: "Account disabled" };
  }

  const { cost, model_slug } = calculateCost(
    request.model_id,
    request.input_tokens,
    request.output_tokens
  );

  if (cost <= 0) {
    return { success: false, cost: 0, balance_before: user.balance, balance_after: user.balance, error: "Invalid cost calculation" };
  }

  if (user.balance < cost) {
    return {
      success: false,
      cost,
      balance_before: user.balance,
      balance_after: user.balance,
      error: "insufficient_balance",
    };
  }

  const balanceAfter = user.balance - cost;
  updateUser(user.id, {
    balance: balanceAfter,
    total_spent: user.total_spent + cost,
  });

  const tx = createTransaction({
    profile_id: user.id,
    amount: cost,
    balance_after: balanceAfter,
    transaction_type: "api_usage",
    status: "completed",
    description: `API usage: ${model_slug} (${request.input_tokens} in / ${request.output_tokens} out)`,
    reference_type: "model",
    reference_id: request.model_id,
  });

  const log = createApiLog({
    profile_id: user.id,
    model_slug,
    auth_method: "api_key",
    input_tokens: request.input_tokens,
    output_tokens: request.output_tokens,
    total_tokens: request.input_tokens + request.output_tokens,
    estimated_cost: cost / 100,
    duration_ms: request.duration_ms || 0,
    status: "success",
    status_code: 200,
    request_model: request.model_id,
    stream_enabled: request.stream_enabled || false,
    ip_address: request.ip_address,
    user_agent: request.user_agent,
  });

  return {
    success: true,
    cost,
    balance_before: user.balance,
    balance_after: balanceAfter,
    log_id: log.id,
  };
}

export function getUserBalance(userId: string): number {
  const user = getUserById(userId);
  return user?.balance ?? 0;
}
