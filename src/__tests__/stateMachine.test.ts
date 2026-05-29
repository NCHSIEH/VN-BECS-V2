import { describe, expect, it } from 'vitest';
import {
  BLOOD_ASSIGNMENT_STATUSES,
  BLOOD_INVENTORY_STATUSES,
  BLOOD_QUALITY_STATUSES,
  BloodUnitStateMachine,
  isKnownBloodUnitState,
  normalizeBloodUnitStatus,
  normalizeBloodUnitState,
} from '../lib/stateMachine';

describe('BloodUnitStateMachine', () => {
  it('blocks transitions from terminal states', () => {
    const result = BloodUnitStateMachine.transition('TRANSFUSED', 'RETURNED', 'Admin');

    expect(result.allowed).toBe(false);
    expect(result.reason).toContain('terminal state');
  });

  it('requires cleared IDM before quarantine release', () => {
    const blocked = BloodUnitStateMachine.transition('QUARANTINE', 'AVAILABLE', 'LIMS_Simulator', {
      idmStatus: 'PENDING',
    });
    const allowed = BloodUnitStateMachine.transition('QUARANTINE', 'AVAILABLE', 'LIMS_Simulator', {
      idmStatus: 'CLEARED',
    });

    expect(blocked.allowed).toBe(false);
    expect(blocked.reason).toContain('IDM status must be CLEARED');
    expect(allowed.allowed).toBe(true);
  });

  it('blocks reservation when the order is not approved or the unit is expired', () => {
    const noOrder = BloodUnitStateMachine.transition('AVAILABLE', 'RESERVED', 'Dispatcher', {
      orderApproved: false,
    });
    const expired = BloodUnitStateMachine.transition('AVAILABLE', 'RESERVED', 'Dispatcher', {
      orderApproved: true,
      isExpired: true,
    });
    const allowed = BloodUnitStateMachine.transition('AVAILABLE', 'RESERVED', 'Dispatcher', {
      orderApproved: true,
    });

    expect(noOrder.allowed).toBe(false);
    expect(expired.allowed).toBe(false);
    expect(allowed.allowed).toBe(true);
  });

  it('requires barcode match before a reserved unit can be picked', () => {
    const blocked = BloodUnitStateMachine.transition('RESERVED', 'PICKED', 'WarehouseIssuer', {
      barcodeScanMatch: false,
    });
    const expired = BloodUnitStateMachine.transition('RESERVED', 'PICKED', 'WarehouseIssuer', {
      barcodeScanMatch: true,
      isExpired: true,
    });
    const allowed = BloodUnitStateMachine.transition('RESERVED', 'PICKED', 'WarehouseIssuer', {
      barcodeScanMatch: true,
    });

    expect(blocked.allowed).toBe(false);
    expect(expired.allowed).toBe(false);
    expect(blocked.reason).toContain('Barcode mismatch');
    expect(allowed.allowed).toBe(true);
  });

  it('allows reservation release only when the unit can safely return to stock', () => {
    const allowed = BloodUnitStateMachine.transition('RESERVED', 'AVAILABLE', 'WarehouseIssuer');
    const expired = BloodUnitStateMachine.transition('RESERVED', 'AVAILABLE', 'WarehouseIssuer', {
      isExpired: true,
    });

    expect(allowed.allowed).toBe(true);
    expect(expired.allowed).toBe(false);
    expect(expired.reason).toContain('must be wasted');
  });

  it('requires compatible crossmatch unless break-glass is active', () => {
    const incompatible = BloodUnitStateMachine.transition('RECEIVED', 'CROSSMATCHED', 'HospitalOperator', {
      crossmatchResult: 'Incompatible',
    });
    const emergency = BloodUnitStateMachine.transition('RECEIVED', 'CROSSMATCHED', 'HospitalOperator', {
      crossmatchResult: 'Incompatible',
      isBreakGlass: true,
    });

    expect(incompatible.allowed).toBe(false);
    expect(emergency.allowed).toBe(true);
  });

  it('blocks direct emergency issue from available if the unit is expired', () => {
    const result = BloodUnitStateMachine.transition('AVAILABLE', 'ISSUED', 'Nurse', {
      isBreakGlass: true,
      isExpired: true,
    });

    expect(result.allowed).toBe(false);
    expect(result.reason).toContain('expired blood unit');
  });

  it('enforces the 30-minute return rule', () => {
    const result = BloodUnitStateMachine.transition('ISSUED', 'RETURNED', 'Nurse', {
      minutesSinceIssue: 31,
    });

    expect(result.allowed).toBe(false);
    expect(result.reason).toContain('30-minute rule exceeded');
  });

  it('allows logistics wastage from picked, in-transit, or received states', () => {
    expect(BloodUnitStateMachine.transition('PICKED', 'WASTED', 'Courier').allowed).toBe(true);
    expect(BloodUnitStateMachine.transition('IN_TRANSIT', 'WASTED', 'Courier').allowed).toBe(true);
    expect(BloodUnitStateMachine.transition('RECEIVED', 'WASTED', 'HospitalOperator').allowed).toBe(true);
  });

  it('supports LIMS hub release and hemovigilance quarantine paths', () => {
    const hubRelease = BloodUnitStateMachine.transition('AVAILABLE', 'IN_TRANSIT', 'LIMS_Simulator');
    const expiredHubRelease = BloodUnitStateMachine.transition('AVAILABLE', 'IN_TRANSIT', 'LIMS_Simulator', {
      isExpired: true,
    });
    const lookbackHold = BloodUnitStateMachine.transition('CROSSMATCHED', 'QUARANTINE', 'QA_Officer');

    expect(hubRelease.allowed).toBe(true);
    expect(expiredHubRelease.allowed).toBe(false);
    expect(lookbackHold.allowed).toBe(true);
  });

  it('requires cold chain and visual inspection before returned stock becomes available', () => {
    const coldChainFail = BloodUnitStateMachine.transition('RETURNED', 'AVAILABLE', 'HospitalOperator', {
      coldChainCompliant: false,
      visualInspectionPassed: true,
    });
    const visualFail = BloodUnitStateMachine.transition('RETURNED', 'AVAILABLE', 'HospitalOperator', {
      coldChainCompliant: true,
      visualInspectionPassed: false,
    });
    const allowed = BloodUnitStateMachine.transition('RETURNED', 'AVAILABLE', 'HospitalOperator', {
      coldChainCompliant: true,
      visualInspectionPassed: true,
    });

    expect(coldChainFail.allowed).toBe(false);
    expect(visualFail.allowed).toBe(false);
    expect(allowed.allowed).toBe(true);
  });

  it('normalizes legacy status strings into the new multi-axis state model', () => {
    expect(normalizeBloodUnitState('HUB INTRANSIT')).toEqual({
      qualityStatus: 'RELEASED',
      inventoryStatus: 'IN_TRANSIT',
      assignmentStatus: 'ORDER_ALLOCATED',
    });
    expect(normalizeBloodUnitState('CROSSMATCHED')).toEqual({
      qualityStatus: 'RELEASED',
      inventoryStatus: 'RECEIVED',
      assignmentStatus: 'CROSSMATCH_COMPATIBLE',
    });
    expect(normalizeBloodUnitStatus('RELEASED')).toBe('AVAILABLE');
    expect(normalizeBloodUnitStatus('HUB INTRANSIT')).toBe('IN_TRANSIT');
    expect(normalizeBloodUnitStatus('ALLOCATED')).toBe('RESERVED');
    expect(isKnownBloodUnitState('UNEXPECTED')).toBe(false);
  });

  it('exports controlled vocabularies for production schema alignment', () => {
    expect(BLOOD_QUALITY_STATUSES).toContain('HOLD_COLD_CHAIN');
    expect(BLOOD_INVENTORY_STATUSES).toContain('RETURN_PENDING');
    expect(BLOOD_ASSIGNMENT_STATUSES).toContain('EMERGENCY_RELEASED');
  });
});
