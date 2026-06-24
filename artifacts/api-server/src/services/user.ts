// User service - Database version (PHASE 5A)
// Replaces in-memory Map with PostgreSQL/Supabase

import { randomUUID } from 'crypto';
import db from '../db';

export interface User {
  id: string;
  email: string;
  password_hash: string;
  display_name?: string | null;
  plan_tier: string;
  role: string;
  is_active: boolean;
  total_spent: number;
  balance: number;
  created_at: string;
  updated_at: string;
  rate_limit_rpm: number;
  rate_limit_tpm: number;
}

/**
 * Create a new user in the database
 */
export async function createUser(user: {
  id?: string;
  email: string;
  password_hash: string;
  display_name?: string | null;
  plan_tier?: string;
  role?: string;
  is_active?: boolean;
  total_spent?: number;
  balance?: number;
  rate_limit_rpm?: number;
  rate_limit_tpm?: number;
}): Promise<User> {
  const id = user.id || randomUUID();
  const now = new Date().toISOString();
  
  const result = await db.query(
    `INSERT INTO users (
      id, email, password_hash, display_name, plan_tier, role,
      is_active, total_spent, balance, rate_limit_rpm, rate_limit_tpm,
      created_at, updated_at
    ) VALUES (
      $1, $2, $3, $4, $5, $6,
      $7, $8, $9, $10, $11,
      $12, $13
    )
    ON CONFLICT (id) DO UPDATE SET
      email = EXCLUDED.email,
      password_hash = EXCLUDED.password_hash,
      display_name = EXCLUDED.display_name,
      plan_tier = EXCLUDED.plan_tier,
      role = EXCLUDED.role,
      is_active = EXCLUDED.is_active,
      total_spent = EXCLUDED.total_spent,
      balance = EXCLUDED.balance,
      rate_limit_rpm = EXCLUDED.rate_limit_rpm,
      rate_limit_tpm = EXCLUDED.rate_limit_tpm,
      updated_at = EXCLUDED.updated_at
    RETURNING *`,
    [
      id,
      user.email,
      user.password_hash,
      user.display_name || null,
      user.plan_tier || 'free',
      user.role || 'user',
      user.is_active !== undefined ? user.is_active : true,
      user.total_spent || 0,
      user.balance || 0,
      user.rate_limit_rpm || 60,
      user.rate_limit_tpm || 10000,
      now,
      now,
    ]
  );
  
  return result.rows[0] as User;
}

/**
 * Get user by ID
 */
export async function getUserById(id: string): Promise<User | null> {
  const result = await db.queryRow(
    'SELECT * FROM users WHERE id = $1',
    [id]
  );
  return result || null;
}

/**
 * Get user by email
 */
export async function getUserByEmail(email: string): Promise<User | null> {
  const result = await db.queryRow(
    'SELECT * FROM users WHERE email = $1',
    [email]
  );
  return result || null;
}

/**
 * Update user by ID
 */
export async function updateUser(id: string, patch: Partial<User>): Promise<User | null> {
  // Build dynamic UPDATE query
  const fields: string[] = [];
  const values: any[] = [];
  let idx = 1;
  
  // Allowed fields for update
  const allowedFields = [
    'email', 'password_hash', 'display_name', 'plan_tier', 'role',
    'is_active', 'total_spent', 'balance', 'rate_limit_rpm', 'rate_limit_tpm'
  ];
  
  for (const [key, value] of Object.entries(patch)) {
    if (allowedFields.includes(key) && value !== undefined) {
      fields.push(`${key} = $${idx}`);
      values.push(value);
      idx++;
    }
  }
  
  if (fields.length === 0) {
    // Nothing to update, return current user
    return getUserById(id);
  }
  
  // Always update updated_at
  fields.push(`updated_at = $${idx}`);
  values.push(new Date().toISOString());
  idx++;
  
  // Add ID parameter
  values.push(id);
  
  const query = `
    UPDATE users 
    SET ${fields.join(', ')}
    WHERE id = $${idx}
    RETURNING *
  `;
  
  const result = await db.query(query, values);
  
  if (result.rows.length === 0) {
    return null;
  }
  
  return result.rows[0] as User;
}

/**
 * List all users (with optional filters)
 */
export async function listUsers(filters?: {
  search?: string;
  plan_tier?: string;
  is_active?: boolean;
  limit?: number;
  offset?: number;
}): Promise<User[]> {
  let query = 'SELECT * FROM users WHERE 1=1';
  const values: any[] = [];
  let idx = 1;
  
  if (filters?.search) {
    query += ` AND (email ILIKE $${idx} OR display_name ILIKE $${idx})`;
    values.push(`%${filters.search}%`);
    idx++;
  }
  
  if (filters?.plan_tier && filters.plan_tier !== 'all') {
    query += ` AND plan_tier = $${idx}`;
    values.push(filters.plan_tier);
    idx++;
  }
  
  if (filters?.is_active !== undefined && filters.is_active !== null) {
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
  return result.rows as User[];
}

/**
 * Delete user by ID (optional, for admin use)
 */
export async function deleteUser(id: string): Promise<boolean> {
  const result = await db.query(
    'DELETE FROM users WHERE id = $1',
    [id]
  );
  return result.rowCount !== null && result.rowCount > 0;
}

/**
 * Clear all users (FOR DEVELOPMENT/TESTING ONLY - DO NOT USE IN PRODUCTION)
 */
export async function clearUsers(): Promise<void> {
  if (process.env.NODE_ENV === 'production') {
    throw new Error('clearUsers() cannot be called in production!');
  }
  await db.query('DELETE FROM users');
}

/**
 * Seed initial admin user if not exists (for first setup)
 */
export async function seedAdminUser(): Promise<void> {
  const adminEmail = process.env.ADMIN_EMAIL || 'admin@thinksync.ai';
  const adminPasswordHash = process.env.ADMIN_PASSWORD_HASH;
  
  if (!adminPasswordHash) {
    console.warn('⚠️  ADMIN_PASSWORD_HASH not set. Skipping admin seed.');
    return;
  }
  
  const existing = await getUserByEmail(adminEmail);
  
  if (!existing) {
    await createUser({
      email: adminEmail,
      password_hash: adminPasswordHash,
      display_name: 'Admin',
      plan_tier: 'enterprise',
      role: 'admin',
      is_active: true,
      total_spent: 0,
      balance: 0,
      rate_limit_rpm: 1000,
      rate_limit_tpm: 100000,
    });
    console.log(`✅ Admin user created: ${adminEmail}`);
  } else {
    console.log(`ℹ️  Admin user already exists: ${adminEmail}`);
  }
}

// =============================================================================
// COMPATIBILITY EXPORTS (for existing code)
// =============================================================================

// Keep function signatures compatible with old in-memory version
export { createUser, getUserById, getUserByEmail, updateUser, listUsers };

// Default export for flexibility
export default {
  createUser,
  getUserById,
  getUserByEmail,
  updateUser,
  listUsers,
  deleteUser,
  clearUsers,
  seedAdminUser,
};
