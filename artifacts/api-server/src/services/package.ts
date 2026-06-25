// Package service - Database version (PHASE 5A)
// Replaces in-memory Map with PostgreSQL/Supabase

import { randomUUID } from 'crypto';
import db from '../db';

export interface Package {
  id: string;
  name: string;
  description?: string;
  token_amount: number;
  bonus_tokens: number;
  price_usd_cents: number;
  display_price?: string;
  is_featured: boolean;
  sort_order: number;
  status: string;
  created_at: string;
  updated_at: string;
}

/**
 * Create a new package in the database
 */
export async function createPackage(pkg: {
  id: string;
  name: string;
  description?: string;
  token_amount: number;
  bonus_tokens?: number;
  price_usd_cents: number;
  display_price?: string;
  is_featured?: boolean;
  sort_order?: number;
  status?: string;
}): Promise<Package> {
  const now = new Date().toISOString();
  
  const result = await db.query(
    `INSERT INTO packages (
      id, name, description, token_amount, bonus_tokens,
      price_usd_cents, display_price, is_featured, sort_order,
      status, created_at, updated_at
    ) VALUES (
      $1, $2, $3, $4, $5,
      $6, $7, $8, $9,
      $10, $11, $12
    )
    ON CONFLICT (id) DO UPDATE SET
      name = EXCLUDED.name,
      description = EXCLUDED.description,
      token_amount = EXCLUDED.token_amount,
      bonus_tokens = EXCLUDED.bonus_tokens,
      price_usd_cents = EXCLUDED.price_usd_cents,
      display_price = EXCLUDED.display_price,
      is_featured = EXCLUDED.is_featured,
      sort_order = EXCLUDED.sort_order,
      status = EXCLUDED.status,
      updated_at = EXCLUDED.updated_at
    RETURNING *`,
    [
      pkg.id,
      pkg.name,
      pkg.description || null,
      pkg.token_amount,
      pkg.bonus_tokens || 0,
      pkg.price_usd_cents,
      pkg.display_price || null,
      pkg.is_featured || false,
      pkg.sort_order || 0,
      pkg.status || 'active',
      now,
      now,
    ]
  );
  
  return result.rows[0] as Package;
}

/**
 * Get package by ID
 */
export async function getPackageById(id: string): Promise<Package | null> {
  const result = await db.queryRow(
    'SELECT * FROM packages WHERE id = $1',
    [id]
  );
  return result || null;
}

/**
 * Update package by ID
 */
export async function updatePackage(id: string, patch: Partial<Package>): Promise<Package | null> {
  // Build dynamic UPDATE query
  const fields: string[] = [];
  const values: any[] = [];
  let idx = 1;
  
  // Allowed fields for update
  const allowedFields = [
    'name', 'description', 'token_amount', 'bonus_tokens',
    'price_usd_cents', 'display_price', 'is_featured',
    'sort_order', 'status'
  ];
  
  for (const [key, value] of Object.entries(patch)) {
    if (allowedFields.includes(key) && value !== undefined) {
      fields.push(`${key} = $${idx}`);
      values.push(value);
      idx++;
    }
  }
  
  if (fields.length === 0) {
    // Nothing to update, return current package
    return getPackageById(id);
  }
  
  // Always update updated_at
  fields.push(`updated_at = $${idx}`);
  values.push(new Date().toISOString());
  idx++;
  
  // Add ID parameter
  values.push(id);
  
  const query = `
    UPDATE packages 
    SET ${fields.join(', ')}
    WHERE id = $${idx}
    RETURNING *
  `;
  
  const result = await db.query(query, values);
  
  if (result.rows.length === 0) {
    return null;
  }
  
  return result.rows[0] as Package;
}

/**
 * List all packages (with optional filters)
 */
export async function listPackages(filters?: {
  status?: string;
  is_featured?: boolean;
  limit?: number;
  offset?: number;
}): Promise<Package[]> {
  let query = 'SELECT * FROM packages WHERE 1=1';
  const values: any[] = [];
  let idx = 1;
  
  if (filters?.status && filters.status !== 'all') {
    query += ` AND status = $${idx}`;
    values.push(filters.status);
    idx++;
  }
  
  if (filters?.is_featured !== undefined) {
    query += ` AND is_featured = $${idx}`;
    values.push(filters.is_featured);
    idx++;
  }
  
  query += ' ORDER BY sort_order ASC, created_at DESC';
  
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
  return result.rows as Package[];
}

/**
 * Delete package by ID
 */
export async function deletePackage(id: string): Promise<boolean> {
  const result = await db.query(
    'DELETE FROM packages WHERE id = $1',
    [id]
  );
  return result.rowCount !== null && result.rowCount > 0;
}

/**
 * Clear all packages (FOR DEVELOPMENT/TESTING ONLY - DO NOT USE IN PRODUCTION)
 */
export async function clearPackages(): Promise<void> {
  if (process.env.NODE_ENV === 'production') {
    throw new Error('clearPackages() cannot be called in production!');
  }
  await db.query('DELETE FROM packages');
}

// =============================================================================
// COMPATIBILITY EXPORTS (for existing code)
// =============================================================================


export default {
  createPackage,
  getPackageById,
  updatePackage,
  listPackages,
  deletePackage,
  clearPackages,
};
