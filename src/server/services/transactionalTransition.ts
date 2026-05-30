/**
 * @fileoverview Atomic multi-table blood-unit transition (RTM-STATE-03 scaffolding).
 *
 * Wraps the component + inventory + audit writes of a transition in a single
 * Postgres transaction (BEGIN … COMMIT) with a `SELECT … FOR UPDATE` row lock
 * and optimistic version check. Any failure rolls back ALL three writes, so a
 * unit can never be left half-transitioned.
 *
 * Gated: active only when a direct `DATABASE_URL` pool is configured AND the
 * command carries no extra inventory columns. Otherwise returns null and the
 * caller falls back to the existing sequential (fail-closed) path — so this is
 * a no-op for the current pilot until a real DB is wired and verified.
 */
import type { Pool } from 'pg';
import { getDirectPool } from '../pg';
import {
  AUDIT_GENESIS_HASH,
  buildChainedAuditEvent,
} from '../auditChain';
import type { BloodUnitStatus, DomainError } from '../../types';
import type { BloodUnitExecutionResult } from './bloodUnitCommands';

/** Minimal structural pool/client types so tests can inject a fake without pg. */
export interface TxClient {
  query: (text: string, values?: unknown[]) => Promise<{ rows: any[]; rowCount?: number | null }>;
  release: () => void;
}
export interface TxPool {
  connect: () => Promise<TxClient>;
}

export interface TransactionalTransitionInput {
  unitId: string;
  fromStatus: BloodUnitStatus;
  targetStatus: BloodUnitStatus;
  clientVersion?: number;
  actorId: string;
  actorRole: string;
  deviceId: string;
  reasonCode: string;
  requestId: string;
  multiAxis: { quality_status?: string; inventory_status?: string; assignment_status?: string };
  /** When the caller needs to write extra inventory columns, skip the atomic path. */
  hasExtraInventoryFields?: boolean;
}

export interface TransactionalDeps {
  pool?: TxPool | Pool | null;
  env?: Record<string, string | undefined>;
}

function versionConflict(unitId: string, client: number | undefined, server: number): BloodUnitExecutionResult {
  return {
    success: false,
    fromStatus: 'COLLECTED',
    targetStatus: 'COLLECTED',
    error: {
      code: 'VERSION_CONFLICT',
      message: `ConcurrencyConflict: Unit ${unitId} has been modified by another process. Client version: ${client}, server version: ${server}.`,
      severity: 'HardStop',
      actionRequired: 'Refresh and retry.',
    } as DomainError,
    httpStatus: 409,
  };
}

/**
 * Attempt the transition atomically. Returns:
 *  - a BloodUnitExecutionResult when the transaction path handled it (commit or
 *    a structured version conflict);
 *  - null when the path is not applicable (no pool, no inventory row to lock, or
 *    extra inventory fields present) — the caller must then fall back.
 */
export async function tryTransactionalTransition(
  input: TransactionalTransitionInput,
  deps: TransactionalDeps = {},
): Promise<BloodUnitExecutionResult | null> {
  // Extra inventory columns are handled by the sequential path for now.
  if (input.hasExtraInventoryFields) return null;

  const pool = (deps.pool !== undefined ? deps.pool : getDirectPool(deps.env)) as TxPool | null;
  if (!pool) return null;

  const { unitId, fromStatus, targetStatus, clientVersion, multiAxis } = input;
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const inv = await client.query(
      'SELECT version, status FROM inventory WHERE "unitId" = $1 FOR UPDATE',
      [unitId],
    );
    if (!inv.rowCount) {
      // Nothing to lock; let the caller's sequential path create the row.
      await client.query('ROLLBACK');
      return null;
    }

    const currentVer: number = Number(inv.rows[0].version) || 1;
    if (clientVersion !== undefined && Number(clientVersion) !== currentVer) {
      await client.query('ROLLBACK');
      return versionConflict(unitId, clientVersion, currentVer);
    }

    // 1. Component status + multi-axis (enum casts; requires migration 001).
    await client.query(
      `UPDATE components
         SET status = $2,
             quality_status = $3::blood_quality_status,
             inventory_status = $4::blood_inventory_status,
             assignment_status = $5::blood_assignment_status
       WHERE id = $1`,
      [unitId, targetStatus, multiAxis.quality_status, multiAxis.inventory_status, multiAxis.assignment_status],
    );

    // 2. Inventory status + optimistic version bump + multi-axis.
    await client.query(
      `UPDATE inventory
         SET status = $2,
             version = $3,
             quality_status = $4::blood_quality_status,
             inventory_status = $5::blood_inventory_status,
             assignment_status = $6::blood_assignment_status
       WHERE "unitId" = $1`,
      [unitId, targetStatus, currentVer + 1, multiAxis.quality_status, multiAxis.inventory_status, multiAxis.assignment_status],
    );

    // 3. Append-only, hash-chained audit event (chain computed in TS, inserted
    //    inside the same transaction so it commits/rolls back atomically).
    const lastHashRow = await client.query(
      'SELECT "eventHash" FROM audit_events ORDER BY timestamp DESC LIMIT 1',
    );
    const previousHash: string = lastHashRow.rows[0]?.eventHash || AUDIT_GENESIS_HASH;
    const id = `AUD-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    const timestamp = new Date().toISOString();
    const chained = buildChainedAuditEvent(
      {
        id,
        timestamp,
        eventType: 'Transition',
        objectType: 'Component',
        objectId: unitId,
        actorId: input.actorId,
        actorRole: input.actorRole,
        deviceId: input.deviceId,
        reasonCode: input.reasonCode,
        requestId: input.requestId,
        beforeHash: fromStatus,
        afterHash: targetStatus,
        details: `Atomic Transition: ${fromStatus} -> ${targetStatus} for unit ${unitId}. Reason: ${input.reasonCode}.`,
      },
      previousHash,
    );

    await client.query(
      `INSERT INTO audit_events
         (id, "actorId", "actorRole", "eventType", "objectType", "objectId",
          "beforeHash", "afterHash", details, "requestId", "deviceId", "reasonCode",
          "previousHash", "eventHash", "schemaVersion", timestamp)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16)`,
      [
        chained.id, chained.actorId, chained.actorRole, chained.eventType, chained.objectType,
        chained.objectId, chained.beforeHash, chained.afterHash, chained.details, chained.requestId,
        chained.deviceId, chained.reasonCode, chained.previousHash, chained.eventHash,
        chained.schemaVersion, chained.timestamp,
      ],
    );

    await client.query('COMMIT');
    return { success: true, fromStatus, targetStatus };
  } catch (err: any) {
    try { await client.query('ROLLBACK'); } catch { /* ignore rollback failure */ }
    // Atomic path failure means nothing was written — fail closed.
    return {
      success: false,
      fromStatus,
      targetStatus,
      error: {
        code: 'TRANSACTION_FAILED',
        message: `Atomic transition failed for unit ${unitId}: ${err?.message || 'unknown error'}. No changes were committed.`,
        severity: 'HardStop',
        actionRequired: 'Retry. The unit was not modified.',
      } as DomainError,
      httpStatus: 500,
    };
  } finally {
    client.release();
  }
}
