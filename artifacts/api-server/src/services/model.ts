// Model service - Database version (PHASE 5A)
// Replaces in-memory Map with PostgreSQL/Supabase

import { randomUUID } from 'crypto';
import db from '../db';

export interface Model {
  id: string;
  slug: string;
  provider_model_id: string;
  provider_name: string;
  display_name: string;
  description?: string;
  pricing_input_per_m: number;
  pricing_output_per_m: number;
  supports_streaming: boolean;
  supports_functions: boolean;
  is_active: boolean;
  context_window: number;
  max_output_tokens: number;
  rate_limit_rpm: number;
  rate_limit_tpm: number;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

/**
 * Create a new model in the database
 */
export async function createModel(model: {
  id: string;
  slug: string;
  provider_model_id: string;
  provider_name: string;
  display_name: string;
  description?: string;
  pricing_input_per_m?: number;
  pricing_output_per_m?: number;
  supports_streaming?: boolean;
  supports_functions?: boolean;
  is_active?: boolean;
  context_window?: number;
  max_output_tokens?: number;
  rate_limit_rpm?: number;
  rate_limit_tpm?: number;
  sort_order?: number;
}): Promise<Model> {
  const now = new Date().toISOString();
  
  const result = await db.query(
    `INSERT INTO models (
      id, slug, provider_model_id, provider_name, display_name,
      description, pricing_input_per_m, pricing_output_per_m,
      supports_streaming, supports_functions, is_active,
      context_window, max_output_tokens, rate_limit_rpm, rate_limit_tpm,
      sort_order, created_at, updated_at
    ) VALUES (
      $1, $2, $3, $4, $5,
      $6, $7, $8,
      $9, $10, $11,
      $12, $13, $14, $15,
      $16, $17, $18
    )
    ON CONFLICT (id) DO UPDATE SET
      slug = EXCLUDED.slug,
      provider_model_id = EXCLUDED.provider_model_id,
      provider_name = EXCLUDED.provider_name,
      display_name = EXCLUDED.display_name,
      description = EXCLUDED.description,
      pricing_input_per_m = EXCLUDED.pricing_input_per_m,
      pricing_output_per_m = EXCLUDED.pricing_output_per_m,
      supports_streaming = EXCLUDED.supports_streaming,
      supports_functions = EXCLUDED.supports_functions,
      is_active = EXCLUDED.is_active,
      context_window = EXCLUDED.context_window,
      max_output_tokens = EXCLUDED.max_output_tokens,
      rate_limit_rpm = EXCLUDED.rate_limit_rpm,
      rate_limit_tpm = EXCLUDED.rate_limit_tpm,
      sort_order = EXCLUDED.sort_order,
      updated_at = EXCLUDED.updated_at
    RETURNING *`,
    [
      model.id,
      model.slug,
      model.provider_model_id,
      model.provider_name,
      model.display_name,
      model.description || null,
      model.pricing_input_per_m || 0,
      model.pricing_output_per_m || 0,
      model.supports_streaming || false,
      model.supports_functions || false,
      model.is_active !== undefined ? model.is_active : true,
      model.context_window || 4096,
      model.max_output_tokens || 4096,
      model.rate_limit_rpm || 1000,
      model.rate_limit_tpm || 10000,
      model.sort_order || 0,
      now,
      now,
    ]
  );
  
  return result.rows[0] as Model;
}

/**
 * Get model by ID
 */
export async function getModelById(id: string): Promise<Model | null> {
  const result = await db.queryRow(
    'SELECT * FROM models WHERE id = $1',
    [id]
  );
  return result || null;
}

/**
 * Get model by slug
 */
export async function getModelBySlug(slug: string): Promise<Model | null> {
  const result = await db.queryRow(
    'SELECT * FROM models WHERE slug = $1',
    [slug]
  );
  return result || null;
}

/**
 * Update model by ID
 */
export async function updateModel(id: string, patch: Partial<Model>): Promise<Model | null> {
  // Build dynamic UPDATE query
  const fields: string[] = [];
  const values: any[] = [];
  let idx = 1;
  
  // Allowed fields for update
  const allowedFields = [
    'slug', 'provider_model_id', 'provider_name', 'display_name',
    'description', 'pricing_input_per_m', 'pricing_output_per_m',
    'supports_streaming', 'supports_functions', 'is_active',
    'context_window', 'max_output_tokens', 'rate_limit_rpm',
    'rate_limit_tpm', 'sort_order'
  ];
  
  for (const [key, value] of Object.entries(patch)) {
    if (allowedFields.includes(key) && value !== undefined) {
      fields.push(`${key} = $${idx}`);
      values.push(value);
      idx++;
    }
  }
  
  if (fields.length === 0) {
    // Nothing to update, return current model
    return getModelById(id);
  }
  
  // Always update updated_at
  fields.push(`updated_at = $${idx}`);
  values.push(new Date().toISOString());
  idx++;
  
  // Add ID parameter
  values.push(id);
  
  const query = `
    UPDATE models 
    SET ${fields.join(', ')}
    WHERE id = $${idx}
    RETURNING *
  `;
  
  const result = await db.query(query, values);
  
  if (result.rows.length === 0) {
    return null;
  }
  
  return result.rows[0] as Model;
}

/**
 * List all models (with optional filters)
 */
export async function listModels(filters?: {
  is_active?: boolean;
  provider_name?: string;
  search?: string;
  limit?: number;
  offset?: number;
}): Promise<Model[]> {
  let query = 'SELECT * FROM models WHERE 1=1';
  const values: any[] = [];
  let idx = 1;
  
  if (filters?.is_active !== undefined) {
    query += ` AND is_active = $${idx}`;
    values.push(filters.is_active);
    idx++;
  }
  
  if (filters?.provider_name) {
    query += ` AND provider_name = $${idx}`;
    values.push(filters.provider_name);
    idx++;
  }
  
  if (filters?.search) {
    query += ` AND (display_name ILIKE $${idx} OR id ILIKE $${idx})`;
    values.push(`%${filters.search}%`);
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
  return result.rows as Model[];
}

/**
 * Delete model by ID
 */
export async function deleteModel(id: string): Promise<boolean> {
  const result = await db.query(
    'DELETE FROM models WHERE id = $1',
    [id]
  );
  return result.rowCount !== null && result.rowCount > 0;
}

/**
 * Clear all models (FOR DEVELOPMENT/TESTING ONLY - DO NOT USE IN PRODUCTION)
 */
export async function clearModels(): Promise<void> {
  if (process.env.NODE_ENV === 'production') {
    throw new Error('clearModels() cannot be called in production!');
  }
  await db.query('DELETE FROM models');
}

// =============================================================================
// COMPATIBILITY EXPORTS (for existing code)
// =============================================================================

export {
  createModel,
  getModelById,
  getModelBySlug,
  updateModel,
  listModels,
  deleteModel,
  clearModels,
};

export default {
  createModel,
  getModelById,
  getModelBySlug,
  updateModel,
  listModels,
  deleteModel,
  clearModels,
};
