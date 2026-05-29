import { describe, expect, it } from 'vitest';
import {
  authorizeApiRole,
  authorizeFacilityScope,
  facilityIdOf,
  facilityScopeErrorBody,
} from '../server/rbacPolicy';
import { issueSessionToken } from '../server/session';

const SECRET = 'test-secret-test-secret-test-secret-123456';
const ENV = { NODE_ENV: 'production', VN_BECS_SESSION_SECRET: SECRET } as Record<string, string>;

function requestWithSession(orgId: string, role: string) {
  const token = issueSessionToken(
    { sub: 'U-1', username: 'op', role: role as any, orgId },
    3600,
    ENV,
  );
  return new Request('https://x/api', { headers: { authorization: `Bearer ${token}` } });
}

describe('facilityIdOf', () => {
  it('extracts the first present facility field', () => {
    expect(facilityIdOf({ facility_id: 'F1' })).toBe('F1');
    expect(facilityIdOf({ orgId: 'O1' })).toBe('O1');
    expect(facilityIdOf({ hospital: 'HOSP-1' })).toBe('HOSP-1');
    expect(facilityIdOf({ location: 'LOC-1' })).toBe('LOC-1');
  });
  it('returns null when no facility hint exists', () => {
    expect(facilityIdOf({})).toBeNull();
    expect(facilityIdOf(null)).toBeNull();
    expect(facilityIdOf(undefined)).toBeNull();
  });
});

describe('authorizeFacilityScope (session identity)', () => {
  it('blocks cross-facility action for a session-scoped actor', () => {
    const decision = authorizeApiRole({
      request: requestWithSession('HOSP-A', 'HospitalOperator'),
      allowedRoles: ['HospitalOperator'],
      action: 'TEST',
      env: ENV,
    });
    expect(decision.allowed).toBe(true);
    expect(decision.identitySource).toBe('session');

    const scope = authorizeFacilityScope({ decision, resourceOrgId: 'HOSP-B', env: ENV });
    expect(scope.allowed).toBe(false);
    expect(scope.reason).toBe('FACILITY_SCOPE_MISMATCH');
  });

  it('allows same-facility action', () => {
    const decision = authorizeApiRole({
      request: requestWithSession('HOSP-A', 'HospitalOperator'),
      allowedRoles: ['HospitalOperator'],
      action: 'TEST',
      env: ENV,
    });
    const scope = authorizeFacilityScope({ decision, resourceOrgId: 'HOSP-A', env: ENV });
    expect(scope.allowed).toBe(true);
  });

  it('exempts Admin from facility confinement', () => {
    const decision = authorizeApiRole({
      request: requestWithSession('HUB-1', 'Admin'),
      allowedRoles: ['HospitalOperator'],
      action: 'TEST',
      env: ENV,
    });
    const scope = authorizeFacilityScope({ decision, resourceOrgId: 'HOSP-Z', env: ENV });
    expect(scope.allowed).toBe(true);
  });

  it('is a no-op when the resource has no facility hint', () => {
    const decision = authorizeApiRole({
      request: requestWithSession('HOSP-A', 'HospitalOperator'),
      allowedRoles: ['HospitalOperator'],
      action: 'TEST',
      env: ENV,
    });
    const scope = authorizeFacilityScope({ decision, resourceOrgId: null, env: ENV });
    expect(scope.allowed).toBe(true);
  });

  it('produces a structured 403 error body', () => {
    const decision = authorizeApiRole({
      request: requestWithSession('HOSP-A', 'HospitalOperator'),
      allowedRoles: ['HospitalOperator'],
      action: 'BLOOD_UNIT_ISSUE',
      env: ENV,
    });
    const body = facilityScopeErrorBody(decision, 'HOSP-B');
    expect(body.code).toBe('FACILITY_SCOPE_MISMATCH');
    expect(body.actorOrgId).toBe('HOSP-A');
    expect(body.resourceOrgId).toBe('HOSP-B');
  });
});
