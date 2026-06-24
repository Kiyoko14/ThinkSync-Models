// Payment Request Service - Complete workflow with screenshot management
import { randomUUID } from 'crypto';
import db from '../db';

export interface PaymentRequest {
  id: string;
  user_id: string;
  amount: number;
  currency: string;
  screenshot_url?: string;
  screenshot_deleted: boolean;
  screenshot_deleted_at?: string;
  screenshot_uploaded_at?: string;
  rejection_reason?: string;
  status: 'pending' | 'completed' | 'failed' | 'cancelled' | 'rejected';
  reviewed_by?: string;
  reviewed_at?: string;
  admin_note?: string;
  created_at: string;
  updated_at: string;
}

// =============================================================================
// SCREENSHOT STORAGE MANAGEMENT
// =============================================================================

/**
 * Delete screenshot from Supabase Storage
 * Returns: { success: boolean, error?: string }
 */
async function deleteScreenshotFromStorage(screenshotUrl: string): Promise<{ success: boolean; error?: string }> {
  try {
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY;
    
    if (!supabaseUrl || !supabaseKey) {
      console.warn('[STORAGE] Supabase not configured, skipping screenshot deletion');
      return { success: false, error: 'Storage not configured' };
    }
    
    // Extract file path from URL
    // URL format: https://xxx.supabase.co/storage/v1/object/public/payments/xxx.jpg
    const urlParts = screenshotUrl.split('/storage/v1/object/public/');
    if (urlParts.length < 2) {
      return { success: false, error: 'Invalid screenshot URL format' };
    }
    
    const filePath = urlParts[1];
    
    const response = await fetch(`${supabaseUrl}/storage/v1/object/${filePath}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${supabaseKey}`,
        'Content-Type': 'application/json',
      },
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('[STORAGE] Failed to delete screenshot:', response.status, errorText);
      return { success: false, error: `HTTP ${response.status}: ${errorText}` };
    }
    
    console.log('[STORAGE] Screenshot deleted:', filePath);
    return { success: true };
    
  } catch (error: any) {
    console.error('[STORAGE] Screenshot deletion error:', error.message);
    return { success: false, error: error.message };
  }
}

// =============================================================================
// PAYMENT REQUEST CRUD
// =============================================================================

/**
 * Create a new payment request with screenshot
 */
export async function createPaymentRequest(request: {
  user_id: string;
  amount: number;
  currency?: string;
  screenshot_url?: string;
}): Promise<PaymentRequest> {
  const id = randomUUID();
  const now = new Date().toISOString();
  const currency = request.currency || 'USD';
  
  const result = await db.query(
    `INSERT INTO payment_requests (
      id, user_id, amount, currency, screenshot_url, 
      screenshot_uploaded_at, status, created_at, updated_at
    ) VALUES ($1, $2, $3, $4, $5, $6, 'pending', $7, $8)
    RETURNING *`,
    [
      id, 
      request.user_id, 
      request.amount, 
      currency, 
      request.screenshot_url || null,
      request.screenshot_url ? now : null,
      now, 
      now
    ]
  );
  
  // Create audit log
  await createPaymentAuditLog(request.user_id, 'payment_request_created', id, 
    `Created payment request for ${request.amount} tokens`);
  
  return result.rows[0] as PaymentRequest;
}

/**
 * Get payment request by ID
 */
export async function getPaymentRequestById(id: string): Promise<PaymentRequest | null> {
  const result = await db.query(
    'SELECT * FROM payment_requests WHERE id = $1',
    [id]
  );
  return result.rows[0] || null;
}

/**
 * Update payment request
 */
export async function updatePaymentRequest(id: string, patch: {
  status?: string;
  reviewed_by?: string;
  reviewed_at?: string;
  admin_note?: string;
  rejection_reason?: string;
  screenshot_deleted?: boolean;
  screenshot_deleted_at?: string;
}): Promise<PaymentRequest | null> {
  const now = new Date().toISOString();
  
  const sets: string[] = ['updated_at = $1'];
  const values: any[] = [now];
  let idx = 2;
  
  if (patch.status !== undefined) {
    sets.push(`status = $${idx++}`);
    values.push(patch.status);
  }
  if (patch.reviewed_by !== undefined) {
    sets.push(`reviewed_by = $${idx++}`);
    values.push(patch.reviewed_by);
  }
  if (patch.reviewed_at !== undefined) {
    sets.push(`reviewed_at = $${idx++}`);
    values.push(patch.reviewed_at);
  }
  if (patch.admin_note !== undefined) {
    sets.push(`admin_note = $${idx++}`);
    values.push(patch.admin_note);
  }
  if (patch.rejection_reason !== undefined) {
    sets.push(`rejection_reason = $${idx++}`);
    values.push(patch.rejection_reason);
  }
  if (patch.screenshot_deleted !== undefined) {
    sets.push(`screenshot_deleted = $${idx++}`);
    values.push(patch.screenshot_deleted);
  }
  if (patch.screenshot_deleted_at !== undefined) {
    sets.push(`screenshot_deleted_at = $${idx++}`);
    values.push(patch.screenshot_deleted_at);
  }
  
  values.push(id);
  
  const result = await db.query(
    `UPDATE payment_requests SET ${sets.join(', ')} WHERE id = $${idx} RETURNING *`,
    values
  );
  
  return result.rows[0] || null;
}

/**
 * List payment requests for a user
 */
export async function listPaymentRequestsForUser(userId: string, filters?: {
  status?: string;
  limit?: number;
  offset?: number;
}): Promise<PaymentRequest[]> {
  let query = 'SELECT * FROM payment_requests WHERE user_id = $1';
  const values: any[] = [userId];
  let idx = 2;
  
  if (filters?.status && filters.status !== 'all') {
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
  return result.rows as PaymentRequest[];
}

/**
 * List all payment requests (admin view)
 */
export async function listAllPaymentRequests(filters?: {
  status?: string;
  user_id?: string;
  limit?: number;
  offset?: number;
}): Promise<PaymentRequest[]> {
  let query = 'SELECT * FROM payment_requests WHERE 1=1';
  const values: any[] = [];
  let idx = 1;
  
  if (filters?.status && filters.status !== 'all') {
    query += ` AND status = $${idx}`;
    values.push(filters.status);
    idx++;
  }
  
  if (filters?.user_id) {
    query += ` AND user_id = $${idx}`;
    values.push(filters.user_id);
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
  return result.rows as PaymentRequest[];
}

// =============================================================================
// APPROVAL WORKFLOW
// =============================================================================

/**
 * Approve payment request with full lifecycle:
 * 1. Verify pending status
 * 2. Create transaction
 * 3. Credit user balance
 * 4. Update payment status
 * 5. Delete screenshot from storage
 * 6. Mark screenshot_deleted
 * 7. Create audit logs
 */
export async function approvePaymentRequest(
  paymentId: string,
  adminId: string,
  adminEmail: string,
  adminNote?: string
): Promise<{ success: boolean; error?: string; payment?: PaymentRequest }> {
  const now = new Date().toISOString();
  
  try {
    // Step 1: Get payment request
    const payment = await getPaymentRequestById(paymentId);
    if (!payment) {
      return { success: false, error: 'Payment request not found' };
    }
    
    if (payment.status !== 'pending') {
      return { success: false, error: `Payment request already processed (status: ${payment.status})` };
    }
    
    // Step 2: Start database transaction
    const client = await db.connect();
    try {
      await client.query('BEGIN');
      
      // Step 3: Get user with lock
      const userResult = await client.query(
        'SELECT * FROM users WHERE id = $1 FOR UPDATE',
        [payment.user_id]
      );
      const user = userResult.rows[0];
      
      if (!user) {
        await client.query('ROLLBACK');
        return { success: false, error: 'User not found' };
      }
      
      // Step 4: Calculate new balance
      const currentBalance = user.balance || 0;
      const newBalance = currentBalance + payment.amount;
      
      // Step 5: Update user balance
      await client.query(
        'UPDATE users SET balance = $1, updated_at = $2 WHERE id = $3',
        [newBalance, now, payment.user_id]
      );
      
      // Step 6: Create transaction record
      await client.query(
        `INSERT INTO transactions (
          id, profile_id, amount, balance_after, transaction_type,
          status, description, reference_type, reference_id, created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
        [
          randomUUID(),
          payment.user_id,
          payment.amount,
          newBalance,
          'payment_approved',
          'completed',
          `Payment approved: ${payment.amount} tokens`,
          'payment_request',
          paymentId,
          now,
        ]
      );
      
      // Step 7: Update payment request status
      await client.query(
        `UPDATE payment_requests 
         SET status = 'completed', reviewed_by = $1, reviewed_at = $2, admin_note = $3, updated_at = $4
         WHERE id = $5`,
        [adminId, now, adminNote || null, now, paymentId]
      );
      
      // Step 8: Create audit log for approval
      await client.query(
        `INSERT INTO audit_logs (id, admin_id, admin_email, action, target_type, target_id, details, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [randomUUID(), adminId, adminEmail, 'payment_approved', 'payment_request', paymentId,
         `Approved ${payment.amount} tokens for user ${payment.user_id}`, now]
      );
      
      await client.query('COMMIT');
      
      // Step 9: Handle screenshot deletion (non-blocking)
      let screenshotDeletionSuccess = false;
      if (payment.screenshot_url && !payment.screenshot_deleted) {
        const deleteResult = await deleteScreenshotFromStorage(payment.screenshot_url);
        screenshotDeletionSuccess = deleteResult.success;
        
        // Update screenshot deletion status
        await updatePaymentRequest(paymentId, {
          screenshot_deleted: true,
          screenshot_deleted_at: now,
        });
        
        // Log deletion result
        await createPaymentAuditLog(
          adminId, 
          deleteResult.success ? 'screenshot_deleted' : 'screenshot_delete_failed',
          paymentId,
          `Screenshot deletion: ${deleteResult.success ? 'success' : deleteResult.error}`
        );
      }
      
      console.log(`[PAYMENT] Approved: ${paymentId}, Amount: ${payment.amount}, ` +
        `New balance: ${newBalance}, Screenshot deleted: ${screenshotDeletionSuccess}`);
      
      // Get updated payment
      const updatedPayment = await getPaymentRequestById(paymentId);
      return { success: true, payment: updatedPayment! };
      
    } catch (txError: any) {
      await client.query('ROLLBACK');
      throw txError;
    } finally {
      client.release();
    }
    
  } catch (error: any) {
    console.error('[PAYMENT] Approve error:', error);
    return { success: false, error: error.message };
  }
}

// =============================================================================
// REJECTION WORKFLOW
// =============================================================================

/**
 * Reject payment request with full lifecycle:
 * 1. Verify pending status
 * 2. Update payment status
 * 3. Delete screenshot from storage
 * 4. Mark screenshot_deleted
 * 5. Create audit log
 */
export async function rejectPaymentRequest(
  paymentId: string,
  adminId: string,
  adminEmail: string,
  rejectionReason?: string
): Promise<{ success: boolean; error?: string; payment?: PaymentRequest }> {
  const now = new Date().toISOString();
  
  try {
    // Step 1: Get payment request
    const payment = await getPaymentRequestById(paymentId);
    if (!payment) {
      return { success: false, error: 'Payment request not found' };
    }
    
    if (payment.status !== 'pending') {
      return { success: false, error: `Payment request already processed (status: ${payment.status})` };
    }
    
    // Step 2: Update payment request
    const updated = await updatePaymentRequest(paymentId, {
      status: 'rejected',
      reviewed_by: adminId,
      reviewed_at: now,
      rejection_reason: rejectionReason || null,
    });
    
    // Step 3: Create audit log
    await createPaymentAuditLog(
      adminId,
      'payment_rejected',
      paymentId,
      `Rejected. Reason: ${rejectionReason || 'none'}`
    );
    
    // Step 4: Handle screenshot deletion (non-blocking)
    if (payment.screenshot_url && !payment.screenshot_deleted) {
      const deleteResult = await deleteScreenshotFromStorage(payment.screenshot_url);
      
      // Update screenshot deletion status
      await updatePaymentRequest(paymentId, {
        screenshot_deleted: true,
        screenshot_deleted_at: now,
      });
      
      // Log deletion result
      await createPaymentAuditLog(
        adminId,
        deleteResult.success ? 'screenshot_deleted' : 'screenshot_delete_failed',
        paymentId,
        `Screenshot deletion on reject: ${deleteResult.success ? 'success' : deleteResult.error}`
      );
    }
    
    console.log(`[PAYMENT] Rejected: ${paymentId}, Reason: ${rejectionReason || 'none'}`);
    
    return { success: true, payment: updated! };
    
  } catch (error: any) {
    console.error('[PAYMENT] Reject error:', error);
    return { success: false, error: error.message };
  }
}

// =============================================================================
// AUDIT LOGGING
// =============================================================================

/**
 * Create audit log for payment operations
 */
async function createPaymentAuditLog(
  adminId: string,
  action: string,
  paymentId: string,
  details: string
): Promise<void> {
  try {
    const now = new Date().toISOString();
    await db.query(
      `INSERT INTO audit_logs (id, admin_id, admin_email, action, target_type, target_id, details, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [randomUUID(), adminId, 'system', action, 'payment_request', paymentId, details, now]
    );
  } catch (error: any) {
    console.error('[AUDIT] Failed to create payment audit log:', error.message);
  }
}

// =============================================================================
// EXPORTS
// =============================================================================

export default {
  createPaymentRequest,
  getPaymentRequestById,
  updatePaymentRequest,
  listPaymentRequestsForUser,
  listAllPaymentRequests,
  approvePaymentRequest,
  rejectPaymentRequest,
};