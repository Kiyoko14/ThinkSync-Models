// Admin Service - Unified admin management for Frontend and Telegram
import { randomUUID } from 'crypto';
import db from '../db';

export type AdminRole = 'owner' | 'admin' | 'moderator';

export interface Admin {
  id: string;
  user_id?: string;
  telegram_id?: number;
  email?: string;
  role: AdminRole;
  permissions: Record<string, boolean>;
  is_active: boolean;
  created_by?: string;
  created_at: string;
  updated_at: string;
}

// =============================================================================
// ROLE PERMISSIONS
// =============================================================================

const ROLE_PERMISSIONS: Record<AdminRole, string[]> = {
  owner: [
     'payments.approve', 'payments.reject', 'payments.view',
     'users.view', 'users.edit', 'users.ban',
     'models.view', 'models.edit',
     'promocodes.view', 'promocodes.create', 'promocodes.edit', 'promocodes.delete',
     'tiers.view',
     'stats.view',
     'settings.view', 'settings.edit',
     'broadcast'
  ],
  admin: [
     'payments.approve', 'payments.reject', 'payments.view',
     'users.view', 'users.edit', 'users.ban',
     'models.view', 'models.edit',
     'promocodes.view', 'promocodes.create', 'promocodes.edit', 'promocodes.delete',
     'tiers.view',
     'stats.view',
     'settings.view', 'settings.edit',
     'broadcast'
  ],
  moderator: [
     'payments.view',
     'users.view',
     'models.view',
     'tiers.view',
     'stats.view',
     'settings.view'
  ]
};

export function hasPermission(role: AdminRole, permission: string): boolean {
  return ROLE_PERMISSIONS[role]?.includes(permission) || false;
}

// =============================================================================
// ADMIN CRUD
// =============================================================================

/**
 * Create admin
 */
export async function createAdmin(admin: {
  user_id?: string;
  telegram_id?: number;
  email?: string;
  role?: AdminRole;
  created_by?: string;
}): Promise<Admin> {
  const id = randomUUID();
  const now = new Date().toISOString();
  const role = admin.role || 'moderator';
  
  const result = await db.query(
    `INSERT INTO admins (
      id, user_id, telegram_id, email, role, permissions,
      is_active, created_by, created_at, updated_at
    ) VALUES ($1, $2, $3, $4, $5, $6, true, $7, $8, $9)
    RETURNING *`,
    [
      id,
      admin.user_id || null,
      admin.telegram_id || null,
      admin.email || null,
      role,
      JSON.stringify(ROLE_PERMISSIONS[role]),
      admin.created_by || null,
      now,
      now
    ]
  );
  
  return result.rows[0] as Admin;
}

/**
 * Get admin by telegram ID
 */
export async function getAdminByTelegramId(telegramId: number): Promise<Admin | null> {
  const result = await db.query(
    'SELECT * FROM admins WHERE telegram_id = $1 AND is_active = true',
    [telegramId]
  );
  return result.rows[0] || null;
}

/**
 * Get admin by email
 */
export async function getAdminByEmail(email: string): Promise<Admin | null> {
  const result = await db.query(
    'SELECT * FROM admins WHERE email = $1 AND is_active = true',
    [email]
  );
  return result.rows[0] || null;
}

/**
 * Get admin by user ID
 */
export async function getAdminByUserId(userId: string): Promise<Admin | null> {
  const result = await db.query(
    'SELECT * FROM admins WHERE user_id = $1 AND is_active = true',
    [userId]
  );
  return result.rows[0] || null;
}

/**
 * Get admin by ID
 */
export async function getAdminById(id: string): Promise<Admin | null> {
  const result = await db.query(
    'SELECT * FROM admins WHERE id = $1',
    [id]
  );
  return result.rows[0] || null;
}

/**
 * List all admins
 */
export async function listAdmins(filters?: {
  role?: string;
  is_active?: boolean;
  limit?: number;
  offset?: number;
}): Promise<Admin[]> {
  let query = 'SELECT * FROM admins WHERE 1=1';
  const values: any[] = [];
  let idx = 1;
  
  if (filters?.role) {
    query += ` AND role = $${idx}`;
    values.push(filters.role);
    idx++;
  }
  
  if (filters?.is_active !== undefined) {
    query += ` AND is_active = $${idx}`;
    values.push(filters.is_active);
    idx++;
  }
  
  query += ' ORDER BY created_at DESC';
  
  if (filters?.limit) {
    query += ` LIMIT $${idx}`;
    values.push(filters.limit);
    idx++;
  }
  
  if (filters?.offset) {
    query += ` OFFSET $${idx}`;
    values.push(filters.offset);
  }
  
  const result = await db.query(query, values);
  return result.rows as Admin[];
}

/**
 * Update admin
 */
export async function updateAdmin(id: string, patch: {
  role?: AdminRole;
  permissions?: Record<string, boolean>;
  is_active?: boolean;
  telegram_id?: number;
  email?: string;
}): Promise<Admin | null> {
  const now = new Date().toISOString();
  
  const sets: string[] = ['updated_at = $1'];
  const values: any[] = [now];
  let idx = 2;
  
  if (patch.role !== undefined) {
    sets.push(`role = $${idx++}`);
    values.push(patch.role);
    // Update permissions when role changes
    sets.push(`permissions = $${idx++}`);
    values.push(JSON.stringify(ROLE_PERMISSIONS[patch.role]));
  }
  if (patch.permissions !== undefined) {
    sets.push(`permissions = $${idx++}`);
    values.push(JSON.stringify(patch.permissions));
  }
  if (patch.is_active !== undefined) {
    sets.push(`is_active = $${idx++}`);
    values.push(patch.is_active);
  }
  if (patch.telegram_id !== undefined) {
    sets.push(`telegram_id = $${idx++}`);
    values.push(patch.telegram_id);
  }
  if (patch.email !== undefined) {
    sets.push(`email = $${idx++}`);
    values.push(patch.email);
  }
  
  values.push(id);
  
  const result = await db.query(
    `UPDATE admins SET ${sets.join(', ')} WHERE id = $${idx} RETURNING *`,
    values
  );
  
  return result.rows[0] || null;
}

/**
 * Delete (deactivate) admin
 */
export async function deleteAdmin(id: string): Promise<boolean> {
  const now = new Date().toISOString();
  
  const result = await db.query(
    'UPDATE admins SET is_active = false, updated_at = $1 WHERE id = $2',
    [now, id]
  );
  
  return (result.rowCount || 0) > 0;
}

/**
 * Check if user is admin (for HTTP middleware)
 */
export async function isAdminByUserId(userId: string): Promise<Admin | null> {
  return getAdminByUserId(userId);
}

/**
 * Check if telegram user is admin
 */
export async function isAdminByTelegramId(telegramId: number): Promise<Admin | null> {
  return getAdminByTelegramId(telegramId);
}

// =============================================================================
// AUDIT LOGGING
// =============================================================================

/**
 * Create audit log for admin actions
 */
export async function logAdminAction(params: {
  adminId: string;
  adminTelegramId?: number;
  adminEmail?: string;
  action: string;
  targetType?: string;
  targetId?: string;
  details?: string;
}): Promise<void> {
  try {
    const now = new Date().toISOString();
    await db.query(
      `INSERT INTO audit_logs (id, admin_id, admin_email, action, target_type, target_id, details, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [
        randomUUID(),
        params.adminId,
        params.adminEmail || `telegram:${params.adminTelegramId}`,
        params.action,
        params.targetType || null,
        params.targetId || null,
        params.details || null,
        now
      ]
    );
  } catch (error: any) {
    console.error('[ADMIN] Audit log error:', error.message);
  }
}

// =============================================================================
// SEED PRIMARY ADMIN
// =============================================================================

/**
 * Seed primary admin from environment variables
 */
export async function seedPrimaryAdmin(): Promise<void> {
  const primaryEmail = process.env.PRIMARY_ADMIN_EMAIL;
  const primaryTelegramId = process.env.PRIMARY_ADMIN_TELEGRAM_ID;
  
  if (!primaryEmail && !primaryTelegramId) {
    console.log('[ADMIN] No PRIMARY_ADMIN_EMAIL or PRIMARY_ADMIN_TELEGRAM_ID set, skipping seed');
    return;
  }
  
  // Check if already exists
  const existing = primaryTelegramId 
    ? await getAdminByTelegramId(parseInt(primaryTelegramId))
    : primaryEmail ? await getAdminByEmail(primaryEmail) : null;
  
  if (existing) {
    // Update to owner if not already
    if (existing.role !== 'owner') {
      await updateAdmin(existing.id, { role: 'owner' });
      console.log(`[ADMIN] Updated primary admin to owner: ${primaryEmail || primaryTelegramId}`);
    } else {
      console.log(`[ADMIN] Primary admin already exists: ${primaryEmail || primaryTelegramId}`);
    }
    return;
  }
  
  // Create new primary admin
  await createAdmin({
    email: primaryEmail,
    telegram_id: primaryTelegramId ? parseInt(primaryTelegramId) : undefined,
    role: 'owner',
  });
  
  console.log(`[ADMIN] Created primary admin: ${primaryEmail || primaryTelegramId}`);
}

// =============================================================================
// TELEGRAM HELPERS (used by admin-bot.ts)
// =============================================================================

/**
 * Check if a Telegram user (from ctx.from) is an authorized admin.
 * Returns the Admin record or null.
 */
export async function requireAdmin(ctx: any): Promise<any | null> {
  const telegramId = ctx.from?.id;
  if (!telegramId) {
    await ctx.reply('❌ Unauthorized: no Telegram ID');
    return null;
  }
  const admin = await getAdminByTelegramId(telegramId);
  if (!admin) {
    await ctx.reply('❌ Unauthorized: you are not an admin');
    return null;
  }
  if (!admin.is_active) {
    await ctx.reply('❌ Your admin account is disabled');
    return null;
  }
  return admin;
}

/**
 * Check if a Telegram user is the owner.
 * Returns the Admin record or null.
 */
export async function requireOwner(ctx: any): Promise<any | null> {
  const admin = await requireAdmin(ctx);
  if (!admin) return null;
  if (admin.role !== 'owner') {
    await ctx.reply('❌ This command is only for the owner');
    return null;
  }
  return admin;
}

export default {
  createAdmin,
  getAdminByTelegramId,
  getAdminByEmail,
  getAdminByUserId,
  getAdminById,
  listAdmins,
  updateAdmin,
  deleteAdmin,
  isAdminByUserId,
  isAdminByTelegramId,
  hasPermission,
  logAdminAction,
  seedPrimaryAdmin,
  requireAdmin,
  requireOwner,
};