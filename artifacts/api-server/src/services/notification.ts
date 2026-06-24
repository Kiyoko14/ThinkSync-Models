// Notification Service - Unified notifications for Frontend and Telegram
import { randomUUID } from 'crypto';
import db from '../db';

export type NotificationType = 
  | 'payment_approved'
  | 'payment_rejected'
  | 'payment_received'
  | 'api_key_created'
  | 'api_key_revoked'
  | 'balance_low'
  | 'account_verified';

export interface Notification {
  id: string;
  user_id: string;
  type: NotificationType;
  title: string;
  message: string | null;
  is_read: boolean;
  data: Record<string, any>;
  created_at: string;
}

/**
 * Create a notification for a user
 */
export async function createNotification(notification: {
  user_id: string;
  type: NotificationType;
  title: string;
  message?: string;
  data?: Record<string, any>;
}): Promise<Notification> {
  const id = randomUUID();
  const now = new Date().toISOString();
  
  await db.query(
    `INSERT INTO notifications (id, user_id, type, title, message, data, created_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7)`,
    [
      id,
      notification.user_id,
      notification.type,
      notification.title,
      notification.message || null,
      JSON.stringify(notification.data || {}),
      now
    ]
  );
  
  return {
    id,
    user_id: notification.user_id,
    type: notification.type,
    title: notification.title,
    message: notification.message || null,
    is_read: false,
    data: notification.data || {},
    created_at: now
  };
}

/**
 * Get notifications for a user
 */
export async function getNotificationsForUser(
  userId: string,
  options?: { limit?: number; offset?: number; unread_only?: boolean }
): Promise<Notification[]> {
  const limit = options?.limit || 50;
  const offset = options?.offset || 0;
  
  let query = `
    SELECT * FROM notifications 
    WHERE user_id = $1
  `;
  const params: any[] = [userId];
  
  if (options?.unread_only) {
    query += ` AND is_read = false`;
  }
  
  query += ` ORDER BY created_at DESC LIMIT $2 OFFSET $3`;
  params.push(limit, offset);
  
  const result = await db.query(query, params);
  
  return result.rows.map(row => ({
    ...row,
    data: typeof row.data === 'string' ? JSON.parse(row.data) : row.data
  }));
}

/**
 * Get unread notification count
 */
export async function getUnreadCount(userId: string): Promise<number> {
  const result = await db.query(
    `SELECT COUNT(*) as count FROM notifications WHERE user_id = $1 AND is_read = false`,
    [userId]
  );
  return parseInt(result.rows[0]?.count || '0');
}

/**
 * Mark notification as read
 */
export async function markAsRead(notificationId: string, userId: string): Promise<boolean> {
  const result = await db.query(
    `UPDATE notifications SET is_read = true WHERE id = $1 AND user_id = $2 RETURNING id`,
    [notificationId, userId]
  );
  return (result.rowCount || 0) > 0;
}

/**
 * Mark all notifications as read for a user
 */
export async function markAllAsRead(userId: string): Promise<number> {
  const result = await db.query(
    `UPDATE notifications SET is_read = true WHERE user_id = $1 AND is_read = false RETURNING id`,
    [userId]
  );
  return result.rowCount || 0;
}

/**
 * Delete old notifications (cleanup)
 */
export async function deleteOldNotifications(olderThanDays: number = 30): Promise<number> {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - olderThanDays);
  
  const result = await db.query(
    `DELETE FROM notifications WHERE created_at < $1 AND is_read = true RETURNING id`,
    [cutoff.toISOString()]
  );
  
  return result.rowCount || 0;
}

// =============================================================================
// NOTIFICATION HELPERS FOR SPECIFIC SCENARIOS
// =============================================================================

/**
 * Notify user of payment approval
 */
export async function notifyPaymentApproved(
  userId: string,
  paymentId: string,
  amount: number,
  currency: string,
  reviewerEmail?: string
): Promise<Notification> {
  return createNotification({
    user_id: userId,
    type: 'payment_approved',
    title: '✅ To\'lov tasdiqlandi',
    message: `Sizning ${amount} ${currency} to'lovingiz tasdiqlandi. Balansingiz yangilandi.`,
    data: {
      payment_id: paymentId,
      amount,
      currency,
      reviewer: reviewerEmail
    }
  });
}

/**
 * Notify user of payment rejection
 */
export async function notifyPaymentRejected(
  userId: string,
  paymentId: string,
  amount: number,
  currency: string,
  reason?: string
): Promise<Notification> {
  return createNotification({
    user_id: userId,
    type: 'payment_rejected',
    title: '❌ To\'lov bekor qilindi',
    message: reason 
      ? `Sizning ${amount} ${currency} to'lovingiz bekor qilindi. Sabab: ${reason}`
      : `Sizning ${amount} ${currency} to'lovingiz bekor qilindi.`,
    data: {
      payment_id: paymentId,
      amount,
      currency,
      reason
    }
  });
}

/**
 * Notify user of new payment request (for admin notifications)
 */
export async function notifyPaymentReceived(
  adminUserId: string,
  paymentId: string,
  userEmail: string,
  amount: number,
  currency: string,
  source: string
): Promise<Notification> {
  return createNotification({
    user_id: adminUserId,
    type: 'payment_received',
    title: '💰 Yangi to\'lov so\'rovi',
    message: `${userEmail} tomonidan ${amount} ${currency} to'lov so'rovi (${source})`,
    data: {
      payment_id: paymentId,
      user_email: userEmail,
      amount,
      currency,
      source
    }
  });
}

export default {
  createNotification,
  getNotificationsForUser,
  getUnreadCount,
  markAsRead,
  markAllAsRead,
  deleteOldNotifications,
  notifyPaymentApproved,
  notifyPaymentRejected,
  notifyPaymentReceived,
};