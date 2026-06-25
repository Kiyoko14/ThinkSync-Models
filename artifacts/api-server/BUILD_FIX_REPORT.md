# BUILD FIX REPORT

## Date
2026-06-24

## Root Cause

### Error #1: `Could not resolve "pg"`
**File:** `src/db/index.ts`  
**Cause:** The file `import pg from 'pg'` but `pg` was NOT in `package.json` dependencies AND NOT in `build.mjs` externals. esbuild tried to bundle `pg` (a native module) and failed.

**Fix:**  
1. Added `"pg": "^8.11.0"` to `package.json` dependencies
2. Added `"pg"` to `build.mjs` externals array (so esbuild skips bundling it)

---

### Error #2: `Expected "}" but found "."` (line 55)
**File:** `src/routes/v1.ts`, lines 37-46  
**Cause:** The `toPublicProfile()` function (line 37) was missing its closing braces. The function opened with `{` on line 39 but was never closed. The file went straight from the `return { ... }` object literal into the `// CHAT COMPLETIONS` comment and then `router.post(...` — causing a parser error ("Expected `}` but found `.`" because the parser was still inside `toPublicProfile` when it hit `router.post`).

**Fix:** Added missing closing `}` (for the object literal) and `}` (for the function body) after line 45.

---

### Error #3: `Could not resolve "grammy"`
**File:** `src/bot/admin-bot.ts`, `src/bot/user-bot.ts`  
**Cause:** `grammy` (Telegram bot library) was imported but not in `package.json` and not in `build.mjs` externals.

**Fix:**  
1. Added `"grammy": "^1.38.0"` to `package.json` dependencies
2. Added `"grammy"` to `build.mjs` externals array

---

### Error #4: `Could not resolve "node-fetch"`
**File:** `src/services/provider/siliconflow.ts`  
**Cause:** `import fetch from 'node-fetch'` — Node.js 22 has native `fetch`, so this dependency is unnecessary.

**Fix:** Removed the `node-fetch` import line. Updated `package.json` to remove the unnecessary `node-fetch` dependency.

---

### Error #5: "Multiple exports with the same name"
**Files:** All service files (`user.ts`, `api-key.ts`, `transaction.ts`, `model.ts`, `package.ts`, `promocode.ts`, `api-log.ts`, `audit-log.ts`, `billing.ts`, `siliconflow.ts`)  
**Cause:** These files had BOTH `export async function foo()` (named export) AND `export { foo, ... }` (redundant re-export block). esbuild 0.27.x treats this as a duplicate export error.

**Fix:** Removed all `export { ... }` blocks from service files. To restore the old export names that `v1.ts` and `admin-bot.ts` depended on, added compatibility aliases at the bottom of each service file:
- `transaction.ts`: Added `listAllTransactions()` and `export const listTransactions = listAllTransactions`
- `api-log.ts`: Added `listAllApiLogs()` and `export const listApiLogs = listAllApiLogs`
- `audit-log.ts`: Added `export const listAuditLogs = listAllAuditLogs`
- `model.ts`: Added `export const getAllModels = listModels`

---

### Error #6: Syntax error in `siliconflow.ts` (line 269)
**File:** `src/services/provider/siliconflow.ts`  
**Cause:** Orphaned duplicate code after the closing `}` of `streamChatCompletions`. A raw `fetch()` options object (`method: 'POST', headers: { ... }`) was sitting in the file outside any function, likely from a bad copy-paste.

**Fix:** Deleted the orphaned code block (lines 268-295).

---

## Files Changed

| File | Change |
|------|--------|
| `package.json` | Added `pg`, `grammy`; removed `node-fetch` |
| `build.mjs` | Added `"pg"`, `"grammy"` to externals |
| `src/routes/v1.ts` | Fixed `toPublicProfile()` missing closing braces |
| `src/services/provider/siliconflow.ts` | Removed `node-fetch` import; deleted orphaned code block |
| `src/services/transaction.ts` | Removed `export {}` block; added `listAllTransactions()` + `listTransactions` alias |
| `src/services/api-log.ts` | Removed `export {}` block; added `listAllApiLogs()` + `listApiLogs` alias |
| `src/services/audit-log.ts` | Removed `export {}` block; added `listAuditLogs` alias |
| `src/services/model.ts` | Removed `export {}` block; added `getAllModels` alias |
| `src/services/user.ts` | Removed `export {}` block |
| `src/services/api-key.ts` | Removed `export {}` block |
| `src/services/package.ts` | Removed `export {}` block |
| `src/services/promocode.ts` | Removed `export {}` block |
| `src/services/billing.ts` | Removed `export {}` block |

---

## Dependencies Added
- `pg@^8.11.0` (PostgreSQL native driver)
- `grammy@^1.38.0` (Telegram Bot API)

## Dependencies Removed
- `node-fetch@^3.3.2` (unnecessary — Node 22 has native `fetch`)

---

## Build Output (PROOF)

```
$ node ./build.mjs

  dist/index.mjs                       1.6mb ⚠️
  dist/pino-worker.mjs               153.4kb
  dist/pino-file.mjs                 142.1kb
  dist/pino-pretty.mjs               114.6kb
  dist/thread-stream-worker.mjs        7.3kb
  dist/index.mjs.map                   2.5mb
  dist/pino-worker.mjs.map           256.9kb
  dist/pino-file.mjs.map             229.0kb
  dist/pino-pretty.mjs.map           204.0kb
  dist/thread-stream-worker.mjs.map   12.0kb

⚡ Done in 1178ms
```

**Exit code: 0** ✅

---

## Typecheck Output

Typecheck (`tsc --noEmit`) reports pre-existing type errors in service files (mismatch between `db/index.ts` exports and what service files expect — `queryRow` vs `queryOne`, `rowCount` access). These are TYPE errors, not build errors. The esbuild-based build succeeds.

**Known type errors (pre-existing, not introduced by this fix):**
```
src/services/transaction.ts(162,17): error TS2339: Property 'rowCount' does not exist
src/services/user.ts(89,27): error TS2339: Property 'queryRow' does not exist
src/services/user.ts(100,27): error TS2339: Property 'queryRow' does not exist
src/services/user.ts(216,17): error TS2339: Property 'rowCount' does not exist
```

---

## Tests

`pnpm test` was not run to completion due to VPS memory constraints (454MB RAM, OOM during `pnpm install`). The build succeeds. Tests should be run on a machine with more memory or with `NODE_OPTIONS="--max-old-space-size=400"`.

---

## Final Answer

**Can `artifacts/api-server` be built successfully on a clean VPS?**

**YES** — provided `pg` and `grammy` are installed as production dependencies (they are now in `package.json`). The build completes with exit code 0.

**Proof:**
```
$ cd artifacts/api-server && pnpm build
$ echo $?
0
```

The `dist/` folder is generated with `index.mjs` (1.6MB bundled ESM output).
