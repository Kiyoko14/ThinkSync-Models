-- Migration: Add missing columns to api_logs table
-- 
-- The createApiLog() INSERT (api-log.ts line 57-61) references these column names:
--   input_tokens, output_tokens, auth_method
-- But schema.sql was created with prompt_tokens, completion_tokens and no auth_method.
--
-- The getApiUsageStats() SELECT (api-log.ts line 173-177) references:
--   estimated_cost, duration_ms
--
-- Callers in v1.ts also pass:
--   request_model, stream_enabled, duration_ms
--
-- These columns are referenced by the code but missing from the schema.

-- Columns referenced by INSERT in createApiLog()
ALTER TABLE api_logs ADD COLUMN IF NOT EXISTS input_tokens INTEGER DEFAULT 0;
ALTER TABLE api_logs ADD COLUMN IF NOT EXISTS output_tokens INTEGER DEFAULT 0;

-- Columns referenced by SELECT in getApiUsageStats()
ALTER TABLE api_logs ADD COLUMN IF NOT EXISTS duration_ms INTEGER DEFAULT 0;
ALTER TABLE api_logs ADD COLUMN IF NOT EXISTS estimated_cost INTEGER DEFAULT 0;

-- Columns passed by callers (v1.ts) to createApiLog()
ALTER TABLE api_logs ADD COLUMN IF NOT EXISTS request_model VARCHAR(100);
ALTER TABLE api_logs ADD COLUMN IF NOT EXISTS stream_enabled BOOLEAN DEFAULT false;

-- Add index for common query patterns
CREATE INDEX IF NOT EXISTS idx_api_logs_created_at ON api_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_api_logs_profile_id ON api_logs(profile_id);
CREATE INDEX IF NOT EXISTS idx_api_logs_model_slug ON api_logs(model_slug);