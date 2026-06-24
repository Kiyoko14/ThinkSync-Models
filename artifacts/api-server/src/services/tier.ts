// Tier Service - Phase 5C: Tier & Access Control System
import { randomUUID } from 'crypto';
import db from '../db';

export interface Tier {
  id: string;
  name: string;
  display_name: string;
  description: string | null;
  priority: number;
  rpm_limit: number;
  tpm_limit: number;
  monthly_request_limit: number;
  monthly_token_limit: number;
  max_api_keys: number | null;
  minimum_lifetime_spend_usd: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface UserWithTier {
  id: string;
  email: string;
  tier_id: string | null;
  tier: Tier | null;
  tier_mode: string;
  lifetime_spend_usd: number;
  monthly_requests_used: number;
  monthly_tokens_used: number;
  month_reset_at: string;
  rate_limit_rpm: number;
  rate_limit_tpm: number;
}

// =============================================================================
// TIER CRUD
// =============================================================================

/**
 * Get all tiers
 */
export async function getAllTiers(filters?: { is_active?: boolean }): Promise<Tier[]> {
  let query = 'SELECT * FROM tiers';
  const params: any[] = [];
  
  if (filters?.is_active !== undefined) {
    query += ' WHERE is_active = $1';
    params.push(filters.is_active);
  }
  
  query += ' ORDER BY priority ASC';
  
  const result = await db.query(query, params);
  return result.rows;
}

/**
 * Get tier by ID
 */
export async function getTierById(id: string): Promise<Tier | null> {
  const result = await db.query('SELECT * FROM tiers WHERE id = $1', [id]);
  return result.rows[0] || null;
}

/**
 * Get tier by name
 */
export async function getTierByName(name: string): Promise<Tier | null> {
  const result = await db.query('SELECT * FROM tiers WHERE name = $1', [name]);
  return result.rows[0] || null;
}

/**
 * Create a new tier
 */
export async function createTier(tier: {
  name: string;
  display_name: string;
  description?: string;
  priority?: number;
  rpm_limit?: number;
  tpm_limit?: number;
  monthly_request_limit?: number;
  monthly_token_limit?: number;
  max_api_keys?: number | null;
  minimum_lifetime_spend_usd?: number;
}): Promise<Tier> {
  const id = randomUUID();
  const now = new Date().toISOString();
  
  const result = await db.query(
    `INSERT INTO tiers (id, name, display_name, description, priority, rpm_limit, tpm_limit, 
       monthly_request_limit, monthly_token_limit, max_api_keys, minimum_lifetime_spend_usd, is_active, created_at, updated_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
     RETURNING *`,
    [
      id,
      tier.name,
      tier.display_name,
      tier.description || null,
      tier.priority || 0,
      tier.rpm_limit || 60,
      tier.tpm_limit || 60000,
      tier.monthly_request_limit || 1000,
      tier.monthly_token_limit || 1000000,
      tier.max_api_keys ?? 1,
      tier.minimum_lifetime_spend_usd || 0,
      true,
      now,
      now
    ]
  );
  
  return result.rows[0];
}

/**
 * Update a tier
 */
export async function updateTier(id: string, patch: Partial<Tier>): Promise<Tier | null> {
  const fields = Object.keys(patch).filter(k => k !== 'id' && k !== 'created_at');
  if (fields.length === 0) return getTierById(id);
  
  const sets = fields.map((f, i) => `${f} = $${i + 2}`).join(', ');
  const values = fields.map(f => patch[f as keyof Tier]);
  
  const result = await db.query(
    `UPDATE tiers SET ${sets}, updated_at = $${fields.length + 2} WHERE id = $1 RETURNING *`,
    [id, ...values, new Date().toISOString()]
  );
  
  return result.rows[0] || null;
}

/**
 * Delete (deactivate) a tier
 */
export async function deleteTier(id: string): Promise<boolean> {
  const result = await db.query(
    'UPDATE tiers SET is_active = false WHERE id = $1 RETURNING id',
    [id]
  );
  return (result.rowCount || 0) > 0;
}

// =============================================================================
// USER TIER MANAGEMENT
// =============================================================================

/**
 * Get user with tier info
 */
export async function getUserWithTier(userId: string): Promise<UserWithTier | null> {
  const result = await db.query(
    `SELECT u.*, t.*, t.id as tier_db_id
     FROM users u
     LEFT JOIN tiers t ON u.tier_id = t.id
     WHERE u.id = $1`,
    [userId]
  );
  
  if (!result.rows[0]) return null;
  
  const row = result.rows[0];
  return {
    id: row.id,
    email: row.email,
    tier_id: row.tier_id,
    tier: row.tier_db_id ? {
      id: row.tier_db_id,
      name: row.name,
      display_name: row.display_name,
      description: row.description,
      priority: row.priority,
      rpm_limit: row.rpm_limit,
      tpm_limit: row.tpm_limit,
      monthly_request_limit: row.monthly_request_limit,
      monthly_token_limit: row.monthly_token_limit,
      max_api_keys: row.max_api_keys,
      minimum_lifetime_spend_usd: row.minimum_lifetime_spend_usd,
      is_active: row.is_active,
      created_at: row.created_at,
      updated_at: row.updated_at,
    } : null,
    tier_mode: row.tier_mode,
    lifetime_spend_usd: row.lifetime_spend_usd,
    monthly_requests_used: row.monthly_requests_used,
    monthly_tokens_used: row.monthly_tokens_used,
    month_reset_at: row.month_reset_at,
    rate_limit_rpm: row.rpm_limit || row.rate_limit_rpm,
    rate_limit_tpm: row.tpm_limit || row.rate_limit_tpm,
  };
}

/**
 * Get user's effective tier (auto-resolve if tier_id is null)
 */
export async function getUserEffectiveTier(userId: string): Promise<Tier | null> {
  // Get user tier_id and lifetime_spend_usd
  const userResult = await db.query(
    'SELECT tier_id, tier_mode, lifetime_spend_usd FROM users WHERE id = $1',
    [userId]
  );
  
  if (userResult.rows.length === 0) return null;
  
  const user = userResult.rows[0];
  
  // If user has explicit tier_id and mode is manual, use it
  if (user.tier_id && user.tier_mode === 'manual') {
    return getTierById(user.tier_id);
  }
  
  // If user has tier_id and mode is auto, use higher of explicit or auto-calculated
  if (user.tier_id && user.tier_mode === 'auto') {
    const explicitTier = await getTierById(user.tier_id);
    const autoTier = await getAutoTierForSpend(user.lifetime_spend_usd);
    
    if (!explicitTier) return autoTier;
    if (!autoTier) return explicitTier;
    
    // Return higher priority tier
    return explicitTier.priority >= autoTier.priority ? explicitTier : autoTier;
  }
  
  // No tier_id - calculate auto
  return getAutoTierForSpend(user.lifetime_spend_usd);
}

/**
 * Get appropriate tier based on lifetime spend
 */
export async function getAutoTierForSpend(lifetimeSpendUsd: number): Promise<Tier | null> {
  const result = await db.query(
    `SELECT * FROM tiers 
     WHERE is_active = true AND minimum_lifetime_spend_usd <= $1
     ORDER BY priority DESC
     LIMIT 1`,
    [lifetimeSpendUsd]
  );
  return result.rows[0] || null;
}

/**
 * Assign tier to user (manual)
 */
export async function assignTierToUser(
  userId: string, 
  tierId: string, 
  mode: 'auto' | 'manual' = 'manual'
): Promise<boolean> {
  const result = await db.query(
    'UPDATE users SET tier_id = $1, tier_mode = $2, updated_at = $3 WHERE id = $4',
    [tierId, mode, new Date().toISOString(), userId]
  );
  return (result.rowCount || 0) > 0;
}

/**
 * Auto upgrade user's tier based on lifetime spend
 */
export async function autoUpgradeUserTier(userId: string): Promise<{ upgraded: boolean; fromTier?: string; toTier?: string }> {
  const user = await db.query(
    'SELECT tier_id, tier_mode, lifetime_spend_usd FROM users WHERE id = $1',
    [userId]
  );
  
  if (user.rows.length === 0) return { upgraded: false };
  
  const userData = user.rows[0];
  
  // Only auto-upgrade if mode is 'auto'
  if (userData.tier_mode !== 'auto') {
    return { upgraded: false };
  }
  
  // Get current tier
  const currentTier = userData.tier_id ? await getTierById(userData.tier_id) : null;
  
  // Calculate new tier based on spend
  const newTier = await getAutoTierForSpend(userData.lifetime_spend_usd);
  
  // Check if upgrade available
  if (newTier && (!currentTier || newTier.priority > currentTier.priority)) {
    await assignTierToUser(userId, newTier.id, 'auto');
    
    return {
      upgraded: true,
      fromTier: currentTier?.name,
      toTier: newTier.name
    };
  }
  
  return { upgraded: false };
}

// =============================================================================
// TIER ACCESS VALIDATION
// =============================================================================

/**
 * Check if user can access model
 */
export async function canUserAccessModel(userId: string, modelId: string): Promise<{
  allowed: boolean;
  error?: string;
  userTier?: Tier;
  modelTier?: Tier;
}> {
  // Get user effective tier
  const userTier = await getUserEffectiveTier(userId);
  
  if (!userTier) {
    return { allowed: false, error: 'User tier not found' };
  }
  
  // Get model requirements
  const modelResult = await db.query(
    'SELECT m.*, t.name as min_tier_name, t.priority as min_tier_priority, t.id as min_tier_id FROM models m LEFT JOIN tiers t ON m.minimum_tier_id = t.id WHERE m.id = $1',
    [modelId]
  );
  
  if (modelResult.rows.length === 0) {
    return { allowed: false, error: 'Model not found' };
  }
  
  const model = modelResult.rows[0];
  
  // Check tier requirement using minimum_tier_id (new system)
  if (model.minimum_tier_id) {
    if (!userTier || userTier.priority < model.min_tier_priority) {
      const tierName = model.min_tier_name || 'unknown';
      return { 
        allowed: false, 
        error: `Bu model uchun ${tierName} tier kerak. Sizning tier: ${userTier.display_name}`,
        userTier,
        modelTier: { id: model.min_tier_id, name: model.min_tier_name, display_name: model.min_tier_name, description: '', priority: model.min_tier_priority, rpm_limit: 0, tpm_limit: 0, monthly_request_limit: 0, monthly_token_limit: 0, max_api_keys: null, minimum_lifetime_spend_usd: 0, is_active: true, created_at: '', updated_at: '' }
      };
    }
  }
  // Fallback: check tier_access (legacy)
  else if (model.tier_access && model.tier_access !== 'free') {
    const tierNames = ['free', 'starter', 'pro', 'enterprise'];
    const userPriority = tierNames.indexOf(userTier.name);
    const modelPriority = tierNames.indexOf(model.tier_access);
    
    if (userPriority < modelPriority) {
      return { 
        allowed: false, 
        error: `Bu model uchun ${model.tier_access} tier kerak`,
        userTier
      };
    }
  }
  
  return { allowed: true, userTier };
}

/**
 * Check if user has reached API key limit
 */
export async function canUserCreateApiKey(userId: string): Promise<{
  allowed: boolean;
  error?: string;
  current: number;
  max: number;
}> {
  const userTier = await getUserEffectiveTier(userId);
  
  if (!userTier) {
    return { allowed: true, current: 0, max: 1 }; // Default for users without tier
  }
  
  // Get current API key count
  const keyCount = await db.query(
    'SELECT COUNT(*) as count FROM api_keys WHERE profile_id = $1 AND status = $2',
    [userId, 'active']
  );
  
  const currentCount = parseInt(keyCount.rows[0]?.count || '0');
  const maxKeys = userTier.max_api_keys ?? 1;
  
  if (currentCount >= maxKeys) {
    return { 
      allowed: false, 
      error: `API kalitlar soni limitga yetdi. Maximum: ${maxKeys}`,
      current: currentCount,
      max: maxKeys
    };
  }
  
  return { allowed: true, current: currentCount, max: maxKeys };
}

/**
 * Check if user has reached monthly request limit
 */
export async function checkMonthlyRequestLimit(userId: string): Promise<{
  allowed: boolean;
  error?: string;
  used: number;
  limit: number;
}> {
  await resetMonthlyUsageIfNeeded(userId);
  
  const userTier = await getUserEffectiveTier(userId);
  const limit = userTier?.monthly_request_limit ?? 1000;
  
  const result = await db.query(
    'SELECT monthly_requests_used FROM users WHERE id = $1',
    [userId]
  );
  
  const used = result.rows[0]?.monthly_requests_used ?? 0;
  
  if (used >= limit) {
    return {
      allowed: false,
      error: `Oylik so'rovlar limiti tugadi. Limit: ${limit}, foydalangan: ${used}`,
      used,
      limit
    };
  }
  
  return { allowed: true, used, limit };
}

/**
 * Check if user has reached monthly token limit
 */
export async function checkMonthlyTokenLimit(userId: string, requiredTokens: number): Promise<{
  allowed: boolean;
  error?: string;
  used: number;
  limit: number;
  available: number;
}> {
  await resetMonthlyUsageIfNeeded(userId);
  
  const userTier = await getUserEffectiveTier(userId);
  const limit = userTier?.monthly_token_limit ?? 1000000;
  
  const result = await db.query(
    'SELECT monthly_tokens_used FROM users WHERE id = $1',
    [userId]
  );
  
  const used = result.rows[0]?.monthly_tokens_used ?? 0;
  const available = limit - used;
  
  if (requiredTokens > available) {
    return {
      allowed: false,
      error: `Oylik token limiti yetmaydi. Kerak: ${requiredTokens}, mavjud: ${available}`,
      used,
      limit,
      available
    };
  }
  
  return { allowed: true, used, limit, available };
}

/**
 * Reset monthly usage if new month has started
 */
export async function resetMonthlyUsageIfNeeded(userId: string): Promise<void> {
  const result = await db.query(
    'SELECT month_reset_at FROM users WHERE id = $1',
    [userId]
  );
  
  if (result.rows.length === 0) return;
  
  const resetAt = new Date(result.rows[0].month_reset_at);
  const now = new Date();
  
  // Reset if current month is different from reset month
  if (resetAt.getMonth() !== now.getMonth() || resetAt.getFullYear() !== now.getFullYear()) {
    await db.query(
      'UPDATE users SET monthly_requests_used = 0, monthly_tokens_used = 0, month_reset_at = $1 WHERE id = $2',
      [now.toISOString(), userId]
    );
  }
}

/**
 * Increment monthly usage
 */
export async function incrementMonthlyUsage(userId: string, tokensUsed: number): Promise<void> {
  await db.query(
    'UPDATE users SET monthly_requests_used = monthly_requests_used + 1, monthly_tokens_used = monthly_tokens_used + $1 WHERE id = $2',
    [tokensUsed, userId]
  );
}

// =============================================================================
// AUDIT LOGGING HELPERS
// =============================================================================

/**
 * Create audit log for tier changes
 */
export async function logTierChange(
  userId: string,
  adminId: string | null,
  action: string,
  fromTier: string | null,
  toTier: string | null,
  reason?: string
): Promise<void> {
  const id = randomUUID();
  const now = new Date().toISOString();
  
  await db.query(
    `INSERT INTO audit_logs (id, admin_id, admin_email, action, target_type, target_id, details, created_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
    [
      id,
      adminId || null,
      adminId ? `admin:${adminId}` : 'system',
      action,
      'tier',
      userId,
      JSON.stringify({ from_tier: fromTier, to_tier: toTier, reason }),
      now
    ]
  );
}

export default {
  getAllTiers,
  getTierById,
  getTierByName,
  createTier,
  updateTier,
  deleteTier,
  getUserWithTier,
  getUserEffectiveTier,
  getAutoTierForSpend,
  assignTierToUser,
  autoUpgradeUserTier,
  canUserAccessModel,
  canUserCreateApiKey,
  checkMonthlyRequestLimit,
  checkMonthlyTokenLimit,
  resetMonthlyUsageIfNeeded,
  incrementMonthlyUsage,
  logTierChange,
};