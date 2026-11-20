import { eq } from 'drizzle-orm';
import type { NextFunction, Request, Response } from 'express';
import { createRemoteJWKSet, jwtVerify } from 'jose';
import '../config/env.js';
import { db, pool } from '../db/index.js';
import { userProfilesTable } from '../db/schema.js';

const jwksUrl = process.env.NEON_AUTH_JWKS_URL;
const authBaseUrl = process.env.NEON_AUTH_BASE_URL;
const jwks = jwksUrl ? createRemoteJWKSet(new URL(jwksUrl)) : null;

export type AuthContext = {
  userId: string;
  email?: string | undefined;
  name?: string | undefined;
  role: 'user' | 'superuser';
};

export interface AuthenticatedRequest extends Request {
  auth?: AuthContext;
}

async function verifyNeonToken(
  token: string,
): Promise<{ sub: string; email?: string | undefined; name?: string | undefined } | null> {
  if (jwks) {
    try {
      const { payload } = await jwtVerify(token, jwks);
      if (typeof payload.sub === 'string' && payload.sub) {
        return {
          sub: payload.sub,
          email: typeof payload.email === 'string' ? payload.email : undefined,
          name: typeof payload.name === 'string' ? payload.name : undefined,
        };
      }
    } catch {
      // Fallback to get-session if token is an opaque session token
    }
  }

  if (pool) {
    try {
      const result = await pool.query<{ id: string; email: string | null; name: string | null }>(
        `SELECT u.id, u.email, u.name
         FROM neon_auth.session s
         JOIN neon_auth."user" u ON s."userId" = u.id
         WHERE s.token = $1 AND s."expiresAt" > now()
         LIMIT 1`,
        [token],
      );
      const row = result.rows[0];
      if (row?.id) {
        return {
          sub: row.id,
          email: row.email ?? undefined,
          name: row.name ?? undefined,
        };
      }
    } catch {
      // Fallback to HTTP get-session
    }
  }

  if (authBaseUrl) {
    try {
      const res = await fetch(`${authBaseUrl.replace(/\/+$/, '')}/get-session`, {
        headers: {
          Authorization: `Bearer ${token}`,
          Cookie: `__Secure-better-auth.session_token=${token}; better-auth.session_token=${token}`,
        },
      });
      if (res.ok) {
        const data = (await res.json()) as { user?: { id?: string; email?: string; name?: string } };
        if (data?.user?.id) {
          return {
            sub: data.user.id,
            email: data.user.email,
            name: data.user.name,
          };
        }
      }
    } catch {
      return null;
    }
  }

  return null;
}

export async function requireAuth(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  const header = req.headers.authorization;
  const token = header?.startsWith('Bearer ') ? header.slice(7).trim() : '';
  if (!token) {
    res.status(401).json({ error: 'Debes iniciar sesión para realizar esta acción.' });
    return;
  }

  const verified = await verifyNeonToken(token);
  if (!verified) {
    res.status(401).json({ error: 'Sesión inválida o expirada.' });
    return;
  }

  let role: 'user' | 'superuser' = 'user';
  if (db) {
    const rows = await db
      .select({ role: userProfilesTable.role })
      .from(userProfilesTable)
      .where(eq(userProfilesTable.authUserId, verified.sub))
      .limit(1);
    if (rows[0]?.role === 'superuser') {
      role = 'superuser';
    }
  }

  req.auth = {
    userId: verified.sub,
    email: verified.email,
    name: verified.name,
    role,
  };
  next();
}

export function requireSuperuser(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): void {
  if (!req.auth) {
    res.status(401).json({ error: 'Debes iniciar sesión.' });
    return;
  }
  if (req.auth.role !== 'superuser') {
    res.status(403).json({ error: 'Solo los superusers pueden crear restaurantes o precios de menús.' });
    return;
  }
  next();
}
