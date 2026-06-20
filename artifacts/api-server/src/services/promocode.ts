import { randomUUID } from "crypto";

export interface Promocode {
  id: string;
  code: string;
  description?: string | null;
  discount_type: string;
  discount_value: number;
  max_uses: number;
  max_uses_per_user: number;
  current_uses: number;
  min_package_price_cents?: number | null;
  is_active: boolean;
  starts_at?: string | null;
  expires_at?: string | null;
  created_at: string;
  updated_at: string;
}

const promocodes = new Map<string, Promocode>();

export function createPromocode(p: Omit<Promocode, "id" | "created_at" | "updated_at" | "current_uses"> & { id?: string }): Promocode {
  const now = new Date().toISOString();
  const pc: Promocode = {
    id: p.id || randomUUID(),
    code: p.code,
    description: p.description || null,
    discount_type: p.discount_type,
    discount_value: p.discount_value,
    max_uses: p.max_uses,
    max_uses_per_user: p.max_uses_per_user,
    current_uses: 0,
    min_package_price_cents: p.min_package_price_cents || null,
    is_active: p.is_active,
    starts_at: p.starts_at || null,
    expires_at: p.expires_at || null,
    created_at: now,
    updated_at: now,
  };
  promocodes.set(pc.id, pc);
  return pc;
}

export function getPromocodeById(id: string): Promocode | undefined {
  return promocodes.get(id);
}

export function listPromocodes(): Promocode[] {
  return [...promocodes.values()];
}

export function updatePromocode(id: string, patch: Partial<Promocode>): Promocode | undefined {
  const pc = promocodes.get(id);
  if (!pc) return undefined;
  Object.assign(pc, patch, { updated_at: new Date().toISOString() });
  promocodes.set(id, pc);
  return pc;
}

export function clearPromocodes(): void {
  promocodes.clear();
}
