import type { Role } from '../types';
import { getSessionFromRequest, type SessionClaims } from './session';

export const API_RBAC_ENV_FLAG = 'VN_BECS_ENFORCE_API_RBAC';

export interface ApiRbacDecision {
  allowed: boolean;
  enforced: boolean;
  actorRole?: string;
  /** Authenticated actor id (only present when derived from a verified session). */
  actorId?: string;
  /** Authenticated actor facility/org (only present when derived from a verified session). */
  actorOrgId?: string;
  /** Where the identity came from. In production only 'session' is trusted. */
  identitySource?: 'session' | 'header' | 'none';
  reason?:
    | 'RBAC_NOT_ENFORCED'
    | 'UNAUTHENTICATED'
    | 'MISSING_ROLE'
    | 'UNKNOWN_ROLE'
    | 'ROLE_NOT_ALLOWED';
  action: string;
  allowedRoles: Role[];
}

export const KNOWN_ROLES: Role[] = [
  'Dashboard',
  'DonorScreener',
  'LIMS_Simulator',
  'WarehouseIssuer',
  'Warehouse_IssueReturn',
  'Dispatcher',
  'Courier',
  'HospitalOperator',
  'Nurse',
  'Nurse_Hemovigilance',
  'Nurse_MTP',
  'LabTech_Crossmatch',
  'MedicalReviewer',
  'SOP11_RareDonor',
  'Resource',
  'Auditor',
  'NationalCommander',
  'QA_Officer',
  'Manager',
  'Admin',
];

type RbacEnv = Record<string, string | undefined>;

export function isApiRbacEnforced(env: RbacEnv = process.env): boolean {
  if (env.NODE_ENV === 'production') return true;
  return env[API_RBAC_ENV_FLAG] === 'true';
}

export function isKnownRole(role: unknown): role is Role {
  return typeof role === 'string' && KNOWN_ROLES.includes(role as Role);
}

/**
 * @deprecated Client-supplied role headers are NOT trustworthy. Retained only
 * for non-production demo/test compatibility. Production identity is resolved
 * exclusively from a verified session (see resolveActorIdentity).
 */
export function actorRoleFromRequest(request: Request, body?: Record<string, unknown>): string | undefined {
  return (
    request.headers.get('x-actor-role') ||
    request.headers.get('x-user-role') ||
    request.headers.get('x-role') ||
    (typeof body?.actorRole === 'string' ? body.actorRole : undefined)
  );
}

export interface ResolvedIdentity {
  role?: string;
  actorId?: string;
  orgId?: string;
  source: 'session' | 'header' | 'none';
  session: SessionClaims | null;
}

/**
 * Resolve the actor identity for an API request.
 *
 * Security contract:
 * - A verified session token is ALWAYS authoritative when present.
 * - In production, ONLY a verified session is trusted. Client-supplied role
 *   headers/body are ignored entirely (closes the header-spoofing hole).
 * - Outside production, header/body role is allowed as a demo/test fallback.
 */
export function resolveActorIdentity(
  request: Request,
  body?: Record<string, unknown>,
  env: RbacEnv = process.env,
): ResolvedIdentity {
  const session = getSessionFromRequest(request, env);
  if (session) {
    return {
      role: session.role,
      actorId: session.sub,
      orgId: session.orgId,
      source: 'session',
      session,
    };
  }

  // Production never trusts unauthenticated header-supplied roles.
  if (env.NODE_ENV === 'production') {
    return { source: 'none', session: null };
  }

  const headerRole = actorRoleFromRequest(request, body);
  return {
    role: headerRole,
    source: headerRole ? 'header' : 'none',
    session: null,
  };
}

export function authorizeApiRole(args: {
  request: Request;
  body?: Record<string, unknown>;
  allowedRoles: Role[];
  action: string;
  env?: RbacEnv;
}): ApiRbacDecision {
  const env = args.env ?? process.env;
  const enforced = isApiRbacEnforced(env);
  const identity = resolveActorIdentity(args.request, args.body, env);
  const base = {
    enforced,
    actorRole: identity.role,
    actorId: identity.actorId,
    actorOrgId: identity.orgId,
    identitySource: identity.source,
    action: args.action,
    allowedRoles: args.allowedRoles,
  };

  if (!enforced) {
    return { ...base, allowed: true, reason: 'RBAC_NOT_ENFORCED' };
  }

  // Enforced + no resolvable identity. In production this means no valid
  // session was presented => unauthenticated, not merely missing a role.
  if (!identity.role) {
    return {
      ...base,
      allowed: false,
      reason: identity.source === 'none' && env.NODE_ENV === 'production'
        ? 'UNAUTHENTICATED'
        : 'MISSING_ROLE',
    };
  }

  if (!isKnownRole(identity.role)) {
    return { ...base, allowed: false, reason: 'UNKNOWN_ROLE' };
  }

  if (identity.role === 'Admin' || args.allowedRoles.includes(identity.role)) {
    return { ...base, allowed: true };
  }

  return { ...base, allowed: false, reason: 'ROLE_NOT_ALLOWED' };
}

/**
 * ABAC facility-scope guard. Use after authorizeApiRole for high-risk actions
 * that must be confined to the actor's own facility/org.
 *
 * Only enforced when the identity came from a verified session AND RBAC is
 * enforced — so non-production header-based tests are unaffected. Admin is
 * exempt (system-wide role).
 */
export function authorizeFacilityScope(args: {
  decision: ApiRbacDecision;
  resourceOrgId?: string | null;
  env?: RbacEnv;
}): { allowed: boolean; reason?: 'FACILITY_SCOPE_MISMATCH' } {
  const env = args.env ?? process.env;
  if (!isApiRbacEnforced(env)) return { allowed: true };
  if (args.decision.identitySource !== 'session') return { allowed: true };
  if (args.decision.actorRole === 'Admin') return { allowed: true };
  if (!args.resourceOrgId) return { allowed: true };

  return args.decision.actorOrgId === args.resourceOrgId
    ? { allowed: true }
    : { allowed: false, reason: 'FACILITY_SCOPE_MISMATCH' };
}

export function rbacErrorBody(decision: ApiRbacDecision) {
  return {
    success: false,
    error: 'FORBIDDEN',
    code: decision.reason || 'ROLE_NOT_ALLOWED',
    action: decision.action,
    actorRole: decision.actorRole || null,
    allowedRoles: decision.allowedRoles,
    message: 'The actor role is not authorized to perform this API action.',
  };
}
