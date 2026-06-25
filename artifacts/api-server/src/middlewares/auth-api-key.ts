// Authentication middleware supporting both JWT and API Key
// Phase 5B.1 - AI Gateway Foundation

import type { Request, Response, NextFunction } from "express";
import * as jwt from "jsonwebtoken";
import { hashApiKey } from "../lib/api-key";
import { getApiKeyByHash } from "../services/api-key";
import { getUserById } from "../services/user";

const JWT_SECRET = process.env.JWT_SECRET || "dev-secret-key-change-in-production";

export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    email: string;
    role: string;
    display_name?: string | null;
  };
  apiKeyId?: string;
  authMethod?: 'jwt' | 'api_key';
}

/**
 * Verify JWT token and attach user to request
 */
function verifyJWT(req: Request): { sub: string; email: string; role: string } | null {
  const header = (req as AuthenticatedRequest).headers.authorization;
  if (!header || !header.startsWith("Bearer ")) {
    return null;
  }
  const token = header.slice(7);
  try {
    return jwt.verify(token, JWT_SECRET) as { sub: string; email: string; role: string };
  } catch {
    return null;
  }
}

/**
 * Verify API key and attach user to request
 */
async function verifyAPIKey(req: Request): Promise<{ userId: string; apiKeyId: string } | null> {
  // Check for API key in header: "thc_xxxxx"
  const header = (req as AuthenticatedRequest).headers.authorization;
  if (!header) {
    return null;
  }

  // Support both "thc_xxx" and "Bearer thc_xxx" formats
  let apiKey = header;
  if (header.startsWith("Bearer ")) {
    apiKey = header.slice(7);
  }

  // Only process keys starting with "thc_"
  if (!apiKey.startsWith("thc_")) {
    return null;
  }

  // Hash the key and look up
  const keyHash = hashApiKey(apiKey);
  const apiKeyRecord = await getApiKeyByHash(keyHash);

  if (!apiKeyRecord) {
    return null;
  }

  // Check if expired
  if (apiKeyRecord.expires_at && new Date(apiKeyRecord.expires_at) < new Date()) {
    return null;
  }

  return {
    userId: apiKeyRecord.profile_id,
    apiKeyId: apiKeyRecord.id,
  };
}

/**
 * Main authentication middleware
 * Supports both JWT and API key (thc_*) authentication
 */
export async function chatAuthMiddleware(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) {
  // Try JWT first
  const jwtPayload = verifyJWT(req);
  
  if (jwtPayload) {
    // Get full user info
    const user = await getUserById(jwtPayload.sub);
    if (!user) {
      res.status(401).json({
        error: {
          message: "User not found",
          code: "user_not_found"
        }
      });
      return;
    }

    if (!user.is_active) {
      res.status(401).json({
        error: {
          message: "User account is inactive",
          code: "user_inactive"
        }
      });
      return;
    }

    req.user = {
      id: user.id,
      email: user.email,
      role: user.role,
      display_name: user.display_name,
    };
    req.authMethod = 'jwt';
    next();
    return;
  }

  // Try API key
  const apiKeyResult = await verifyAPIKey(req);
  
  if (apiKeyResult) {
    // Get full user info
    const user = await getUserById(apiKeyResult.userId);
    if (!user) {
      res.status(401).json({
        error: {
          message: "User not found for API key",
          code: "user_not_found"
        }
      });
      return;
    }

    if (!user.is_active) {
      res.status(401).json({
        error: {
          message: "User account is inactive",
          code: "user_inactive"
        }
      });
      return;
    }

    req.user = {
      id: user.id,
      email: user.email,
      role: user.role,
      display_name: user.display_name,
    };
    req.apiKeyId = apiKeyResult.apiKeyId;
    req.authMethod = 'api_key';
    next();
    return;
  }

  // No valid authentication found
  res.status(401).json({
    error: {
      message: "Invalid authentication. Provide a valid JWT token or API key (thc_xxx)",
      code: "unauthorized"
    }
  });
}

/**
 * Generate JWT token
 */
export function generateToken(userId: string, email: string, role: string): string {
  return jwt.sign({ sub: userId, email, role }, JWT_SECRET, { expiresIn: "7d" });
}

/**
 * Verify JWT token (exported for other uses)
 */
export function verifyToken(token: string): { sub: string; email: string; role: string } | null {
  try {
    return jwt.verify(token, JWT_SECRET) as { sub: string; email: string; role: string };
  } catch {
    return null;
  }
}