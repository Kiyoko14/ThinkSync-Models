import { randomUUID } from "crypto";

export interface PaymentRequest {
  id: string;
  user_id: string;
  amount: number;
  currency: string;
  screenshot_url?: string | null;
  status: "pending" | "approved" | "rejected";
  admin_id?: string | null;
  admin_email?: string | null;
  admin_note?: string | null;
  created_at: string;
  updated_at: string;
}

const paymentRequests = new Map<string, PaymentRequest>();

export function createPaymentRequest(
  pr: Omit<PaymentRequest, "id" | "created_at" | "updated_at" | "status" | "admin_id" | "admin_email" | "admin_note"> & { id?: string }
): PaymentRequest {
  const now = new Date().toISOString();
  const req: PaymentRequest = {
    id: pr.id || randomUUID(),
    user_id: pr.user_id,
    amount: pr.amount,
    currency: pr.currency,
    screenshot_url: pr.screenshot_url || null,
    status: "pending",
    admin_id: null,
    admin_email: null,
    admin_note: null,
    created_at: now,
    updated_at: now,
  };
  paymentRequests.set(req.id, req);
  return req;
}

export function getPaymentRequestById(id: string): PaymentRequest | undefined {
  return paymentRequests.get(id);
}

export function listPaymentRequests(filters?: { user_id?: string; status?: string }): PaymentRequest[] {
  let all = [...paymentRequests.values()];
  if (filters?.user_id) all = all.filter((r) => r.user_id === filters.user_id);
  if (filters?.status) all = all.filter((r) => r.status === filters.status);
  return all;
}

export function updatePaymentRequest(
  id: string,
  patch: Partial<PaymentRequest>
): PaymentRequest | undefined {
  const req = paymentRequests.get(id);
  if (!req) return undefined;
  Object.assign(req, patch, { updated_at: new Date().toISOString() });
  paymentRequests.set(id, req);
  return req;
}

export function clearPaymentRequests(): void {
  paymentRequests.clear();
}
