import { randomUUID } from "crypto";

export interface ApiLog {
  id: string;
  profile_id?: string;
  model_slug: string;
  auth_method: string;
  input_tokens: number;
  output_tokens: number;
  total_tokens: number;
  estimated_cost: number;
  duration_ms: number;
  status: string;
  status_code: number;
  error_message?: string;
  request_model?: string;
  stream_enabled: boolean;
  ip_address?: string;
  user_agent?: string;
  created_at: string;
}

const apiLogs = new Map<string, ApiLog>();

export function createApiLog(l: Omit<ApiLog, "id" | "created_at"> & { id?: string }): ApiLog {
  const now = new Date().toISOString();
  const log: ApiLog = {
    id: l.id || randomUUID(),
    profile_id: l.profile_id,
    model_slug: l.model_slug,
    auth_method: l.auth_method,
    input_tokens: l.input_tokens,
    output_tokens: l.output_tokens,
    total_tokens: l.total_tokens,
    estimated_cost: l.estimated_cost,
    duration_ms: l.duration_ms,
    status: l.status,
    status_code: l.status_code,
    error_message: l.error_message,
    request_model: l.request_model,
    stream_enabled: l.stream_enabled,
    ip_address: l.ip_address,
    user_agent: l.user_agent,
    created_at: now,
  };
  apiLogs.set(log.id, log);
  return log;
}

export function listApiLogs(): ApiLog[] {
  return [...apiLogs.values()];
}

export function clearApiLogs(): void {
  apiLogs.clear();
}
