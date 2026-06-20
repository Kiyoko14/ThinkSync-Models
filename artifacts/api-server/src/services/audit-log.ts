import { randomUUID } from "crypto";

export interface AuditLog {
  id: string;
  admin_id: string;
  admin_email: string;
  action: string;
  target: string;
  target_id: string;
  details: string;
  ip_address?: string;
  created_at: string;
}

const auditLogs = new Map<string, AuditLog>();

export function createAuditLog(
  adminId: string,
  adminEmail: string,
  action: string,
  target: string,
  targetId: string,
  details: string,
  ipAddress?: string
): AuditLog {
  const now = new Date().toISOString();
  const log: AuditLog = {
    id: randomUUID(),
    admin_id: adminId,
    admin_email: adminEmail,
    action,
    target,
    target_id: targetId,
    details,
    ip_address: ipAddress,
    created_at: now,
  };
  auditLogs.set(log.id, log);
  return log;
}

export function listAuditLogs(): AuditLog[] {
  return [...auditLogs.values()].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
}

export function clearAuditLogs(): void {
  auditLogs.clear();
}
