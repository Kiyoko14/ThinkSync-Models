// API Key service - Database version (PHASE 5A)
// Replaces in-memory Map with PostgreSQL/Supabase

import { randomUUID } from 'crypto';
import db from '../db';

export interface ApiKey {
  id: string;
  profile_id: string;
  key_prefix: string;
  key_hash: string;
  name: string;
  status: 'active' | 'revoked';
  created_at: string;
  last_used_at?: string;
  expires_at?: string;
}

/**
 * Create a new API key in the database
 */
export async function createApiKey(key: {
  id?: string;
  profile_id: string;
  key_prefix: string;
  key_hash: string;
  name?: string;
  status?: 'active' | 'revoked';
  expires_at?: string;
}): Promise<ApiKey> {
  const id = key.id || randomUUID();
  const now = new Date().toISOString();
  
  const result = await db.query(
    `INSERT INTO api_keys (
      id, profile_id, key_prefix, key_hash, name,
      status, created_at, expires_at
    ) VALUES (
      $1, $2, $3, $4, $5,
      $6, $7, $8
    )
    RETURNING *`,
    [
      id,
      key.profile_id,
      key.key_prefix,
      key.key_hash,
      key.name || 'API Key',
      key.status || 'active',
      now,
      key.expires_at || null,
    ]
  );
  
  return result.rows[0] as ApiKey;
}

/**
 * Get API key by ID
 */
export async function getApiKeyById(id: string): Promise<ApiKey | null> {
  const result = await db.queryRow(
    'SELECT * FROM api_keys WHERE id = $1',
    [id]
  );
  return result || null;
}

/**
 * Get API key by hash (for authentication)
 */
export async function getApiKeyByHash(keyHash: string): Promise<ApiKey | null> {
  const result = await db.queryRow(
    "SELECT * FROM api_keys WHERE key_hash = $1 AND status = 'active'",
    [keyHash]
  );
  return result || null;
}

/**
 * List all API keys for a user
 */
export async function listApiKeysForUser(profileId: string): Promise<ApiKey[]> {
  const result = await db.queryRows(
    'SELECT * FROM api_keys WHERE profile_id = $1 ORDER BY created_at DESC',
    [profileId]
  );
  return result as ApiKey[];
}

/**
 * Revoke an API key (set status to 'revoked')
 */
export async function revokeApiKey(id: string): Promise<ApiKey | null> {
  const result = await db.query(
    `UPDATE api_keys 
     SET status = 'revoked' 
     WHERE id = $1 
     RETURNING *`,
    [id]
  );
    
  if (result.rows.length === 0) {
    return null;
  }
    
  return result.rows[0] as ApiKey;
}

/**
 * Rotate an API key (update hash and prefix)
 */
export async function rotateApiKey(
  id: string,
  newKeyHash: string,
  newPrefix: string
): Promise<ApiKey | null> {
  const now = new Date().toISOString();
    
  const result = await db.query(
    `UPDATE api_keys 
     SET key_hash = $1, key_prefix = $2, created_at = $3
     WHERE id = $4
     RETURNING *`,
    [newKeyHash, newPrefix, now, id]
  );
    
  if (result.rows.length === 0) {
    return null;
  }
    
  return result.rows[0] as ApiKey;
}

/**
 * Update last_used_at timestamp for an API key
 */
export async function updateLastUsed(id: string): Promise<void> {
  const now = new Date().toISOString();
    
  await db.query(
    'UPDATE api_keys SET last_used_at = $1 WHERE id = $2',
    [now, id]
  );
}

/**
 * Delete expired API keys (cleanup function)
 */
export async function deleteExpiredKeys(): Promise<number> {
  const now = new Date().toISOString();
    
  const result = await db.query(
    `DELETE FROM api_keys 
     WHERE expires_at IS NOT NULL 
     AND expires_at < $1`,
    [now]
  );
    
  return result.rowCount || 0;
}

/**
 * Delete an API key permanently
 */
export async function deleteApiKey(id: string): Promise<boolean> {
  const result = await db.query(
    'DELETE FROM api_keys WHERE id = $1',
    [id]
  );
    
  return result.rowCount !== null && result.rowCount > 0;
}

/**
 * Clear all API keys (FOR DEVELOPMENT/TESTING ONLY - DO NOT USE IN PRODUCTION)
 */
export async function clearApiKeys(): Promise<void> {
  if (process.env.NODE_ENV === 'production') {
    throw new Error('clearApiKeys() cannot be called in production!');
  }
  await db.query('DELETE FROM api_keys');
}

// =============================================================================
// COMPATIBILITY EXPORTS (for existing code)
// =============================================================================


export default {
  createApiKey,
  getApiKeyById,
  getApiKeyByHash,
  listApiKeysForUser,
  revokeApiKey,
  rotateApiKey,
  updateLastUsed,
  deleteExpiredKeys,
  deleteApiKey,
  clearApiKeys,
};
