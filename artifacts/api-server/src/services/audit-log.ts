// Audit Log service - Database version (PHASE 5A)
// Replaces in-memory Map with PostgreSQL/Supabase

import { randomUUID } from 'crypto';
import db from '../db';

export interface AuditLog {
  id: string;
  profile_id?: string;
  action: string;
  resource: string;
  resource_id?: string;
  details?: any;
  ip_address?: string;
  user_agent?: string;
  created_at: string;
}

/**
 * Create a new audit log entry in the database
 */
export async function createAuditLog(log: {
  id?: string;
  profile_id?: string;
  action: string;
  resource: string;
  resource_id?: string;
  details?: any;
  ip_address?: string;
  user_agent?: string;
}): Promise<AuditLog> {
  const id = log.id || randomUUID();
  const now = new Date().toISOString();
  
  const result = await db.query(
    `INSERT INTO audit_logs (
      id, profile_id, action, resource, resource_id,
      details, ip_address, user_agent, created_at
    ) VALUES (
      $1, $2, $3, $4, $5,
      $6, $7, $8, $9
    )
    RETURNING *`,
    [
      id,
      log.profile_id || null,
      log.action,
      log.resource,
      log.resource_id || null,
      log.details ? JSON.stringify(log.details) : null,
      log.ip_address || null,
      log.user_agent || null,
      now,
    ]
  );
  
  return result.rows[0] as AuditLog;
}

/**
 * Get audit log by ID
 */
export async function getAuditLogById(id: string): Promise<AuditLog | null> {
  const result = await db.queryRow(
    'SELECT * FROM audit_logs WHERE id = $1',
    [id]
  );
  return result || null;
}

/**
 * List all audit logs for a user
 */
export async function listAuditLogsForUser(profileId: string, filters?: {
  action?: string;
  resource?: string;
  start_date?: string;
  end_date?: string;
  limit?: number;
  offset?: number;
}): Promise<AuditLog[]> {
  let query = 'SELECT * FROM audit_logs WHERE profile_id = $1';
  const values: any[] = [profileId];
  let idx = 2;
  
  if (filters?.action) {
    query += ` AND action = $${idx}`;
    values.push(filters.action);
    idx++;
  }
  
  if (filters?.resource) {
    query += ` AND resource = $${idx}`;
    values.push(filters.resource);
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
  return result.rows as AuditLog[];
}

/**
 * List all audit logs (admin only)
 */
export async function listAllAuditLogs(filters?: {
  action?: string;
  resource?: string;
  start_date?: string;
  end_date?: string;
  limit?: number;
  offset?: number;
}): Promise<AuditLog[]> {
  let query = 'SELECT * FROM audit_logs WHERE 1=1';
  const values: any[] = [];
  let idx = 1;
  
  if (filters?.action) {
    query += ` AND action = $${idx}`;
    values.push(filters.action);
    idx++;
  }
  
  if (filters?.resource) {
    query += ` AND resource = $${idx}`;
    values.push(filters.resource);
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
  return result.rows as AuditLog[];
}

/**
 * Delete old audit logs (cleanup function)
 */
export async function deleteOldAuditLogs(olderThanDays: number): Promise<number> {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - olderThanDays);
  
  const result = await db.query(
    'DELETE FROM audit_logs WHERE created_at < $1',
    [cutoffDate.toISOString()]
  );
  
  return result.rowCount || 0;
}

/**
 * Clear all audit logs (FOR DEVELOPMENT/TESTING ONLY - DO NOT USE IN PRODUCTION)
 */
export async function clearAuditLogs(): Promise<void> {
  if (process.env.NODE_ENV === 'production') {
    throw new Error('clearAuditLogs() cannot be called in production!');
  }
  await db.query('DELETE FROM audit_logs');
}

// =============================================================================
// COMPATIBILITY EXPORTS (for existing code)
// =============================================================================

export {
  createAuditLog,
  getAuditLogById,
  listAuditLogsForUser,
  listAllAuditLogs,
  deleteOldAuditLogs,
  clearAuditLogs,
};

export default {
  createAuditLog,
  getAuditLogById,
  listAuditLogsForUser,
  listAllAuditLogs,
  deleteOldAuditLogs,
  clearAuditLogs,
};
