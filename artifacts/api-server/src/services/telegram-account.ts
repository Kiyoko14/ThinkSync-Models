// Telegram Account Service - User Bot linking
import { randomUUID } from 'crypto';
import db from '../db';

export interface TelegramAccount {
  id: string;
  user_id: string;
  telegram_id: number;
  telegram_username?: string;
  linking_code?: string;
  linking_code_expires_at?: string;
  linked_at: string;
  last_seen_at: string;
  is_active: boolean;
}

/**
 * Generate a unique linking code
 */
function generateLinkingCode(): string {
  return randomUUID().replace(/-/g, '').substring(0, 16).toUpperCase();
}

/**
 * Create linking code for user
 */
export async function createLinkingCode(userId: string): Promise<{ code: string; expires_at: string }> {
  const code = generateLinkingCode();
  const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString(); // 15 minutes
  
  // Check if user already has a linking code
  const existing = await db.query(
    'SELECT id FROM telegram_accounts WHERE user_id = $1 AND linking_code IS NOT NULL AND linking_code_expires_at > NOW()',
    [userId]
  );
  
  if (existing.rows.length > 0) {
    // Update existing code
    await db.query(
      `UPDATE telegram_accounts SET linking_code = $1, linking_code_expires_at = $2 WHERE user_id = $3`,
      [code, expiresAt, userId]
    );
  } else {
    // Create new record with code
    await db.query(
      `INSERT INTO telegram_accounts (id, user_id, linking_code, linking_code_expires_at) VALUES ($1, $2, $3, $4)`,
      [randomUUID(), userId, code, expiresAt]
    );
  }
  
  return { code, expires_at: expiresAt };
}

/**
 * Validate linking code and link telegram account
 */
export async function linkTelegramAccount(
  linkingCode: string,
  telegramId: number,
  telegramUsername?: string
): Promise<{ success: boolean; error?: string; user?: any }> {
  try {
    // Find pending linking code
    const result = await db.query(
      `SELECT * FROM telegram_accounts 
       WHERE linking_code = $1 AND linking_code_expires_at > NOW()`,
      [linkingCode]
    );
    
    if (result.rows.length === 0) {
      return { success: false, error: 'Invalid or expired linking code' };
    }
    
    const account = result.rows[0];
    
    // Check if telegram_id already linked to another account
    const existingTg = await db.query(
      'SELECT id FROM telegram_accounts WHERE telegram_id = $1 AND user_id != $2',
      [telegramId, account.user_id]
    );
    
    if (existingTg.rows.length > 0) {
      return { success: false, error: 'This Telegram account is already linked to another user' };
    }
    
    // Update account with telegram details
    const now = new Date().toISOString();
    await db.query(
      `UPDATE telegram_accounts 
       SET telegram_id = $1, telegram_username = $2, linking_code = NULL, 
           linking_code_expires_at = NULL, linked_at = $3, last_seen_at = $3
       WHERE id = $4`,
      [telegramId, telegramUsername || null, now, account.id]
    );
    
    // Get user info
    const userResult = await db.query('SELECT id, email, balance, plan_tier FROM users WHERE id = $1', [account.user_id]);
    const user = userResult.rows[0];
    
    // Create audit log
    await db.query(
      `INSERT INTO audit_logs (id, admin_id, admin_email, action, target_type, target_id, details, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [randomUUID(), account.user_id, `telegram:${telegramId}`, 'telegram_linked', 'telegram_account', account.id,
       `Telegram account ${telegramId} linked to user ${account.user_id}`, now]
    );
    
    return { success: true, user };
    
  } catch (error: any) {
    console.error('[TELEGRAM_LINK] Error:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Get telegram account by telegram ID
 */
export async function getTelegramAccountByTgId(telegramId: number): Promise<TelegramAccount | null> {
  const result = await db.query(
    'SELECT * FROM telegram_accounts WHERE telegram_id = $1 AND is_active = true',
    [telegramId]
  );
  return result.rows[0] || null;
}

/**
 * Get user by telegram ID
 */
export async function getUserByTelegramId(telegramId: number): Promise<any | null> {
  const account = await getTelegramAccountByTgId(telegramId);
  if (!account || !account.user_id) return null;
  
  const result = await db.query(
    'SELECT id, email, balance, plan_tier, is_active, created_at FROM users WHERE id = $1',
    [account.user_id]
  );
  
  return result.rows[0] || null;
}

/**
 * Update last seen timestamp
 */
export async function updateLastSeen(telegramId: number): Promise<void> {
  await db.query(
    'UPDATE telegram_accounts SET last_seen_at = $1 WHERE telegram_id = $2',
    [new Date().toISOString(), telegramId]
  );
}

/**
 * Unlink telegram account
 */
export async function unlinkTelegramAccount(telegramId: number): Promise<boolean> {
  const result = await db.query(
    'UPDATE telegram_accounts SET is_active = false, user_id = NULL WHERE telegram_id = $1',
    [telegramId]
  );
  return (result.rowCount || 0) > 0;
}

export default {
  createLinkingCode,
  linkTelegramAccount,
  getTelegramAccountByTgId,
  getUserByTelegramId,
  updateLastSeen,
  unlinkTelegramAccount,
};