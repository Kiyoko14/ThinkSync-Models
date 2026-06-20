import type { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET || "dev-secret-key-change-in-production";

export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    email: string;
    role: string;
    display_name?: string | null;
  };
}

export function generateToken(userId: string, email: string, role: string): string {
  return jwt.sign({ sub: userId, email, role }, JWT_SECRET, { expiresIn: "7d" });
}

export function verifyToken(token: string): { sub: string; email: string; role: string } | null {
  try {
    return jwt.verify(token, JWT_SECRET) as { sub: string; email: string; role: string };
  } catch {
    return null;
  }
}

export function authMiddleware(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith("Bearer ")) {
    res.status(401).json({ error: { message: "Unauthorized", code: "unauthorized" } });
    return;
  }
  const token = header.slice(7);
  const payload = verifyToken(token);
  if (!payload) {
    res.status(401).json({ error: { message: "Invalid or expired token", code: "invalid_token" } });
    return;
  }
  req.user = {
    id: payload.sub,
    email: payload.email,
    role: payload.role,
  };
  next();
}

export function requireAdmin(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  if (!req.user) {
    res.status(401).json({ error: { message: "Unauthorized", code: "unauthorized" } });
    return;
  }
  if (req.user.role !== "admin") {
    res.status(403).json({ error: { message: "Forbidden", code: "forbidden" } });
    return;
  }
  next();
}

