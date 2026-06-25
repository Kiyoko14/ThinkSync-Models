// Billing service - Database version (PHASE 5A)
// Now uses real database queries for balance management

import db from '../db';
import { getUserById, updateUser } from './user';
import { createTransaction, listTransactions } from './transaction';
import { getPromocodeByCode, incrementUsedCount } from './promocode';

export interface BillingResult {
  success: boolean;
  new_balance?: number;
  transaction_id?: string;
  error?: string;
}

/**
 * Deduct balance from user account
 * Creates a transaction record
 */
export async function deductBalance(
  profileId: string,
  amount: number,
  description: string,
  referenceType?: string,
  referenceId?: string
): Promise<BillingResult> {
  // 1. Get current user
  const user = await getUserById(profileId);
  
  if (!user) {
    return {
      success: false,
      error: 'User not found',
    };
  }
  
  // 2. Check if user has enough balance
  if (user.balance < amount) {
    return {
      success: false,
      error: 'Insufficient balance',
    };
  }
  
  // 3. Calculate new balance
  const newBalance = user.balance - amount;
  
  // 4. Update user balance
  const updatedUser = await updateUser(profileId, { balance: newBalance });
  
  if (!updatedUser) {
    return {
      success: false,
      error: 'Failed to update user balance',
    };
  }
  
  // 5. Create transaction record
  const transaction = await createTransaction({
    profile_id: profileId,
    amount: -amount, // Negative amount for deduction
    balance_after: newBalance,
    transaction_type: 'usage',
    status: 'completed',
    description,
    reference_type: referenceType,
    reference_id: referenceId,
  });
  
  return {
    success: true,
    new_balance: newBalance,
    transaction_id: transaction.id,
  };
}

/**
 * Add balance to user account (for top-ups)
 */
export async function addBalance(
  profileId: string,
  amount: number,
  description: string,
  referenceType?: string,
  referenceId?: string
): Promise<BillingResult> {
  // 1. Get current user
  const user = await getUserById(profileId);
  
  if (!user) {
    return {
      success: false,
      error: 'User not found',
    };
  }
  
  // 2. Calculate new balance
  const newBalance = user.balance + amount;
  
  // 3. Update user balance
  const updatedUser = await updateUser(profileId, { balance: newBalance });
  
  if (!updatedUser) {
    return {
      success: false,
      error: 'Failed to update user balance',
    };
  }
  
  // 4. Create transaction record
  const transaction = await createTransaction({
    profile_id: profileId,
    amount: amount, // Positive amount for addition
    balance_after: newBalance,
    transaction_type: 'top_up',
    status: 'completed',
    description,
    reference_type: referenceType,
    reference_id: referenceId,
  });
  
  return {
    success: true,
    new_balance: newBalance,
    transaction_id: transaction.id,
  };
}

/**
 * Calculate cost for a model request
 */
export function calculateCost(
  modelId: string,
  inputTokens: number,
  outputTokens: number,
  modelPricing?: {
    pricing_input_per_m: number;
    pricing_output_per_m: number;
  }
): number {
  // If model pricing is provided, use it
  if (modelPricing) {
    const inputCost = (inputTokens / 1000000) * modelPricing.pricing_input_per_m;
    const outputCost = (outputTokens / 1000000) * modelPricing.pricing_output_per_m;
    return Math.ceil((inputCost + outputCost) * 1000000); // Convert to integer tokens
  }
  
  // Otherwise, get from database (TODO: implement model pricing lookup)
  // For now, use default pricing
  const defaultInputPrice = 2.5; // $2.5 per 1M tokens
  const defaultOutputPrice = 10.0; // $10.0 per 1M tokens
  
  const inputCost = (inputTokens / 1000000) * defaultInputPrice;
  const outputCost = (outputTokens / 1000000) * defaultOutputPrice;
  return Math.ceil((inputCost + outputCost) * 1000000);
}

/**
 * Apply promocode discount
 */
export async function applyPromocodeDiscount(
  promocodeCode: string,
  originalAmount: number
): Promise<{
  discount_amount: number;
  final_amount: number;
  promocode_id: string;
} | null> {
  // 1. Get promocode
  const promocode = await getPromocodeByCode(promocodeCode);
  
  if (!promocode) {
    return null;
  }
  
  // 2. Check if promocode is valid
  const now = new Date();
  const validFrom = new Date(promocode.valid_from);
  const validUntil = promocode.valid_until ? new Date(promocode.valid_until) : null;
  
  if (!promocode.is_active) {
    return null;
  }
  
  if (now < validFrom) {
    return null;
  }
  
  if (validUntil && now > validUntil) {
    return null;
  }
  
  if (promocode.max_uses && promocode.used_count >= promocode.max_uses) {
    return null;
  }
  
  // 3. Calculate discount
  let discountAmount = 0;
  
  if (promocode.discount_type === 'percentage') {
    discountAmount = Math.floor(originalAmount * (promocode.discount_value / 100));
  } else if (promocode.discount_type === 'fixed') {
    discountAmount = Math.min(promocode.discount_value, originalAmount);
  }
  
  const finalAmount = Math.max(0, originalAmount - discountAmount);
  
  // 4. Increment used count
  await incrementUsedCount(promocode.id);
  
  return {
    discount_amount: discountAmount,
    final_amount: finalAmount,
    promocode_id: promocode.id,
  };
}

/**
 * Get billing summary for a user
 */
export async function getBillingSummary(profileId: string): Promise<{
  current_balance: number;
  total_spent: number;
  total_topups: number;
  transaction_count: number;
}> {
  // Get current balance from user
  const user = await getUserById(profileId);
  
  if (!user) {
    return {
      current_balance: 0,
      total_spent: 0,
      total_topups: 0,
      transaction_count: 0,
    };
  }
  
  // Get transaction stats
  const transactions = await listTransactions({ profile_id: profileId });
  
  const totalSpent = transactions
    .filter(t => t.amount < 0 && t.status === 'completed')
    .reduce((sum, t) => sum + Math.abs(t.amount), 0);
    
  const totalTopups = transactions
    .filter(t => t.amount > 0 && t.status === 'completed')
    .reduce((sum, t) => sum + t.amount, 0);
    
  return {
    current_balance: user.balance,
    total_spent: totalSpent,
    total_topups: totalTopups,
    transaction_count: transactions.length,
  };
}

// =============================================================================
// COMPATIBILITY EXPORTS (for existing code)
// =============================================================================

/**
 * Charge user for API usage with TRANSACTION SAFETY
 * Uses PostgreSQL SELECT FOR UPDATE to prevent race conditions
 * 
 * Flow:
 * 1. Get database client
 * 2. BEGIN transaction
 * 3. SELECT user with FOR UPDATE (row lock)
 * 4. Check balance
 * 5. UPDATE user balance
 * 6. INSERT transaction record
 * 7. COMMIT
 * 
 * This ensures:
 * - No negative balances (atomic check + deduction)
 * - No double spending (row lock prevents concurrent access)
 * - Concurrent requests are serialized
 */
export async function chargeUser(params: {
  user_id: string;
  model_id: string;
  input_tokens: number;
  output_tokens: number;
  ip_address?: string;
  user_agent?: string;
}): Promise<{
  success: boolean;
  cost: number;
  balance_before: number;
  balance_after: number;
  error?: string;
}> {
  const { user_id, model_id, input_tokens, output_tokens, ip_address, user_agent } = params;

  // 1. Get model pricing from database (outside transaction - read-only)
  const { getModelById } = await import('./model');
  const model = await getModelById(model_id);
  
  if (!model) {
    return { success: false, cost: 0, balance_before: 0, balance_after: 0, error: 'model_not_found' };
  }

  // Calculate cost
  const inputPrice = model.pricing_input_per_m || 2500;
  const outputPrice = model.pricing_output_per_m || 10000;
  const inputCost = Math.ceil((input_tokens / 1000000) * inputPrice);
  const outputCost = Math.ceil((output_tokens / 1000000) * outputPrice);
  const totalCost = inputCost + outputCost;

  // Get database client for transaction
  const db = await import('../db');
  let client: any = null;

  try {
    // 2. Get client and begin transaction
    client = await db.getClient();
    await client.query('BEGIN');

    // 3. SELECT FOR UPDATE to lock the user row
    // This prevents other transactions from reading/modifying until we commit
    const userResult = await client.query(
      'SELECT id, email, balance FROM users WHERE id = $1 FOR UPDATE',
      [user_id]
    );

    if (userResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return { success: false, cost: totalCost, balance_before: 0, balance_after: 0, error: 'user_not_found' };
    }

    const user = userResult.rows[0];
    const balance_before = user.balance;

    // 4. Check balance (inside transaction, with row locked)
    if (balance_before < totalCost) {
      await client.query('ROLLBACK');
      return {
        success: false,
        cost: totalCost,
        balance_before: balance_before,
        balance_after: balance_before,
        error: 'insufficient_balance'
      };
    }

    // 5. Deduct balance (UPDATE with new value)
    const balance_after = balance_before - totalCost;
    await client.query(
      'UPDATE users SET balance = $1, updated_at = NOW() WHERE id = $2',
      [balance_after, user_id]
    );

    // 6. Create transaction record
    const { createTransaction } = await import('./transaction');
    await createTransaction({
      profile_id: user_id,
      amount: -totalCost,
      balance_after: balance_after,
      transaction_type: 'usage',
      status: 'completed',
      description: `API usage: ${input_tokens} in / ${output_tokens} out`,
      reference_type: 'model',
      reference_id: model_id,
    });

    // 7. Commit transaction
    await client.query('COMMIT');

    return {
      success: true,
      cost: totalCost,
      balance_before: balance_before,
      balance_after: balance_after,
    };

  } catch (error: any) {
    // Rollback on any error
    if (client) {
      try {
        await client.query('ROLLBACK');
      } catch (rollbackError) {
        console.error('CRITICAL: Rollback failed:', rollbackError);
      }
    }

    console.error('Transaction error in chargeUser:', error);

    // Handle specific errors
    if (error.message?.includes('insufficient_balance')) {
      return { success: false, cost: totalCost, balance_before: 0, balance_after: 0, error: 'insufficient_balance' };
    }

    return { success: false, cost: totalCost, balance_before: 0, balance_after: 0, error: 'transaction_failed' };
  } finally {
    // Always release client back to pool
    if (client) {
      client.release();
    }
  }
}


export default {
  deductBalance,
  addBalance,
  calculateCost,
  applyPromocodeDiscount,
  getBillingSummary,
  chargeUser,
};
