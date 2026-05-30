/**
 * @fileoverview Optional direct PostgreSQL connection pools (Tier B scaffolding).
 *
 * These pools are created lazily and ONLY when the corresponding connection
 * string is configured. When unset, every getter returns null and the callers
 * fall back to their current behaviour — so importing this module and shipping
 * the scaffolding changes nothing for the running pilot.
 *
 *   DATABASE_URL         — privileged/owner connection used for the atomic
 *                          multi-table transition transaction (STATE-03).
 *   SCOPED_DATABASE_URL  — connection over a DB role WITHOUT BYPASSRLS, used so
 *                          migration 001's facility RLS policies actually apply
 *                          (AUTH-03). Requires migration 001 to be applied.
 *
 * Both require migration 001 (multi-axis enums/columns) to be present for the
 * scoped writes to succeed.
 */
import { Pool } from 'pg';

type Env = Record<string, string | undefined>;

let directPool: Pool | null | undefined;
let scopedPool: Pool | null | undefined;

function makePool(url: string | undefined): Pool | null {
  if (!url) return null;
  return new Pool({ connectionString: url, max: 5, idleTimeoutMillis: 30_000 });
}

/** Privileged direct pool for the atomic transition transaction, or null if unconfigured. */
export function getDirectPool(env: Env = process.env): Pool | null {
  if (directPool === undefined) directPool = makePool(env.DATABASE_URL);
  return directPool;
}

/** Facility-scoped (non-BYPASSRLS) pool for RLS-enforced queries, or null if unconfigured. */
export function getScopedPool(env: Env = process.env): Pool | null {
  if (scopedPool === undefined) scopedPool = makePool(env.SCOPED_DATABASE_URL);
  return scopedPool;
}

/** Test/diagnostic helper: drop cached pools so a new env is re-read. */
export function __resetPools() {
  directPool = undefined;
  scopedPool = undefined;
}
