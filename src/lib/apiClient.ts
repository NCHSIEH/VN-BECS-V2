/**
 * @fileoverview Front-end auth wiring (P0 identity end-to-end).
 *
 * The server now issues a signed session token at login and trusts ONLY that
 * token (not client headers) for identity in production. This module:
 *  - persists the session token + actor role on login,
 *  - installs a one-time global fetch interceptor that attaches
 *    `Authorization: Bearer <token>` to every same-origin `/api/` request,
 *  - so all existing components keep using plain `fetch(...)` unchanged.
 *
 * The `x-actor-role` header is still attached for non-production RBAC opt-in
 * compatibility; in production the server ignores it and uses the token.
 */

const TOKEN_KEY = 'vnbbms_session_token';
const ROLE_KEY = 'vnbbms_actor_role';

export function setSession(token: string | undefined | null, role?: string | null): void {
  if (typeof window === 'undefined') return;
  if (token) localStorage.setItem(TOKEN_KEY, token);
  if (role) localStorage.setItem(ROLE_KEY, role);
}

export function clearSession(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(ROLE_KEY);
}

export function getToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(TOKEN_KEY);
}

export function getActorRole(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(ROLE_KEY);
}

function isApiRequest(url: string): boolean {
  if (!url) return false;
  if (url.startsWith('/api/')) return true;
  try {
    return url.startsWith(`${window.location.origin}/api/`);
  } catch {
    return false;
  }
}

let installed = false;

/**
 * Idempotently patch window.fetch to inject auth headers on /api/ calls.
 * Call once at app startup.
 */
export function installAuthInterceptor(): void {
  if (installed || typeof window === 'undefined' || typeof window.fetch !== 'function') return;
  installed = true;

  const originalFetch = window.fetch.bind(window);

  window.fetch = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    try {
      const url =
        typeof input === 'string'
          ? input
          : input instanceof URL
            ? input.toString()
            : input instanceof Request
              ? input.url
              : String(input);

      if (isApiRequest(url)) {
        const token = getToken();
        const role = getActorRole();

        if (token || role) {
          const headers = new Headers(
            init?.headers ?? (input instanceof Request ? input.headers : undefined),
          );
          if (token && !headers.has('Authorization')) headers.set('Authorization', `Bearer ${token}`);
          if (role && !headers.has('x-actor-role')) headers.set('x-actor-role', role);
          init = { ...(init ?? {}), headers };
        }
      }
    } catch {
      // Never let header injection break a request.
    }

    return originalFetch(input as any, init);
  };
}
