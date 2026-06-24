// Platform Settings Service - Phase 5C.5
// Updated: Phase 5C.8 - Added getPublicSettings()
import { randomUUID } from 'crypto';
import db from '../db';

export interface PlatformSetting {
  id: string;
  key: string;
  value: string | null;
  description: string | null;
  data_type: string;
  updated_by: string | null;
  updated_at: string;
}

// Whitelist of public settings that can be exposed without authentication
const PUBLIC_SETTINGS_KEYS = [
  'payment_card_number',
  'payment_card_holder', 
  'payment_card_phone',
  'support_email',
  'support_telegram',
  'frontend_url',
  'api_url',
  'maintenance_mode',
  'registration_enabled',
  'deposits_enabled',
  'user_bot_enabled',
  'default_currency',
];

/**
 * Get public platform settings (no auth required)
 * Exposes only safe, non-sensitive settings
 */
export async function getPublicSettings(): Promise<Record<string, any>> {
  const settings = await getSettings(PUBLIC_SETTINGS_KEYS);
  
  const result: Record<string, any> = {};
  
  for (const setting of settings) {
    if (setting.value === null) continue;
    
    // Convert based on data_type
    if (setting.data_type === 'boolean') {
      result[setting.key] = setting.value === 'true';
    } else if (setting.data_type === 'number') {
      result[setting.key] = parseFloat(setting.value);
    } else {
      result[setting.key] = setting.value;
    }
  }
  
  return result;
}

/**
 * Get all platform settings
 */
export async function getAllSettings(): Promise<PlatformSetting[]> {
  const result = await db.query(
    'SELECT * FROM platform_settings ORDER BY key ASC'
  );
  return result.rows;
}

/**
 * Get setting by key
 */
export async function getSetting(key: string): Promise<PlatformSetting | null> {
  const result = await db.query(
    'SELECT * FROM platform_settings WHERE key = $1',
    [key]
  );
  return result.rows[0] || null;
}

/**
 * Get multiple settings by keys
 */
export async function getSettings(keys: string[]): Promise<PlatformSetting[]> {
  if (keys.length === 0) return [];
  const placeholders = keys.map((_, i) => `$${i + 1}`).join(', ');
  const result = await db.query(
    `SELECT * FROM platform_settings WHERE key IN (${placeholders})`,
    keys
  );
  return result.rows;
}

/**
 * Get setting value (typed)
 */
export async function getSettingValue<T = string>(key: string, defaultValue: T): Promise<T> {
  const setting = await getSetting(key);
  if (!setting || setting.value === null) return defaultValue;
  
  try {
    if (setting.data_type === 'boolean') {
      return (setting.value === 'true') as any;
    }
    if (setting.data_type === 'number') {
      return parseFloat(setting.value) as any;
    }
    if (setting.data_type === 'json') {
      return JSON.parse(setting.value) as any;
    }
    return setting.value as any;
  } catch {
    return defaultValue;
  }
}

/**
 * Update or insert a setting
 */
export async function setSetting(
  key: string,
  value: string,
  options?: {
    description?: string;
    data_type?: string;
    updated_by?: string;
  }
): Promise<PlatformSetting> {
  const now = new Date().toISOString();
  const id = randomUUID();
  
  const result = await db.query(
    `INSERT INTO platform_settings (id, key, value, description, data_type, updated_by, updated_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     ON CONFLICT (key) DO UPDATE SET
       value = EXCLUDED.value,
       description = COALESCE(EXCLUDED.description, platform_settings.description),
       data_type = COALESCE(EXCLUDED.data_type, platform_settings.data_type),
       updated_by = EXCLUDED.updated_by,
       updated_at = EXCLUDED.updated_at
     RETURNING *`,
    [
      id,
      key,
      value,
      options?.description || null,
      options?.data_type || 'string',
      options?.updated_by || null,
      now
    ]
  );
  
  return result.rows[0];
}

/**
 * Delete a setting (set to null)
 */
export async function deleteSetting(key: string): Promise<boolean> {
  const result = await db.query(
    'UPDATE platform_settings SET value = NULL, updated_at = $1 WHERE key = $2 RETURNING id',
    [new Date().toISOString(), key]
  );
  return (result.rowCount || 0) > 0;
}

/**
 * Get feature flag value
 */
export async function isFeatureEnabled(key: string): Promise<boolean> {
  return getSettingValue<boolean>(key, false);
}

// =============================================================================
// COMMON SETTINGS GETTERS
// =============================================================================

export async function getPaymentCardInfo(): Promise<{
  number: string;
  holder: string;
  phone: string;
}> {
  const settings = await getSettings([
    'payment_card_number',
    'payment_card_holder',
    'payment_card_phone'
  ]);
  
  const getVal = (key: string, def: string) => 
    settings.find(s => s.key === key)?.value || def;
  
  return {
    number: getVal('payment_card_number', '8600 **** **** ****'),
    holder: getVal('payment_card_holder', 'ThinkSync'),
    phone: getVal('payment_card_phone', '+998 90 123 45 67')
  };
}

export async function getSupportInfo(): Promise<{
  email: string;
  telegram: string;
}> {
  const settings = await getSettings([
    'support_email',
    'support_telegram'
  ]);
  
  const getVal = (key: string, def: string) => 
    settings.find(s => s.key === key)?.value || def;
  
  return {
    email: getVal('support_email', 'support@thinksync.art'),
    telegram: getVal('support_telegram', '@thinksync_support')
  };
}

export async function getPlatformUrls(): Promise<{
  frontend: string;
  api: string;
}> {
  const settings = await getSettings([
    'frontend_url',
    'api_url'
  ]);
  
  const getVal = (key: string, def: string) => 
    settings.find(s => s.key === key)?.value || def;
  
  return {
    frontend: getVal('frontend_url', 'https://models.thinksync.art'),
    api: getVal('api_url', 'https://api.thinksync.art')
  };
}

export async function getPlatformFeatures(): Promise<{
  maintenanceMode: boolean;
  registrationEnabled: boolean;
  depositsEnabled: boolean;
  userBotEnabled: boolean;
  adminBotEnabled: boolean;
}> {
  const settings = await getSettings([
    'maintenance_mode',
    'registration_enabled',
    'deposits_enabled',
    'user_bot_enabled',
    'admin_bot_enabled'
  ]);
  
  const getBool = (key: string, def: boolean) => {
    const s = settings.find(st => st.key === key);
    return s?.value === 'true' || def;
  };
  
  return {
    maintenanceMode: getBool('maintenance_mode', false),
    registrationEnabled: getBool('registration_enabled', true),
    depositsEnabled: getBool('deposits_enabled', true),
    userBotEnabled: getBool('user_bot_enabled', true),
    adminBotEnabled: getBool('admin_bot_enabled', true)
  };
}

export default {
  getAllSettings,
  getSetting,
  getSettings,
  getSettingValue,
  setSetting,
  deleteSetting,
  isFeatureEnabled,
  getPaymentCardInfo,
  getSupportInfo,
  getPlatformUrls,
  getPlatformFeatures,
};