// Database connection - Phase 5A
// PostgreSQL/Supabase connection using native pg driver

import pg from 'pg';

const { Pool } = pg;

// Database URL from environment
const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.warn('DATABASE_URL not set - database features disabled');
}

// Create connection pool
export const pool = new Pool({
  connectionString: DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
  statement_timeout: 30000,
});

// =============================================================================
// DATABASE RETRY SYSTEM (Phase 5C.7)
// =============================================================================

const DB_MAX_RETRIES = 3;
const DB_INITIAL_DELAY = 500;

/**
 * Check if error is retryable
 */
function isDbRetryable(error: any): boolean {
  if (!error) return false;
  
  const message = error.message || '';
  
  // Retry on connection errors
  if (message.includes('connect ECONNREFUSED')) return true;
  if (message.includes('connection timeout')) return true;
  if (message.includes('pool timeout')) return true;
  if (message.includes('the database system is starting up')) return true;
  if (message.includes('remaining connection slots are reserved')) return true;
  
  // Don't retry on query errors (syntax, validation, etc)
  if (message.includes('syntax error')) return false;
  if (message.includes('invalid input')) return false;
  if (message.includes('duplicate key')) return false;
  if (message.includes('not null violation')) return false;
  if (message.includes('foreign key violation')) return false;
  
  return true; // Default to retry for unknown errors
}

// Query result includes rowCount for INSERT/UPDATE/DELETE RETURNING
export async function query<T = any>(text: string, params?: any[]): Promise<{ rows: T[]; rowCount: number }> {
  let lastError: Error;
  
  for (let attempt = 1; attempt <= DB_MAX_RETRIES; attempt++) {
    try {
      const result = await pool.query(text, params);
      return { rows: result.rows, rowCount: result.rowCount ?? result.rows.length };
    } catch (error) {
      lastError = error as Error;
      
      if (!isDbRetryable(error) || attempt >= DB_MAX_RETRIES) {
        console.error(`[DB] Query failed after ${attempt} attempts:`, lastError.message);
        throw lastError;
      }
      
      const delayMs = DB_INITIAL_DELAY * Math.pow(2, attempt - 1);
      console.warn(`[DB] Attempt ${attempt}/${DB_MAX_RETRIES} failed: ${lastError.message}. Retrying in ${delayMs}ms...`);
      
      await new Promise(resolve => setTimeout(resolve, delayMs));
    }
  }
  
  throw lastError!;
}

// Get single row (alias: queryRow)
export async function queryOne<T = any>(text: string, params?: any[]): Promise<T | null> {
  const result = await query<T>(text, params);
  return result.rows[0] || null;
}

// Alias for queryOne - used by services
export async function queryRow<T = any>(text: string, params?: any[]): Promise<T | null> {
  return queryOne<T>(text, params);
}

// Alias for query - used by services
export async function queryRows<T = any>(text: string, params?: any[]): Promise<T[]> {
  const result = await query<T>(text, params);
  return result.rows;
}

// Get client for transactions (alias: connect)
export async function getClient(): Promise<any> {
  return pool.connect();
}

// Alias for getClient - used by services
export async function connect(): Promise<any> {
  return getClient();
}

// Health check
export async function healthCheck(): Promise<boolean> {
  try {
    await pool.query('SELECT 1');
    return true;
  } catch (error) {
    console.error('Database health check failed:', error);
    return false;
  }
}

// Export default for convenience
const db = {
  query,
  queryOne,
  queryRow,
  queryRows,
  getClient,
  connect,
  healthCheck,
  pool,
};

export default db;
