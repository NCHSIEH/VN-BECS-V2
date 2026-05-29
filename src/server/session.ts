/**
 * @fileoverview Server-side session tokens (P0 identity hardening).
 *
 * Closes the root authentication flaw where API role was taken from
 * client-supplied headers (`x-actor-role`) or request body. From now on the
 * server issues a stateless, HMAC-signed token at login and verifies it on
 * every request. The verified token — not a client header — is the
 * authoritative source of actor identity and role.
 *
 * Design notes:
 * - Stateless (HMAC-SHA256). No session table required; revocation is by
 *   short TTL. A server-side denylist can be layered later if needed.
 * - Token format: `<base64url(payloadJson)>.<base64url(hmac)>` (JWT-like, HS256).
 * - Secret comes from `VN_BECS_SESSION_SECRET`. In production a strong secret
 *   (>= 32 chars) is mandatory; missing/weak secret is a hard failure
 *   (fail-closed), consistent with db.ts production hardening.
 */
import crypto from 'node:crypto';
import type { Role } from '../types';

const DEV_FALLBACK_SECRET = 'vn-becs-dev-insecure-secret-do-not-use-in-production';
const DEFAULT_TTL_SECONDS = 8 * 60 * 60; // 8h clinical shift

type SessionEnv = Record<string, string | undefined>;

export interface SessionClaims {
  sub: string; // user id
  username: string;
  role: Role;
  orgId?: string;
  iat: number; // issued-at (epoch seconds)
  exp: number; // expiry (epoch seconds)
}

export type SessionInput = Pick<SessionClaims, 'sub' | 'username' | 'role' | 'orgId'>;

/**
 * Resolve the signing secret. Fail-closed in production.
 */
export function getSessionSecret(env: SessionEnv = process.env): string {
  const secret = env.VN_BECS_SESSION_SECRET;
  if (secret && secret.length >= 32) return secret;

  if (env.NODE_ENV === 'production') {
    throw new Error(
      'Production hardening: VN_BECS_SESSION_SECRET (>= 32 chars) is required to sign session tokens.',
    );
  }
  // Non-production convenience only.
  return DEV_FALLBACK_SECRET;
}

function b64url(input: Buffer | string): string {
  return Buffer.from(input).toString('base64url');
}

function sign(data: string, secret: string): string {
  return crypto.createHmac('sha256', secret).update(data).digest('base64url');
}

/**
 * Issue a signed session token for an authenticated user.
 */
export function issueSessionToken(
  input: SessionInput,
  ttlSeconds: number = DEFAULT_TTL_SECONDS,
  env: SessionEnv = process.env,
): string {
  const secret = getSessionSecret(env);
  const now = Math.floor(Date.now() / 1000);
  const claims: SessionClaims = {
    sub: input.sub,
    username: input.username,
    role: input.role,
    orgId: input.orgId,
    iat: now,
    exp: now + ttlSeconds,
  };
  const payload = b64url(JSON.stringify(claims));
  const signature = sign(payload, secret);
  return `${payload}.${signature}`;
}

/**
 * Verify a token and return its claims, or null if invalid/expired/tampered.
 * Uses a constant-time comparison to resist signature-forgery timing attacks.
 */
export function verifySessionToken(
  token: string | null | undefined,
  env: SessionEnv = process.env,
): SessionClaims | null {
  if (!token || typeof token !== 'string') return null;
  const dot = token.indexOf('.');
  if (dot <= 0 || dot === token.length - 1) return null;

  const payload = token.slice(0, dot);
  const signature = token.slice(dot + 1);

  let secret: string;
  try {
    secret = getSessionSecret(env);
  } catch {
    return null; // missing secret => treat as unauthenticated, never throw to caller
  }

  const expected = sign(payload, secret);
  const sigBuf = Buffer.from(signature);
  const expBuf = Buffer.from(expected);
  if (sigBuf.length !== expBuf.length || !crypto.timingSafeEqual(sigBuf, expBuf)) {
    return null;
  }

  try {
    const claims = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8')) as SessionClaims;
    if (typeof claims.exp !== 'number' || claims.exp < Math.floor(Date.now() / 1000)) {
      return null; // expired
    }
    if (!claims.sub || !claims.role) return null;
    return claims;
  } catch {
    return null;
  }
}

/**
 * Extract and verify the session from a request.
 * Accepts `Authorization: Bearer <token>` or the `vn_becs_session` cookie.
 */
export function getSessionFromRequest(
  request: Request,
  env: SessionEnv = process.env,
): SessionClaims | null {
  const authHeader =
    request.headers.get('authorization') || request.headers.get('Authorization');

  let token: string | undefined;
  if (authHeader && authHeader.toLowerCase().startsWith('bearer ')) {
    token = authHeader.slice(7).trim();
  }

  if (!token) {
    const cookie = request.headers.get('cookie');
    if (cookie) {
      const match = cookie.match(/(?:^|;\s*)vn_becs_session=([^;]+)/);
      if (match) token = decodeURIComponent(match[1]);
    }
  }

  if (!token) return null;
  return verifySessionToken(token, env);
}
