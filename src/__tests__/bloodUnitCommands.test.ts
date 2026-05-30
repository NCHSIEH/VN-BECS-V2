import { describe, expect, it } from 'vitest';
import {
  evaluateBloodUnitTransition,
  isBloodUnitExpired,
  executeBloodUnitTransition,
} from '../server/services/bloodUnitCommands';

describe('blood unit command validation', () => {
  it('allows a compatible received unit to become crossmatched', () => {
    const decision = evaluateBloodUnitTransition({
      unitId: 'CMP-1',
      currentStatus: 'RECEIVED',
      targetStatus: 'CROSSMATCHED',
      role: 'HospitalOperator',
      context: {
        crossmatchResult: 'Compatible',
      },
    });

    expect(decision.allowed).toBe(true);
    if (decision.allowed) {
      expect(decision.sop).toBe('SOP7');
      expect(decision.fromStatus).toBe('RECEIVED');
    }
  });

  it('blocks direct issue from available stock unless break-glass is active', () => {
    const decision = evaluateBloodUnitTransition({
      unitId: 'CMP-2',
      currentStatus: 'AVAILABLE',
      targetStatus: 'ISSUED',
      role: 'Nurse',
      context: {
        isBreakGlass: false,
      },
    });

    expect(decision.allowed).toBe(false);
    if (decision.allowed === false) {
      expect(decision.error.code).toBe('TRANSITION_BLOCKED');
      expect(decision.error.message).toContain('Break-Glass emergency mode');
    }
  });

  it('allows emergency direct issue but still blocks expired units', () => {
    const emergency = evaluateBloodUnitTransition({
      unitId: 'CMP-3',
      currentStatus: 'AVAILABLE',
      targetStatus: 'ISSUED',
      role: 'Nurse',
      context: {
        isBreakGlass: true,
      },
    });

    const expired = evaluateBloodUnitTransition({
      unitId: 'CMP-4',
      currentStatus: 'AVAILABLE',
      targetStatus: 'ISSUED',
      role: 'Nurse',
      context: {
        isBreakGlass: true,
        isExpired: true,
      },
    });

    expect(emergency.allowed).toBe(true);
    expect(expired.allowed).toBe(false);
  });

  it('normalizes legacy current statuses before evaluating transitions', () => {
    const decision = evaluateBloodUnitTransition({
      unitId: 'CMP-5',
      currentStatus: 'HUB INTRANSIT',
      targetStatus: 'RECEIVED',
      role: 'HospitalOperator',
    });

    expect(decision.allowed).toBe(true);
    if (decision.allowed) {
      expect(decision.fromStatus).toBe('IN_TRANSIT');
    }
  });

  it('returns a structured hard stop for unknown statuses', () => {
    const decision = evaluateBloodUnitTransition({
      unitId: 'CMP-6',
      currentStatus: 'MYSTERY',
      targetStatus: 'ISSUED',
      role: 'Nurse',
    });

    expect(decision.allowed).toBe(false);
    if (decision.allowed === false) {
      expect(decision.httpStatus).toBe(400);
      expect(decision.error.code).toBe('UNKNOWN_CURRENT_STATUS');
      expect(decision.error.correlationId).toMatch(/^DERR-/);
    }
  });

  it('detects expired units from ISO timestamps', () => {
    expect(isBloodUnitExpired('2026-01-01T00:00:00Z', new Date('2026-01-02T00:00:00Z'))).toBe(true);
    expect(isBloodUnitExpired('2026-01-03T00:00:00Z', new Date('2026-01-02T00:00:00Z'))).toBe(false);
  });

  describe('executeBloodUnitTransition', () => {
    it('successfully executes an allowed transition, syncing status and logging audit', async () => {
      const result = await executeBloodUnitTransition({
        unitId: 'CMP-HCM-01-RBC',
        currentStatus: 'AVAILABLE',
        targetStatus: 'RESERVED',
        role: 'Dispatcher',
        context: {
          orderApproved: true,
        },
      }, 'USR-DISPATCHER', 'DEV-PC', 'SOP4_RESERVE', 'REQ-123');

      expect(result.success).toBe(true);
      expect(result.fromStatus).toBe('AVAILABLE');
      expect(result.targetStatus).toBe('RESERVED');
    });

    it('gracefully returns failure when transition is disallowed', async () => {
      const result = await executeBloodUnitTransition({
        unitId: 'CMP-HCM-01-RBC',
        currentStatus: 'AVAILABLE',
        targetStatus: 'ISSUED',
        role: 'Nurse',
        context: {
          isBreakGlass: false,
        },
      });

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('TRANSITION_BLOCKED');
      expect(result.httpStatus).toBe(400);
    });
  });
});
