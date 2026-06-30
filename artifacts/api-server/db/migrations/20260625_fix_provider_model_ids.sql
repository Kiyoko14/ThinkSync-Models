-- Migration: Restore correct provider_model_id values
-- Date: 2026-06-25
-- Task: Recover original intended mapping from repository history

-- Evidence:
-- 1. BACKEND_STATE_AUDIT.md (commit 53ae92d) says:
--    thinking-faster1 → deepseek-ai/DeepSeek-V3
--    thinking-faster2.3 → deepseek-ai/DeepSeek-V3  (NOTE: same as thinking-faster1 - likely a typo)
--    thinking-f3 → Qwen/Qwen3-32B

-- 2. SiliconFlow API returns (user-provided evidence):
--    deepseek-ai/DeepSeek-V3
--    deepseek-ai/DeepSeek-R1
--    Qwen/Qwen3-32B
--    Qwen/Qwen2.5-72B-Instruct
--    Qwen/Qwen2.5-7B-Instruct

-- Correct mapping (based on evidence):
UPDATE models SET provider_model_id = 'deepseek-ai/DeepSeek-V3' WHERE slug = 'thinking-faster1';
UPDATE models SET provider_model_id = 'deepseek-ai/DeepSeek-R1' WHERE slug = 'thinking-faster2.3';
UPDATE models SET provider_model_id = 'Qwen/Qwen3-32B' WHERE slug = 'thinking-f3';
-- philosophy-gen, philosophy-gen-2, philosophy-gen-2.5 already correct

-- Insert migration record
INSERT INTO schema_migrations (version) VALUES ('20260625_fix_provider_model_ids')
ON CONFLICT (version) DO NOTHING;