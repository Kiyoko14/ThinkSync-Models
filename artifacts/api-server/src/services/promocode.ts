// Promocode service - Database version (PHASE 5A)
// Replaces in-memory Map with PostgreSQL/Supabase

import { randomUUID } from 'crypto';
import db from '../db';

export interface Promocode {
  id: string;
  code: string;
  description?: string;
  discount_type: 'percentage' | 'fixed';
  discount_value: number;
  max_uses?: number;
  used_count: number;
  valid_from: string;
  valid_until?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

/**
 * Create a new promocode in the database
 */
export async function createPromocode(promocode: {
  id?: string;
  code: string;
  description?: string;
  discount_type: 'percentage' | 'fixed';
  discount_value: number;
  max_uses?: number;
  valid_from?: string;
  valid_until?: string;
  is_active?: boolean;
}): Promise<Promocode> {
  const id = promocode.id || randomUUID();
  const now = new Date().toISOString();
  
  const result = await db.query(
    `INSERT INTO promocodes (
      id, code, description, discount_type, discount_value,
      max_uses, used_count, valid_from, valid_until,
      is_active, created_at, updated_at
    ) VALUES (
      $1, $2, $3, $4, $5,
      $6, $7, $8, $9,
      $10, $11, $12
    )
    ON CONFLICT (id) DO UPDATE SET
      code = EXCLUDED.code,
      description = EXCLUDED.description,
      discount_type = EXCLUDED.discount_type,
      discount_value = EXCLUDED.discount_value,
      max_uses = EXCLUDED.max_uses,
      used_count = EXCLUDED.used_count,
      valid_from = EXCLUDED.valid_from,
      valid_until = EXCLUDED.valid_until,
      is_active = EXCLUDED.is_active,
      updated_at = EXCLUDED.updated_at
    RETURNING *`,
    [
      id,
      promocode.code,
      promocode.description || null,
      promocode.discount_type,
      promocode.discount_value,
      promocode.max_uses || null,
      0,
      promocode.valid_from || now,
      promocode.valid_until || null,
      promocode.is_active !== undefined ? promocode.is_active : true,
      now,
      now,
    ]
  );
  
  return result.rows[0] as Promocode;
}

/**
 * Get promocode by ID
 */
export async function getPromocodeById(id: string): Promise<Promocode | null> {
  const result = await db.queryRow(
    'SELECT * FROM promocodes WHERE id = $1',
    [id]
  );
  return result || null;
}

/**
 * Get promocode by code
 */
export async function getPromocodeByCode(code: string): Promise<Promocode | null> {
  const result = await db.queryRow(
    'SELECT * FROM promocodes WHERE code = $1 AND is_active = true',
    [code]
  );
  return result || null;
}

/**
 * Update promocode by ID
 */
export async function updatePromocode(id: string, patch: Partial<Promocode>): Promise<Promocode | null> {
  // Build dynamic UPDATE query
  const fields: string[] = [];
  const values: any[] = [];
  let idx = 1;
  
  // Allowed fields for update
  const allowedFields = [
    'code', 'description', 'discount_type', 'discount_value',
    'max_uses', 'used_count', 'valid_from', 'valid_until', 'is_active'
  ];
  
  for (const [key, value] of Object.entries(patch)) {
    if (allowedFields.includes(key) && value !== undefined) {
      fields.push(`${key} = $${idx}`);
      values.push(value);
      idx++;
    }
  }
  
  if (fields.length === 0) {
    // Nothing to update, return current promocode
    return getPromocodeById(id);
  }
  
  // Always update updated_at
  fields.push(`updated_at = $${idx}`);
  values.push(new Date().toISOString());
  idx++;
  
  // Add ID parameter
  values.push(id);
  
  const query = `
    UPDATE promocodes 
    SET ${fields.join(', ')}
    WHERE id = $${idx}
    RETURNING *
  `;
  
  const result = await db.query(query, values);
  
  if (result.rows.length === 0) {
    return null;
  }
  
  return result.rows[0] as Promocode;
}

/**
 * Increment used_count for a promocode
 */
export async function incrementUsedCount(id: string): Promise<Promocode | null> {
  const result = await db.query(
    `UPDATE promocodes 
     SET used_count = used_count + 1, updated_at = $1
     WHERE id = $2
     RETURNING *`,
    [new Date().toISOString(), id]
  );
  
  if (result.rows.length === 0) {
    return null;
  }
  
  return result.rows[0] as Promocode;
}

/**
 * List all promocodes (with optional filters)
 */
export async function listPromocodes(filters?: {
  is_active?: boolean;
  valid_now?: boolean;
  search?: string;
  limit?: number;
  offset?: number;
}): Promise<Promocode[]> {
  let query = 'SELECT * FROM promocodes WHERE 1=1';
  const values: any[] = [];
  let idx = 1;
  
  if (filters?.is_active !== undefined) {
    query += ` AND is_active = $${idx}`;
    values.push(filters.is_active);
    idx++;
  }
  
  if (filters?.valid_now) {
    const now = new Date().toISOString();
    query += ` AND valid_from <= $${idx} AND (valid_until IS NULL OR valid_until >= $${idx})`;
    values.push(now);
    idx++;
  }
  
  if (filters?.search) {
    query += ` AND (code ILIKE $${idx} OR description ILIKE $${idx})`;
    values.push(`%${filters.search}%`);
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
  return result.rows as Promocode[];
}

/**
 * Delete promocode by ID
 */
export async function deletePromocode(id: string): Promise<boolean> {
  const result = await db.query(
    'DELETE FROM promocodes WHERE id = $1',
    [id]
  );
  return result.rowCount !== null && result.rowCount > 0;
}

/**
 * Clear all promocodes (FOR DEVELOPMENT/TESTING ONLY - DO NOT USE IN PRODUCTION)
 */
export async function clearPromocodes(): Promise<void> {
  if (process.env.NODE_ENV === 'production') {
    throw new Error('clearPromocodes() cannot be called in production!');
  }
  await db.query('DELETE FROM promocodes');
}

// =============================================================================
// COMPATIBILITY EXPORTS (for existing code)
// =============================================================================


export default {
  createPromocode,
  getPromocodeById,
  getPromocodeByCode,
  updatePromocode,
  incrementUsedCount,
  listPromocodes,
  deletePromocode,
  clearPromocodes,
};
