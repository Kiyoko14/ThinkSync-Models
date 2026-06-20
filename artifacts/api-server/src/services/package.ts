import { randomUUID } from "crypto";

export interface Package {
  id: string;
  name: string;
  description?: string | null;
  token_amount: number;
  bonus_tokens: number;
  price_usd_cents: number;
  display_price: string;
  is_featured: boolean;
  sort_order: number;
  status: string;
  created_at: string;
  updated_at: string;
}

const packages = new Map<string, Package>();

export function createPackage(p: Omit<Package, "id" | "created_at" | "updated_at"> & { id?: string }): Package {
  const now = new Date().toISOString();
  const pkg: Package = {
    id: p.id || randomUUID(),
    name: p.name,
    description: p.description || null,
    token_amount: p.token_amount,
    bonus_tokens: p.bonus_tokens,
    price_usd_cents: p.price_usd_cents,
    display_price: p.display_price,
    is_featured: p.is_featured,
    sort_order: p.sort_order,
    status: p.status,
    created_at: now,
    updated_at: now,
  };
  packages.set(pkg.id, pkg);
  return pkg;
}

export function getPackageById(id: string): Package | undefined {
  return packages.get(id);
}

export function listPackages(): Package[] {
  return [...packages.values()];
}

export function updatePackage(id: string, patch: Partial<Package>): Package | undefined {
  const pkg = packages.get(id);
  if (!pkg) return undefined;
  Object.assign(pkg, patch, { updated_at: new Date().toISOString() });
  packages.set(id, pkg);
  return pkg;
}

export function clearPackages(): void {
  packages.clear();
}
