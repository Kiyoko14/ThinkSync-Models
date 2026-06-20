import { createHash, randomBytes } from "crypto";

export function generateApiKey(): string {
  return "thc_" + randomBytes(16).toString("hex");
}

export function hashApiKey(key: string): string {
  return createHash("sha256").update(key).digest("hex");
}

export function prefixApiKey(key: string): string {
  return key.slice(0, 10);
}
