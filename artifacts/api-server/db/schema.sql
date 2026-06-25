-- ThinkSync Models Database Schema
-- Phase 5A: PostgreSQL/Supabase Migration
-- Run this script in your Supabase SQL Editor

-- =============================================================================
-- TIERS TABLE (Phase 5C: Tier & Access Control)
-- =============================================================================
CREATE TABLE IF NOT EXISTS tiers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(50) UNIQUE NOT NULL,
    display_name VARCHAR(100) NOT NULL,
    description TEXT,
    priority INTEGER DEFAULT 0,
    -- Rate limits
    rpm_limit INTEGER DEFAULT 60,
    tpm_limit INTEGER DEFAULT 60000,
    monthly_request_limit INTEGER DEFAULT 1000,
    monthly_token_limit INTEGER DEFAULT 1000000,
    -- API Keys
    max_api_keys INTEGER DEFAULT 1,
    -- Requirements
    minimum_lifetime_spend_usd INTEGER DEFAULT 0,
    -- Status
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Insert default tiers
INSERT INTO tiers (name, display_name, description, priority, rpm_limit, tpm_limit, monthly_request_limit, monthly_token_limit, max_api_keys, minimum_lifetime_spend_usd) VALUES
    ('free', 'Free', 'Free tier - basic access', 0, 60, 60000, 100, 100000, 1, 0),
    ('starter', 'Starter', 'Starter tier - for beginners', 1, 120, 120000, 1000, 1000000, 3, 10),
    ('pro', 'Pro', 'Professional tier - for power users', 2, 500, 500000, 10000, 10000000, 10, 100),
    ('enterprise', 'Enterprise', 'Enterprise tier - unlimited access', 3, 1000, 1000000, 100000, 100000000, NULL, 1000)
ON CONFLICT (name) DO NOTHING;

CREATE INDEX IF NOT EXISTS idx_tiers_priority ON tiers(priority);
CREATE INDEX IF NOT EXISTS idx_tiers_is_active ON tiers(is_active);

-- =============================================================================
-- USERS TABLE
-- =============================================================================
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    display_name VARCHAR(255),
    plan_tier VARCHAR(50) DEFAULT 'free',
    role VARCHAR(50) DEFAULT 'user',
    is_active BOOLEAN DEFAULT true,
    balance INTEGER DEFAULT 0,
    total_spent INTEGER DEFAULT 0,
    rate_limit_rpm INTEGER DEFAULT 60,
    rate_limit_tpm INTEGER DEFAULT 60000,
    -- Tier system fields
    tier_id UUID REFERENCES tiers(id),
    tier_mode VARCHAR(20) DEFAULT 'auto',
    lifetime_spend_usd INTEGER DEFAULT 0,
    monthly_requests_used INTEGER DEFAULT 0,
    monthly_tokens_used INTEGER DEFAULT 0,
    month_reset_at TIMESTAMP DEFAULT NOW(),
    -- Legacy field (keep for compatibility)
    tier_access VARCHAR(50) DEFAULT 'free',
    -- Welcome bonus
    welcome_bonus_claimed BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);

-- =============================================================================
-- API KEYS TABLE
-- =============================================================================
CREATE TABLE IF NOT EXISTS api_keys (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    profile_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    key_prefix VARCHAR(20) NOT NULL,
    key_hash VARCHAR(255) NOT NULL,
    name VARCHAR(255) DEFAULT 'API Key',
    status VARCHAR(50) DEFAULT 'active',
    created_at TIMESTAMP DEFAULT NOW(),
    last_used_at TIMESTAMP,
    expires_at TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_api_keys_profile_id ON api_keys(profile_id);
CREATE INDEX IF NOT EXISTS idx_api_keys_key_hash ON api_keys(key_hash);

-- =============================================================================
-- MODELS TABLE
-- =============================================================================
CREATE TABLE IF NOT EXISTS models (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    slug VARCHAR(100) UNIQUE NOT NULL,
    provider_model_id VARCHAR(255) NOT NULL,
    provider VARCHAR(100) DEFAULT 'siliconflow',
    display_name VARCHAR(255) NOT NULL,
    description TEXT,
    pricing_input_per_m INTEGER DEFAULT 2500,
    pricing_output_per_m INTEGER DEFAULT 10000,
    supports_streaming BOOLEAN DEFAULT true,
    supports_functions BOOLEAN DEFAULT false,
    is_active BOOLEAN DEFAULT true,
    is_visible BOOLEAN DEFAULT true,
    tier_access VARCHAR(50) DEFAULT 'free',
    minimum_tier_id UUID REFERENCES tiers(id),
    context_window INTEGER DEFAULT 4096,
    max_output_tokens INTEGER DEFAULT 4096,
    rate_limit_rpm INTEGER DEFAULT 1000,
    rate_limit_tpm INTEGER DEFAULT 100000,
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_models_slug ON models(slug);
CREATE INDEX IF NOT EXISTS idx_models_provider_model_id ON models(provider_model_id);

-- =============================================================================
-- PACKAGES TABLE
-- =============================================================================
CREATE TABLE IF NOT EXISTS packages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    token_amount INTEGER NOT NULL,
    bonus_tokens INTEGER DEFAULT 0,
    price_usd_cents INTEGER NOT NULL,
    display_price VARCHAR(50),
    is_featured BOOLEAN DEFAULT false,
    sort_order INTEGER DEFAULT 0,
    status VARCHAR(50) DEFAULT 'active',
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_packages_status ON packages(status);

-- =============================================================================
-- TRANSACTIONS TABLE
-- =============================================================================
CREATE TABLE IF NOT EXISTS transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    profile_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    amount INTEGER NOT NULL,
    balance_after INTEGER NOT NULL,
    transaction_type VARCHAR(50) NOT NULL,
    status VARCHAR(50) DEFAULT 'pending',
    description TEXT,
    reference_type VARCHAR(50),
    reference_id UUID,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_transactions_profile_id ON transactions(profile_id);
CREATE INDEX IF NOT EXISTS idx_transactions_type ON transactions(transaction_type);
CREATE INDEX IF NOT EXISTS idx_transactions_status ON transactions(status);

-- =============================================================================
-- API LOGS TABLE (Usage Tracking)
-- =============================================================================
CREATE TABLE IF NOT EXISTS api_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    profile_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    api_key_id UUID REFERENCES api_keys(id) ON DELETE SET NULL,
    model_id UUID REFERENCES models(id) ON DELETE SET NULL,
    model_slug VARCHAR(100),
    prompt_tokens INTEGER DEFAULT 0,
    completion_tokens INTEGER DEFAULT 0,
    total_tokens INTEGER DEFAULT 0,
    input_cost INTEGER DEFAULT 0,
    output_cost INTEGER DEFAULT 0,
    total_cost INTEGER DEFAULT 0,
    status VARCHAR(50) DEFAULT 'success',
    error_message TEXT,
    ip_address VARCHAR(45),
    user_agent TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_api_logs_profile_id ON api_logs(profile_id);
CREATE INDEX IF NOT EXISTS idx_api_logs_model_slug ON api_logs(model_slug);
CREATE INDEX IF NOT EXISTS idx_api_logs_created_at ON api_logs(created_at);

-- =============================================================================
-- AUDIT LOGS TABLE
-- =============================================================================
CREATE TABLE IF NOT EXISTS audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    admin_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    admin_email VARCHAR(255) NOT NULL,
    action VARCHAR(100) NOT NULL,
    target_type VARCHAR(50),
    target_id UUID,
    details TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_admin_id ON audit_logs(admin_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action);

-- =============================================================================
-- ADMINS TABLE (Telegram + Frontend unified admin system)
-- =============================================================================
CREATE TABLE IF NOT EXISTS admins (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    telegram_id BIGINT UNIQUE,
    email VARCHAR(255) UNIQUE,
    role VARCHAR(50) NOT NULL DEFAULT 'moderator',
    permissions JSONB DEFAULT '{}',
    is_active BOOLEAN DEFAULT true,
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_admins_telegram_id ON admins(telegram_id);
CREATE INDEX IF NOT EXISTS idx_admins_email ON admins(email);
CREATE INDEX IF NOT EXISTS idx_admins_role ON admins(role);

-- =============================================================================
-- TELEGRAM USER ACCOUNTS (for User Bot linking)
-- =============================================================================
CREATE TABLE IF NOT EXISTS telegram_accounts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    telegram_id BIGINT UNIQUE NOT NULL,
    telegram_username VARCHAR(255),
    linking_code VARCHAR(32) UNIQUE,
    linking_code_expires_at TIMESTAMP,
    linked_at TIMESTAMP DEFAULT NOW(),
    last_seen_at TIMESTAMP DEFAULT NOW(),
    is_active BOOLEAN DEFAULT true
);

CREATE INDEX IF NOT EXISTS idx_telegram_accounts_user_id ON telegram_accounts(user_id);
CREATE INDEX IF NOT EXISTS idx_telegram_accounts_telegram_id ON telegram_accounts(telegram_id);
CREATE INDEX IF NOT EXISTS idx_telegram_accounts_linking_code ON telegram_accounts(linking_code);

-- =============================================================================
-- PAYMENT REQUESTS TABLE
-- =============================================================================
CREATE TABLE IF NOT EXISTS payment_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    amount INTEGER NOT NULL,
    currency VARCHAR(10) DEFAULT 'USD',
    source VARCHAR(20) DEFAULT 'frontend',
    screenshot_url TEXT,
    screenshot_deleted BOOLEAN DEFAULT false,
    screenshot_deleted_at TIMESTAMP,
    screenshot_uploaded_at TIMESTAMP DEFAULT NOW(),
    rejection_reason TEXT,
    status VARCHAR(50) DEFAULT 'pending',
    reviewed_by UUID REFERENCES users(id),
    reviewed_at TIMESTAMP,
    admin_note TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_payment_requests_user_id ON payment_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_payment_requests_status ON payment_requests(status);
CREATE INDEX IF NOT EXISTS idx_payment_requests_source ON payment_requests(source);

-- =============================================================================
-- NOTIFICATIONS TABLE
-- =============================================================================
CREATE TABLE IF NOT EXISTS notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    type VARCHAR(50) NOT NULL,
    title VARCHAR(255) NOT NULL,
    message TEXT,
    is_read BOOLEAN DEFAULT false,
    data JSONB,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_type ON notifications(type);
CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON notifications(is_read);

-- =============================================================================
-- PLATFORM SETTINGS TABLE (Phase 5C.5)
-- =============================================================================
CREATE TABLE IF NOT EXISTS platform_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    key VARCHAR(100) UNIQUE NOT NULL,
    value TEXT,
    description TEXT,
    data_type VARCHAR(20) DEFAULT 'string',
    updated_by UUID REFERENCES users(id),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Insert default settings
INSERT INTO platform_settings (key, value, description, data_type) VALUES
    ('payment_card_number', '8600 1234 5678 9012', 'Payment card number for deposits', 'string'),
    ('payment_card_holder', 'ThinkSync', 'Payment card holder name', 'string'),
    ('payment_card_phone', '+998 90 123 45 67', 'Payment card phone for UMS', 'string'),
    ('support_email', 'support@thinksync.art', 'Support email address', 'string'),
    ('support_telegram', '@thinksync_support', 'Support Telegram username', 'string'),
    ('frontend_url', 'https://models.thinksync.art', 'Frontend website URL', 'string'),
    ('api_url', 'https://api.thinksync.art', 'API base URL', 'string'),
    ('maintenance_mode', 'false', 'Enable maintenance mode', 'boolean'),
    ('registration_enabled', 'true', 'Enable user registration', 'boolean'),
    ('deposits_enabled', 'true', 'Enable deposit functionality', 'boolean'),
    ('user_bot_enabled', 'true', 'Enable user bot', 'boolean'),
    ('admin_bot_enabled', 'true', 'Enable admin bot', 'boolean'),
    ('default_currency', 'UZS', 'Default currency', 'string'),
    ('default_tier', 'free', 'Default tier for new users', 'string'),
    ('welcome_bonus_enabled', 'true', 'Enable welcome bonus for new users', 'boolean'),
    ('welcome_bonus_amount', '1000', 'Welcome bonus token amount', 'number')
ON CONFLICT (key) DO NOTHING;

CREATE INDEX IF NOT EXISTS idx_platform_settings_key ON platform_settings(key);

-- Initial data
-- PROMOCODES TABLE
-- =============================================================================
CREATE TABLE IF NOT EXISTS promocodes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(50) UNIQUE NOT NULL,
    description TEXT,
    discount_type VARCHAR(20) DEFAULT 'percentage',
    discount_value INTEGER NOT NULL,
    max_uses INTEGER,
    used_count INTEGER DEFAULT 0,
    max_uses_per_user INTEGER DEFAULT 1,
    min_package_price_cents INTEGER,
    is_active BOOLEAN DEFAULT true,
    valid_from TIMESTAMP DEFAULT NOW(),
    valid_until TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_promocodes_code ON promocodes(code);

-- =============================================================================
-- SEED INITIAL DATA
-- =============================================================================

-- Insert default packages
INSERT INTO packages (id, name, description, token_amount, bonus_tokens, price_usd_cents, display_price, is_featured, sort_order, status) VALUES
    (gen_random_uuid(), 'Starter', 'Perfect for trying out ThinkSync', 10000, 0, 990, '$9.90', false, 1, 'active'),
    (gen_random_uuid(), 'Basic', 'Great for personal projects', 50000, 5000, 3990, '$39.90', false, 2, 'active'),
    (gen_random_uuid(), 'Pro', 'Best value for developers', 150000, 30000, 9900, '$99.00', true, 3, 'active'),
    (gen_random_uuid(), 'Enterprise', 'Unlimited power', 1000000, 250000, 49900, '$499.00', false, 4, 'active')
ON CONFLICT DO NOTHING;

-- Insert default models (expose only display_name, hide provider_model_id)
INSERT INTO models (slug, provider_model_id, provider, display_name, description, pricing_input_per_m, pricing_output_per_m, is_visible, tier_access) VALUES
    ('thinking-faster1', 'THINKING-LABEL/Claude-Sonnet-4-20250514', 'siliconflow', 'thinking faster1', 'Fast and efficient model', 2500, 10000, true, 'free'),
    ('thinking-faster2.3', 'THINKING-LABEL/Claude-3.5-Sonnet-20241022', 'siliconflow', 'thinking faster2.3', 'Enhanced reasoning', 3000, 15000, true, 'free'),
    ('thinking-f3', 'THINKING-LABEL/DeepSeek-V2.5-1214', 'siliconflow', 'thinking F3', 'Latest thinking model', 2800, 12000, true, 'free'),
    ('philosophy-gen', 'Qwen/Qwen2.5-7B-Instruct', 'siliconflow', 'philosophy gen', 'Great for conversations', 500, 2000, true, 'free'),
    ('philosophy-gen-2', 'Qwen/Qwen2.5-14B-Instruct', 'siliconflow', 'philosophy gen 2', 'Enhanced conversations', 2000, 8000, true, 'basic'),
    ('philosophy-gen-2.5', 'Qwen/Qwen2.5-72B-Instruct', 'siliconflow', 'philosophy gen 2.5', 'Premium conversations', 8000, 32000, true, 'pro')
ON CONFLICT (slug) DO NOTHING;

-- =============================================================================
-- SCHEMA VERSION TRACKING
-- =============================================================================
CREATE TABLE IF NOT EXISTS schema_migrations (
    version VARCHAR(50) PRIMARY KEY,
    applied_at TIMESTAMP DEFAULT NOW()
);

INSERT INTO schema_migrations (version) VALUES ('phase5a-v1')
ON CONFLICT (version) DO NOTHING;

-- =============================================================================
-- ENABLE ROW LEVEL SECURITY (Supabase)
-- =============================================================================
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE api_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE models ENABLE ROW LEVEL SECURITY;
ALTER TABLE packages ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE api_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE promocodes ENABLE ROW LEVEL SECURITY;

-- RLS policies (safe for custom JWT and Supabase Auth)
-- NOTE: Backend uses direct pg pool (DATABASE_URL) — RLS is bypassed (service role).
-- These policies apply only when using Supabase REST API directly.
-- For custom JWT: set jwt.claim.sub via supabase settings, or disable RLS for direct connections.
-- Simplified policy: allow all for service role; users filtered by application logic.
CREATE POLICY "Service role full access" ON users FOR ALL USING (true);
-- Allow users to read own data (works with Supabase Auth and custom JWT via claims)
CREATE POLICY "Users can read own data" ON users FOR SELECT USING (
  (current_setting('request.jwt.claim.sub', true))::text = id::text
  OR (current_setting('request.jwt.claims', true))::jsonb ->> 'role' = 'service_role'
  OR (current_setting('request.jwt.claims', true))::jsonb ->> 'role' = 'admin'
);

-- =============================================================================
-- COMPLETE
-- =============================================================================
SELECT 'ThinkSync Models schema v1 - DEPLOYED' as status;