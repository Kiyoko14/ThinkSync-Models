// Transaction service - Database version (PHASE 5A)
// Replaces in-memory Map with PostgreSQL/Supabase

import { randomUUID } from 'crypto';
import db from '../db';

export interface Transaction {
  id: string;
  profile_id: string;
  amount: number;
  balance_after: number;
  transaction_type: string;
  status: string;
  description?: string;
  reference_type?: string;
  reference_id?: string;
  created_at: string;
}

/**
 * Create a new transaction in the database
 */
export async function createTransaction(transaction: {
  id?: string;
  profile_id: string;
  amount: number;
  balance_after: number;
  transaction_type: string;
  status?: string;
  description?: string;
  reference_type?: string;
  reference_id?: string;
}): Promise<Transaction> {
  const id = transaction.id || randomUUID();
  const now = new Date().toISOString();
  
  const result = await db.query(
    `INSERT INTO transactions (
      id, profile_id, amount, balance_after, transaction_type,
      status, description, reference_type, reference_id,
      created_at
    ) VALUES (
      $1, $2, $3, $4, $5,
      $6, $7, $8, $9,
      $10
    )
    RETURNING *`,
    [
      id,
      transaction.profile_id,
      transaction.amount,
      transaction.balance_after,
      transaction.transaction_type,
      transaction.status || 'completed',
      transaction.description || null,
      transaction.reference_type || null,
      transaction.reference_id || null,
      now,
    ]
  );
  
  return result.rows[0] as Transaction;
}

/**
 * Get transaction by ID
 */
export async function getTransactionById(id: string): Promise<Transaction | null> {
  const result = await db.queryRow(
    'SELECT * FROM transactions WHERE id = $1',
    [id]
  );
  return result || null;
}

/**
 * List all transactions for a user
 */
export async function listTransactionsForUser(profileId: string, filters?: {
  transaction_type?: string;
  status?: string;
  limit?: number;
  offset?: number;
}): Promise<Transaction[]> {
  let query = 'SELECT * FROM transactions WHERE profile_id = $1';
  const values: any[] = [profileId];
  let idx = 2;
  
  if (filters?.transaction_type) {
    query += ` AND transaction_type = $${idx}`;
    values.push(filters.transaction_type);
    idx++;
  }
  
  if (filters?.status) {
    query += ` AND status = $${idx}`;
    values.push(filters.status);
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
  return result.rows as Transaction[];
}

/**
 * Get total spent by user
 */
export async function getTotalSpentByUser(profileId: string): Promise<number> {
  const result = await db.queryRow(
    `SELECT SUM(amount) as total 
     FROM transactions 
     WHERE profile_id = $1 
     AND amount > 0 
     AND status = 'completed'`,
    [profileId]
  );
  
  return result ? parseFloat(result.total) || 0 : 0;
}

/**
 * Get current balance for a user (from latest transaction)
 */
export async function getCurrentBalance(profileId: string): Promise<number> {
  const result = await db.queryRow(
    `SELECT balance_after 
     FROM transactions 
     WHERE profile_id = $1 
     ORDER BY created_at DESC 
     LIMIT 1`,
    [profileId]
  );
  
  return result ? parseFloat(result.balance_after) || 0 : 0;
}

/**
 * Delete old transactions (cleanup function)
 */
export async function deleteOldTransactions(olderThanDays: number): Promise<number> {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - olderThanDays);
  
  const result = await db.query(
    'DELETE FROM transactions WHERE created_at < $1',
    [cutoffDate.toISOString()]
  );
  
  return result.rowCount || 0;
}

/**
 * Clear all transactions (FOR DEVELOPMENT/TESTING ONLY - DO NOT USE IN PRODUCTION)
 */
export async function clearTransactions(): Promise<void> {
  if (process.env.NODE_ENV === 'production') {
    throw new Error('clearTransactions() cannot be called in production!');
  }
  await db.query('DELETE FROM transactions');
}

// =============================================================================
// COMPATIBILITY EXPORTS (for existing code)
// =============================================================================

export {
  createTransaction,
  getTransactionById,
  listTransactionsForUser,
  getTotalSpentByUser,
  getCurrentBalance,
  deleteOldTransactions,
  clearTransactions,
};

export default {
  createTransaction,
  getTransactionById,
  listTransactionsForUser,
  getTotalSpentByUser,
  getCurrentBalance,
  deleteOldTransactions,
  clearTransactions,
};
