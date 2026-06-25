# PHASE 3: ADMIN BOT CONTROL PLANE — AUDIT REPORT

**Date:** 2026-06-25  
**Commit:** de3eda9 (baseline)  
**Status:** PARTIALLY COMPLETE

---

## ✅ WORKING (Proof exists)

| Feature | Evidence | Verification Method |
|---|---|---|
| Models List | `GET /api/v1/models` → 200 OK | HTTP test |
| Model Enable/Disable | `model_enable_${slug}` → DB updated | SQL verification |
| Model Pricing | `model_pricing_${slug}` → updates `pricing_input_per_m` | SQL verification |
| User Ban/Unban | `user_ban_${id}` → `is_active=false` | Service function exists |
| Payments List | `listPaymentRequests()` → returns data | Service function exists |
| Stats | `/stats` → DB query successful | HTTP test |

---

## ❌ BROKEN (Buttons exist but NO handler)

| Button | Callback | Handler Exists? | Impact |
|---|---|---|---|
| ✏️ Edit (Model) | `model_edit_${slug}` | ❌ **NO** | Cannot edit model fields |
| ✏️ Edit (Settings) | `settings_edit` | ❌ **NO** | Cannot update platform settings |
| ✏️ Edit (Promocode) | `promocode_edit_${id}` | ❌ **NO** | Cannot edit promocodes |

---

## 🔧 ROOT CAUSES

### 1. Model Edit Handler Missing
**File:** `src/bot/admin-bot.ts`  
**Line:** 318 (button rendered)  
**Issue:** `model_edit_${slug}` callback has NO handler  
**Fix:** Implement `bot.callbackQuery(/model_edit_(.+)/, ...)` handler  

### 2. Settings Edit Handler Missing
**File:** `src/bot/admin-bot.ts`  
**Line:** 822 (button rendered)  
**Issue:** `settings_edit` callback has NO handler  
**Fix:** Implement settings edit conversation flow  

### 3. Promocode Edit Handler Missing
**File:** `src/bot/admin-bot.ts`  
**Issue:** `promocode_edit_${id}` callback has NO handler  
**Fix:** Implement promocode edit handler  

---

## 📊 ADMIN ACTION TRACE (Partial)

| Action | Bot Handler | Service | DB Table | API Endpoint | Frontend |
|---|---|---|---|---|---|
| Models List | `models_list` | `getAllModels()` | `models` | `GET /v1/models` | `dashboard/models` |
| Model Enable | `model_enable_${slug}` | `updateModel()` | `models` | `PATCH /v1/admin/models/:id` | N/A |
| Model Disable | `model_disable_${slug}` | `updateModel()` | `models` | `PATCH /v1/admin/models/:id` | N/A |
| Model Edit | **❌ MISSING** | `updateModel()` | `models` | `PATCH /v1/admin/models/:id` | N/A |
| User Ban | `user_ban_${id}` | `banUser()` | `users` | N/A | N/A |
| Settings View | `settings_list` | `getAllSettings()` | `platform_settings` | `GET /v1/platform/settings/public` | `footer` |
| Settings Edit | **❌ MISSING** | `updateSetting()` | `platform_settings` | `PATCH /v1/admin/settings` | N/A |

---

## 🧪 VERIFICATION TEST RESULTS

### Test 1: Model Management
**Script:** `scripts/verify-model-mgmt.mjs`  
**Result:** ✅ **PASSED**
- DB update successful
- API returns updated value
- Changes propagate correctly

### Test 2: Platform Settings
**Script:** N/A (handler missing)  
**Result:** ❌ **FAILED** (cannot test — no edit UI)

---

## 🔨 FIXES APPLIED (Commit de3eda9)

1. ✅ Fixed `provider_name` → `provider` column name mismatch
2. ✅ Added `logo_url` column to `models` table
3. ✅ Fixed `createModel()` to use correct DB column names
4. ✅ Fixed `updateModel()` `allowedFields` (added `logo_url`, `is_visible`, `tier_access`, `minimum_tier_id`)
5. ✅ Fixed pricing for `philosophy-gen*` models (was 100x too high)

---

## 📋 REMAINING FIXES NEEDED

| Fix | Priority | Estimated Effort |
|---|---|---|
| Implement `model_edit` handler | HIGH | 2h |
| Implement `settings_edit` handler | HIGH | 1h |
| Implement `promocode_edit` handler | MEDIUM | 1h |
| Add `bot.hears()` guard (only intercept edit sessions) | HIGH | 30min |
| Verify user bot sees model updates (no restart) | HIGH | 1h |

---

## 🚀 NEXT STEPS

1. **Implement missing edit handlers** (model, settings, promocode)
2. **Test each handler** with real DB verification
3. **Verify frontend reflects changes** (no page refresh needed)
4. **Proceed to Phase 4** (User Bot fix)

---

**Audit conducted by:** AI Agent (Hermes)  
**Verified with:** SQL queries, API tests, service function inspection  
**Proof artifacts:** `scripts/verify-model-mgmt.mjs`, `scripts/audit-db.mjs`
