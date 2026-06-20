import { randomUUID } from "crypto";

export interface ApiKey {
  id: string;
  profile_id: string;
  key_prefix: string;
  key_hash: string;
  name: string;
  status: "active" | "revoked";
  created_at: string;
  last_used_at?: string;
  expires_at?: string;
}

const apiKeys = new Map<string, ApiKey>();

export function createApiKey(key: Omit<ApiKey, "id" | "created_at"> & { id?: string }): ApiKey {
  const now = new Date().toISOString();
  const k: ApiKey = {
    id: key.id || randomUUID(),
    profile_id: key.profile_id,
    key_prefix: key.key_prefix,
    key_hash: key.key_hash,
    name: key.name,
    status: key.status,
    created_at: now,
    last_used_at: key.last_used_at,
    expires_at: key.expires_at,
  };
  apiKeys.set(k.id, k);
  return k;
}

export function getApiKeyById(id: string): ApiKey | undefined {
  return apiKeys.get(id);
}

export function getApiKeyByHash(keyHash: string): ApiKey | undefined {
  return [...apiKeys.values()].find((k) => k.key_hash === keyHash && k.status === "active");
}

export function listApiKeysForUser(profileId: string): ApiKey[] {
  return [...apiKeys.values()].filter((k) => k.profile_id === profileId);
}

export function revokeApiKey(id: string): ApiKey | undefined {
  const key = apiKeys.get(id);
  if (!key) return undefined;
  key.status = "revoked";
  apiKeys.set(id, key);
  return key;
}

export function rotateApiKey(id: string, newKeyHash: string, newPrefix: string): ApiKey | undefined {
  const key = apiKeys.get(id);
  if (!key) return undefined;
  key.key_hash = newKeyHash;
  key.key_prefix = newPrefix;
  key.created_at = new Date().toISOString();
  apiKeys.set(id, key);
  return key;
}

export function clearApiKeys(): void {
  apiKeys.clear();
}
