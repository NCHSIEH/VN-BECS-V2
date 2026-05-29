/**
 * @fileoverview Request-scoped Row-Level Security (RLS) context (RTM-AUTH-03).
 *
 * Migration `db-migrations/001` enables facility-scoped RLS policies that key
 * off two transaction-local GUCs:
 *   - `app.facility_id` — the actor's facility/org
 *   - `app.role`        — the actor's role ('Admin' bypasses facility scope)
 *
 * This module is the missing primitive for switching DB-layer RLS ON. It turns
 * a verified session identity into the `set_config(...)` statements those
 * policies read, and applies them to a caller-supplied Postgres client at the
 * start of a transaction.
 *
 * ⚠️ Activation requirement: Supabase's `service_role` key bypasses RLS. For
 * these policies to take effect, the scoped queries must run over a DB role
 * that does NOT have BYPASSRLS (e.g. a dedicated `app_rls` role, supplied via a
 * separate connection string). The application's main supabase-js client stays
 * service_role; clinical reads/writes that must be confined get routed through
 * a scoped connection that calls `applyFacilityScope` first.
 */
import type { Role } from '../types';

export interface FacilityScopeIdentity {
  role?: string;
  /** Facility/org id (session.orgId). */
  orgId?: string | null;
  /** Where the identity came from; only 'session' is trustworthy for scoping. */
  source?: 'session' | 'header' | 'none';
}

export interface FacilityScopeConfig {
  role: string;
  facilityId: string;
  isAdmin: boolean;
  /**
   * Parameterized `set_config` statements to run (transaction-local). Each is a
   * { text, values } pair ready for `pgClient.query(text, values)`.
   */
  statements: Array<{ text: string; values: Array<string | boolean> }>;
}

const ADMIN_ROLE: Role = 'Admin';

/**
 * Build the transaction-local GUC config for an identity. `is_local = true`
 * scopes the setting to the current transaction, so it cannot leak across
 * pooled connections.
 *
 * A missing facility resolves to an empty string. Under the migration's policy
 * (`facility_id = app_current_facility()`), an empty GUC matches no real
 * facility row — i.e. fail-closed for non-admin actors with no facility.
 */
export function buildFacilityScopeConfig(identity: FacilityScopeIdentity): FacilityScopeConfig {
  const role = typeof identity.role === 'string' ? identity.role : '';
  const facilityId = typeof identity.orgId === 'string' ? identity.orgId : '';
  const isAdmin = role === ADMIN_ROLE;

  return {
    role,
    facilityId,
    isAdmin,
    statements: [
      { text: "SELECT set_config('app.facility_id', $1, true)", values: [facilityId] },
      { text: "SELECT set_config('app.role', $1, true)", values: [role] },
    ],
  };
}

/** Minimal structural type for a pg client/transaction (avoids a hard dep import). */
export interface ScopedQueryClient {
  query: (text: string, values?: Array<string | boolean>) => Promise<unknown>;
}

/**
 * Apply the facility scope GUCs to an open Postgres client/transaction. Call
 * this immediately after BEGIN, before any scoped query, so the migration's
 * RLS policies evaluate against this actor.
 *
 * Only a session-derived identity is trusted; header/none identities are
 * rejected fail-closed (returns false without setting any GUC) so an
 * unauthenticated request can never widen its own scope.
 */
export async function applyFacilityScope(
  client: ScopedQueryClient,
  identity: FacilityScopeIdentity,
): Promise<boolean> {
  if (identity.source !== 'session') return false;
  const config = buildFacilityScopeConfig(identity);
  for (const stmt of config.statements) {
    await client.query(stmt.text, stmt.values);
  }
  return true;
}
