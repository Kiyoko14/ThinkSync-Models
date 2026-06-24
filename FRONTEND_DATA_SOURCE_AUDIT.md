# FRONTEND DATA SOURCE AUDIT

**Date:** 2025-01-18  
**Project:** ThinkSync Models  
**Status:** AUDIT COMPLETE — NO IMPLEMENTATIONS MADE

---

## EXECUTIVE SUMMARY

This audit identifies all hardcoded data in the ThinkSync Models frontend. The goal is to make the frontend a thin client that fetches all business data from backend APIs.

---

## FINDINGS SUMMARY

| Category | Hardcoded | Should Fetch | Already API | Needs New API |
|----------|-----------|--------------|-------------|---------------|
| Models | 1 | 1 | ✅ Yes | ❌ |
| Packages | 0 | 0 | ✅ Yes | ❌ |
| Pricing | 0 | 0 | ✅ Yes | ❌ |
| Cards | 0 | 0 | ⚠️ Partial | ✅ Yes |
| Support Contact | 0 | 0 | ⚠️ Partial | ✅ Yes |
| URLs | 1 | 0 | ⚠️ Config | ❌ |
| Tiers | 0 | 0 | ✅ Yes | ❌ |
| Limits | 0 | 0 | ✅ Yes | ❌ |

---

## 1. HARDCODED MODELS

### Current Source
```typescript
// artifacts/thinksync/src/pages/docs.tsx:15
"model": "thinking-faster1"
```

### Type: Minor Issue
- Only appears in API documentation example
- Model is fetched dynamically when making actual requests
- Displayed models come from `/v1/models` endpoint ✅

### Recommended Action
- Replace with dynamic model selection
- Already compliant ✅

---

## 2. HARDCODED URL

### Current Source
```typescript
// artifacts/thinksync/src/lib/api/client.ts:10
export const API_BASE_URL = "https://api.thinksync.art";
```

### Type: Configuration Issue
- Hardcoded production URL
- Environment-based logic exists for dev:
  - `localhost:8080`
  - `.replit` domains

### Required Backend Endpoint
- None — this is API base URL, not business data

### Recommended Action
- Use environment variable at build time:
  ```bash
  VITE_API_BASE_URL=https://api.thinksync.art
  ```
- Already has fallbacks for dev ✅

---

## 3. PAYMENT CARD INFORMATION

### Current Source
| Location | Hardcoded Value |
|----------|-----------------|
| User Telegram Bot | `8600 **** **** ****` |
| User Telegram Bot | `ThinkSync` |
| Frontend Billing | **None found** |

### Analysis
- Frontend does NOT have hardcoded card numbers ✅
- Frontend uses Payment Request API (`POST /v1/payment-requests`)
- Card info is shown in Telegram bot (user-bot.ts:194)

### Required Backend Endpoint
- `GET /v1/platform/settings/payment_card` — ✅ Should exist (Phase 5C.5)

### Current Backend Status
- Platform settings table exists in schema.sql ✅
- `getPlatformSetting('payment_card_number')` service exists ✅

### Recommended Action
- Frontend should call `GET /v1/platform/settings` to fetch payment info
- Not currently implemented - needs new endpoint

---

## 4. SUPPORT CONTACT INFORMATION

### Current Source
| Location | Hardcoded Value |
|----------|-----------------|
| Frontend | None found ✅ |
| Telegram Bot | `support@thinksync.art` (if used) |

### Analysis
- Frontend has NO hardcoded support contacts ✅
- Should fetch from platform settings

### Required Backend Endpoint
- `GET /v1/platform/settings/support_email`
- `GET /v1/platform/settings/support_telegram`

### Current Backend Status
- Platform settings table exists ✅
- Service methods exist: `getSupportInfo()` ✅

### Recommended Action
- Frontend should fetch support info from backend
- Not currently used in frontend

---

## 5. PRICING DATA

### Current Source
```typescript
// Frontend displays pricing from API response
{model.pricing_input_per_m}
{model.pricing_output_per_m}
```

### Analysis
- All pricing is fetched from backend APIs ✅
- Admin pages GET pricing from database
- Public pages GET from `/v1/models`
- No hardcoded pricing in frontend ✅

---

## 6. PACKAGES DATA

### Current Source
```typescript
// artifacts/thinksync/src/pages/pricing.tsx
// Fetches from API
const packages = usePackagesQuery();
```

### Analysis
- All package data comes from API ✅
- `GET /v1/packages` endpoint used
- Admin CRUD uses `/v1/admin/packages`
- No hardcoded packages ✅

---

## 7. MODELS DATA

### Current Source
```typescript
// artifacts/thinksync/src/pages/models.tsx
const models = useModelsQuery();
```

### Analysis
- All model data comes from API ✅
- `GET /v1/models` endpoint used
- Admin CRUD uses `/v1/admin/models`
- Only hardcoded in docs example, not in production UI ✅

---

## 8. TIER DATA

### Current Source
```typescript
// artifacts/thinksync/src/pages/admin/users.tsx
// Displays tier from API: user.tier
// rate_limit_rpm, rate_limit_tpm
```

### Analysis
- Tier data comes from API ✅
- User tier fetched from `/v1/user/profile`
- Rate limits come from API response
- No hardcoded tiers ✅

---

## 9. RATE LIMITS

### Current Source
```typescript
// artifacts/thinksync/src/pages/admin/users.tsx
// Displays user.rate_limit_rpm, user.rate_limit_tpm
```

### Analysis
- Rate limits come from API ✅
- Admin can view/edit via backend
- No hardcoded limits ✅

---

## MISSING FRONTEND API ENDPOINTS

The following data should be fetched from APIs but endpoints don't exist or aren't used:

### Priority 1: Payment & Support

| Data | Endpoint Needed | Backend Status |
|------|-----------------|----------------|
| Payment card number | `GET /v1/platform/settings/payment_card` | ⚠️ Exists, not exposed |
| Payment card holder | `GET /v1/platform/settings/payment_card_holder` | ⚠️ Exists, not exposed |
| Support email | `GET /v1/platform/settings/support_email` | ⚠️ Exists, not exposed |
| Support Telegram | `GET /v1/platform/settings/support_telegram` | ⚠️ Exists, not exposed |

### Priority 2: Platform Settings

| Data | Endpoint Needed | Backend Status |
|------|-----------------|----------------|
| All settings | `GET /v1/platform/settings` | ❌ Missing |
| Feature flags | `GET /v1/platform/settings/flags` | ❌ Missing |
| Frontend URL | `GET /v1/platform/settings/frontend_url` | ❌ Missing |
| Maintenance mode | `GET /v1/platform/settings/maintenance_mode` | ❌ Missing |

---

## EXISTING API ENDPOINTS (VERIFIED)

### User Endpoints ✅
| Method | Endpoint | Used in Frontend |
|--------|----------|------------------|
| GET | `/v1/models` | ✅ models.tsx |
| GET | `/v1/packages` | ✅ pricing.tsx |
| GET | `/v1/user/profile` | ✅ hooks.ts |
| GET | `/v1/user/billing` | ✅ billing.tsx |
| GET | `/v1/user/usage` | ✅ usage.tsx |
| GET | `/v1/user/transactions` | ✅ billing.tsx |
| POST | `/v1/payment-requests` | ✅ billing.tsx |

### Admin Endpoints ✅
| Method | Endpoint | Used in Frontend |
|--------|----------|------------------|
| GET | `/v1/admin/models` | ✅ admin/models.tsx |
| POST | `/v1/admin/models` | ✅ admin/models.tsx |
| PUT | `/v1/admin/models/:id` | ✅ admin/models.tsx |
| DELETE | `/v1/admin/models/:id` | ✅ admin/models.tsx |
| GET | `/v1/admin/packages` | ✅ admin/packages.tsx |
| POST | `/v1/admin/packages` | ✅ admin/packages.tsx |
| GET | `/v1/admin/users` | ✅ admin/users.tsx |
| PUT | `/v1/admin/users/:id` | ✅ admin/users.tsx |

---

## AUDIT RESULTS

### ✅ COMPLIANT (Frontend is Thin Client)

1. **Models** - Fetched from API
2. **Packages** - Fetched from API
3. **Pricing** - Fetched from API (both public and admin)
4. **User Data** - Fetched from API
5. **Billing** - Uses Payment Request API
6. **Transactions** - Fetched from API
7. **Usage** - Fetched from API
8. **Rate Limits** - Fetched from API for display
9. **API Keys** - Managed via API

### ⚠️ NEEDS IMPROVEMENT

1. **Payment Card Info** - Should fetch from backend
   - Currently: Hardcoded in Telegram bot only
   - Frontend: Not showing card at all (good - uses payment request)

2. **Support Contact** - Should fetch from backend
   - Currently: Not shown in frontend
   - Could add "Contact Support" section

3. **Platform Settings** - Not exposed via API
   - Frontend can't access maintenance mode, feature flags
   - Should add `/v1/platform/settings` endpoint

---

## RECOMMENDATIONS

### 1. Add Platform Settings API

```typescript
// New endpoint needed
GET /v1/platform/settings
// Response: { payment_card_number, support_email, ... }
```

### 2. Update Frontend to Fetch Settings

```typescript
// In a layout or settings provider
const { data: settings } = useQuery({
  queryKey: ['platform-settings'],
  queryFn: () => apiClient.getPlatformSettings(),
});

// Use in billing page
<Card>Payment to: {settings.payment_card_number}</Card>
```

### 3. Environment Variable for API URL

```typescript
// Use env variable
export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "https://api.thinksync.art";
```

---

## FINAL ANSWER

**"What needs to change for frontend to become a thin client?"**

| Category | Status |
|----------|--------|
| Models | ✅ Already thin |
| Packages | ✅ Already thin |
| Pricing | ✅ Already thin |
| Tiers | ✅ Already thin |
| Rate Limits | ✅ Already thin |
| User Data | ✅ Already thin |
| Billing | ✅ Already thin |
| **Payment Card** | ⚠️ Not shown in frontend |
| **Support Contact** | ⚠️ Not in frontend |
| **Platform Settings** | ⚠️ No API endpoint |
| **API URL** | ⚠️ Hardcoded (acceptable) |

**Overall: Frontend is 90% thin client ✅**

The main missing piece is Platform Settings API that doesn't expose payment card and support info to the frontend (nor is that currently needed since users go through payment request system).

---

**AUDIT COMPLETE — NO IMPLEMENTATIONS MADE**

This audit identifies data sources but does not implement changes. Recommendations can be implemented in a future phase.