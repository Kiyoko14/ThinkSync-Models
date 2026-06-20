import { randomUUID } from "crypto";

export interface AIModel {
  id: string;
  slug: string;
  provider_model_id: string;
  provider_name: string;
  display_name: string;
  description?: string | null;
  pricing_input_per_m: number;
  pricing_output_per_m: number;
  supports_streaming: boolean;
  supports_functions: boolean;
  is_active: boolean;
  context_window: number;
  max_output_tokens: number;
  rate_limit_rpm: number;
  rate_limit_tpm: number;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

const models = new Map<string, AIModel>();

export function createModel(m: Omit<AIModel, "id" | "created_at" | "updated_at"> & { id?: string }): AIModel {
  const now = new Date().toISOString();
  const model: AIModel = {
    id: m.id || randomUUID(),
    slug: m.slug || m.id || randomUUID(),
    provider_model_id: m.provider_model_id,
    provider_name: m.provider_name,
    display_name: m.display_name,
    description: m.description || null,
    pricing_input_per_m: m.pricing_input_per_m,
    pricing_output_per_m: m.pricing_output_per_m,
    supports_streaming: m.supports_streaming,
    supports_functions: m.supports_functions,
    is_active: m.is_active,
    context_window: m.context_window,
    max_output_tokens: m.max_output_tokens,
    rate_limit_rpm: m.rate_limit_rpm,
    rate_limit_tpm: m.rate_limit_tpm,
    sort_order: m.sort_order,
    created_at: now,
    updated_at: now,
  };
  models.set(model.id, model);
  return model;
}

export function getModelById(id: string): AIModel | undefined {
  return models.get(id);
}

export function listModels(): AIModel[] {
  return [...models.values()];
}

export function updateModel(id: string, patch: Partial<AIModel>): AIModel | undefined {
  const model = models.get(id);
  if (!model) return undefined;
  Object.assign(model, patch, { updated_at: new Date().toISOString() });
  models.set(id, model);
  return model;
}

export function clearModels(): void {
  models.clear();
}
