# Phase 5A: Balance-Based Billing

## Summary
Implemented production-grade balance-based billing system. The system removes reliance on token packages and instead charges users directly from their balance after each request. Added payment request flow where users can request top-ups and admins approve/reject them.

## Changes

### Backend (artifacts/api-server)

#### New Services
- `src/services/payment-request.ts` — In-memory payment request store with fields:
  - id, user_id, amount, currency, screenshot_url, status, admin_id, admin_email, admin_note, created_at, updated_at
  - Functions: createPaymentRequest, getPaymentRequestById, listPaymentRequests, updatePaymentRequest, clearPaymentRequests
- `src/services/billing.ts` — Core billing logic:
  - calculateCost(model_id, input_tokens, output_tokens) — cost in cents
  - chargeUser(user_id, model_id, input_tokens, output_tokens) — deduct balance, create transaction + API log
  - getUserBalance(user_id)

#### New API Endpoints
- `POST /v1/billing/charge` — Charge user for API usage (auth required)
- `POST /v1/billing/calculate` — Public cost calculator
- `GET /v1/user/billing` — Billing summary (balance, total_spent, total_requests, total_tokens, total_cost_usd)
- `POST /v1/user/payment-requests` — Create payment request
- `GET /v1/user/payment-requests` — List user's payment requests
- `GET /v1/admin/payment-requests` — List all payment requests (admin, with status filter)
- `POST /v1/admin/payment-requests/:id/approve` — Approve and add balance
- `POST /v1/admin/payment-requests/:id/reject` — Reject

#### Updated Files
- `src/routes/v1.ts` — Added billing + payment request endpoints (~100 new lines)
- `src/lib/test-utils.ts` — Added clearPaymentRequests and clearApiLogs to cleanup

#### Insufficient Balance Protection
- `POST /v1/billing/charge` returns HTTP 402 with code `insufficient_balance`, cost, and current balance

### Frontend (artifacts/thinksync)

#### New Types
- `BillingResponse` — balance, total_spent, total_requests, total_tokens, total_cost_usd
- `PaymentRequestItem` — full payment request shape

#### New API Client Methods
- getBilling, getPaymentRequests, createPaymentRequest, listAdminPaymentRequests, approvePaymentRequest, rejectPaymentRequest

#### New React Query Hooks
- useBillingQuery, usePaymentRequestsQuery, useCreatePaymentRequestMutation, useAdminPaymentRequestsQuery, useApprovePaymentRequestMutation, useRejectPaymentRequestMutation

#### New Pages
- `src/pages/admin/payment-requests.tsx` — Admin payment request management with status filters, approve/reject actions
- Updated `src/pages/dashboard/billing.tsx` — New balance display, payment request form, payment request history, transactions

#### Updated
- `src/components/layout/admin-shell.tsx` — Added "Payment Requests" nav item
- `src/App.tsx` — Added `/admin/payment-requests` route
- `src/pages/dashboard/overview.tsx` — Shows balance in dollars instead of tokens

## Testing
- 45 API tests passing (31 existing + 14 new)
- New tests cover:
  - Cost calculation
  - Balance charging with model pricing
  - Insufficient balance (HTTP 402)
  - Billing summary endpoint
  - Payment request creation, listing, approval, rejection
  - Admin access control
  - Duplicate processing protection

## Cost Model
Cost is calculated as:
```
cost_cents = ((input_tokens / 1_000_000) * pricing_input_per_m + (output_tokens / 1_000_000) * pricing_output_per_m) * 100
```

Example: GPT-4o with 1M input tokens = 250 cents ($2.50)
Example: GPT-4o-mini with 1M input tokens = 15 cents ($0.15)

## Balance Flow
1. User has balance in cents
2. After API request, system calculates cost
3. If balance >= cost, deduct and create transaction
4. If balance < cost, return 402 insufficient_balance
5. User submits payment request with amount/currency/screenshot
6. Admin reviews and approves (adds balance) or rejects
7. Transaction history tracks all usage and adjustments

## Currency Support
- USD is default for en/ru
- UZS can be used for uz locale
- Payment requests store currency but balance is always tracked in cents (USD-based)
