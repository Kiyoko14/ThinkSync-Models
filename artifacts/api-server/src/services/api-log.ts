// API Log service - Database version (PHASE 5A)
// Replaces in-memory Map with PostgreSQL/Supabase

import { randomUUID } from 'crypto';
import db from '../db';

export interface ApiLog {
  id: string;
  profile_id?: string;
  api_key_id?: string;
  model_id?: string;
  model_slug: string;
  auth_method: string;
  input_tokens: number;
  output_tokens: number;
  total_tokens: number;
  input_cost: number;
  output_cost: number;
  total_cost: number;
  status: string;
  error_message?: string;
  ip_address?: string;
  user_agent?: string;
  created_at: string;
}

/**
 * Create a new API log entry in the database
 */
export async function createApiLog(log: {
  id?: string;
  profile_id?: string;
  api_key_id?: string;
  model_id?: string;
  model_slug: string;
  auth_method?: string;
  input_tokens?: number;
  output_tokens?: number;
  total_tokens?: number;
  input_cost?: number;
  output_cost?: number;
  total_cost?: number;
  estimated_cost?: number;
  duration_ms?: number;
  status?: string;
  status_code?: number;
  error_message?: string;
  request_model?: string;
  stream_enabled?: boolean;
  ip_address?: string;
  user_agent?: string;
}): Promise<ApiLog> {
  const id = log.id || randomUUID();
  const now = new Date().toISOString();
  
  const result = await db.query(
    `INSERT INTO api_logs (
      id, profile_id, api_key_id, model_id, model_slug, auth_method,
      input_tokens, output_tokens, total_tokens,
      input_cost, output_cost, total_cost,
      status, error_message, ip_address, user_agent, created_at
    ) VALUES (
      $1, $2, $3, $4, $5, $6,
      $7, $8, $9,
      $10, $11, $12,
      $13, $14, $15, $16, $17
    )
    RETURNING *`,
    [
      id,
      log.profile_id || null,
      log.api_key_id || null,
      log.model_id || null,
      log.model_slug,
      log.auth_method || 'api_key',
      log.input_tokens || 0,
      log.output_tokens || 0,
      log.total_tokens || 0,
      log.input_cost || 0,
      log.output_cost || 0,
      log.total_cost || 0,
      log.status || 'success',
      log.error_message || null,
      log.ip_address || null,
      log.user_agent || null,
      now,
    ]
  );
  
  return result.rows[0] as ApiLog;
}

/**
 * Get API log by ID
 */
export async function getApiLogById(id: string): Promise<ApiLog | null> {
  const result = await db.queryRow(
    'SELECT * FROM api_logs WHERE id = $1',
    [id]
  );
  return result || null;
}

/**
 * List all API logs for a user
 */
export async function listApiLogsForUser(profileId: string, filters?: {
  model_slug?: string;
  status?: string;
  start_date?: string;
  end_date?: string;
  limit?: number;
  offset?: number;
}): Promise<ApiLog[]> {
  let query = 'SELECT * FROM api_logs WHERE profile_id = $1';
  const values: any[] = [profileId];
  let idx = 2;
  
  if (filters?.model_slug) {
    query += ` AND model_slug = $${idx}`;
    values.push(filters.model_slug);
    idx++;
  }
  
  if (filters?.status) {
    query += ` AND status = $${idx}`;
    values.push(filters.status);
    idx++;
  }
  
  if (filters?.start_date) {
    query += ` AND created_at >= $${idx}`;
    values.push(filters.start_date);
    idx++;
  }
  
  if (filters?.end_date) {
    query += ` AND created_at <= $${idx}`;
    values.push(filters.end_date);
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
  return result.rows as ApiLog[];
}

/**
 * Get API usage statistics for a user
 */
export async function getApiUsageStats(profileId: string, periodDays: number = 30): Promise<{
  total_requests: number;
  total_tokens: number;
  total_cost: number;
  avg_duration_ms: number;
}> {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - periodDays);
  
  const result = await db.queryRow(
    `SELECT 
       COUNT(*) as total_requests,
       SUM(total_tokens) as total_tokens,
       SUM(estimated_cost) as total_cost,
       AVG(duration_ms) as avg_duration_ms
     FROM api_logs 
     WHERE profile_id = $1 
     AND created_at >= $2`,
    [profileId, startDate.toISOString()]
  );
  
  return {
    total_requests: result ? parseInt(result.total_requests) || 0 : 0,
    total_tokens: result ? parseInt(result.total_tokens) || 0 : 0,
    total_cost: result ? parseFloat(result.total_cost) || 0 : 0,
    avg_duration_ms: result ? parseFloat(result.avg_duration_ms) || 0 : 0,
  };
}

/**
 * Delete old API logs (cleanup function)
 */
export async function deleteOldApiLogs(olderThanDays: number): Promise<number> {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - olderThanDays);
  
  const result = await db.query(
    'DELETE FROM api_logs WHERE created_at < $1',
    [cutoffDate.toISOString()]
  );
  
  return result.rowCount || 0;
}

/**
 * Clear all API logs (FOR DEVELOPMENT/TESTING ONLY - DO NOT USE IN PRODUCTION)
 */
export async function clearApiLogs(): Promise<void> {
  if (process.env.NODE_ENV === 'production') {
    throw new Error('clearApiLogs() cannot be called in production!');
  }
  await db.query('DELETE FROM api_logs');
}

// =============================================================================
// COMPATIBILITY EXPORTS (for existing code)
// =============================================================================


export default {
  createApiLog,
  getApiLogById,
  listApiLogsForUser,
  getApiUsageStats,
  deleteOldApiLogs,
  clearApiLogs,
};

// listAllApiLogs - returns all API logs (admin use)
export async function listAllApiLogs(filters?: {
  profile_id?: string;
  model_slug?: string;
  status?: string;
  limit?: number;
  offset?: number;
}): Promise<ApiLog[]> {
  let query = 'SELECT * FROM api_logs';
  const values: any[] = [];
  let idx = 1;
  const where: string[] = [];
  
  if (filters?.profile_id) {
    where.push(`profile_id = $${idx}`);
    values.push(filters.profile_id);
    idx++;
  }
  if (filters?.model_slug) {
    where.push(`model_slug = $${idx}`);
    values.push(filters.model_slug);
    idx++;
  }
  if (filters?.status) {
    where.push(`status = $${idx}`);
    values.push(filters.status);
    idx++;
  }
  
  if (where.length > 0) {
    query += ' WHERE ' + where.join(' AND ');
  }
  
  query += ' ORDER BY created_at DESC';
  
  if (filters?.limit) {
    query += ` LIMIT $${idx}`;
    values.push(filters.limit);
    idx++;
  }
  
  const result = await db.query(query, values);
  return result.rows;
}

// Compatibility alias
export const listApiLogs = listAllApiLogs;
