import { describe, expect, it } from 'vitest';
import { issueSessionToken, verifySessionToken } from '../server/session';
import { authorizeApiRole, resolveActorIdentity } from '../server/rbacPolicy';

const PROD = { NODE_ENV: 'production', VN_BECS_SESSION_SECRET: 'x'.repeat(40) } as Record<string, string>;
const DEV = { NODE_ENV: 'development' } as Record<string, string>;

function req(headers: Record<string, string> = {}): Request {
  return new Request('https://example.test/api/v1/issue', { method: 'POST', headers });
}

describe('session token', () => {
  it('round-trips valid claims', () => {
    const token = issueSessionToken({ sub: 'U1', username: 'nurse1', role: 'Nurse', orgId: 'HOSP-1' }, 3600, PROD);
    const claims = verifySessionToken(token, PROD);
    expect(claims?.sub).toBe('U1');
    expect(claims?.role).toBe('Nurse');
    expect(claims?.orgId).toBe('HOSP-1');
  });

  it('rejects a tampered signature', () => {
    const token = issueSessionToken({ sub: 'U1', username: 'nurse1', role: 'Nurse' }, 3600, PROD);
    const tampered = `${token.slice(0, -2)}xy`;
    expect(verifySessionToken(tampered, PROD)).toBeNull();
  });

  it('rejects a role-escalated payload (re-signing required)', () => {
    // Attacker takes a Nurse token and swaps the payload to Admin without the secret.
    const token = issueSessionToken({ sub: 'U1', username: 'nurse1', role: 'Nurse' }, 3600, PROD);
    const [, sig] = token.split('.');
    const forgedPayload = Buffer.from(JSON.stringify({ sub: 'U1', username: 'nurse1', role: 'Admin', iat: 0, exp: 9999999999 })).toString('base64url');
    expect(verifySessionToken(`${forgedPayload}.${sig}`, PROD)).toBeNull();
  });

  it('rejects an expired token', () => {
    const token = issueSessionToken({ sub: 'U1', username: 'nurse1', role: 'Nurse' }, -10, PROD);
    expect(verifySessionToken(token, PROD)).toBeNull();
  });
});

describe('production identity resolution — header spoofing is dead', () => {
  it('IGNORES client-supplied x-actor-role in production', () => {
    const identity = resolveActorIdentity(req({ 'x-actor-role': 'Admin' }), undefined, PROD);
    expect(identity.source).toBe('none');
    expect(identity.role).toBeUndefined();
  });

  it('blocks a spoofed-header request as UNAUTHENTICATED in production', () => {
    const decision = authorizeApiRole({
      request: req({ 'x-actor-role': 'Admin' }),
      allowedRoles: ['HospitalOperator'],
      action: 'ISSUE_BLOOD',
      env: PROD,
    });
    expect(decision.allowed).toBe(false);
    expect(decision.reason).toBe('UNAUTHENTICATED');
  });

  it('trusts a verified session role in production', () => {
    const token = issueSessionToken({ sub: 'U2', username: 'op1', role: 'HospitalOperator', orgId: 'HOSP-1' }, 3600, PROD);
    const decision = authorizeApiRole({
      request: req({ authorization: `Bearer ${token}` }),
      allowedRoles: ['HospitalOperator'],
      action: 'ISSUE_BLOOD',
      env: PROD,
    });
    expect(decision.allowed).toBe(true);
    expect(decision.identitySource).toBe('session');
    expect(decision.actorId).toBe('U2');
    expect(decision.actorOrgId).toBe('HOSP-1');
  });

  it('a session role NOT in the allow-list is rejected even with a valid token', () => {
    const token = issueSessionToken({ sub: 'U3', username: 'courier1', role: 'Courier' }, 3600, PROD);
    const decision = authorizeApiRole({
      request: req({ authorization: `Bearer ${token}` }),
      allowedRoles: ['HospitalOperator'],
      action: 'ISSUE_BLOOD',
      env: PROD,
    });
    expect(decision.allowed).toBe(false);
    expect(decision.reason).toBe('ROLE_NOT_ALLOWED');
  });
});

describe('non-production compatibility is preserved', () => {
  it('still honours header role outside production (demo/test path)', () => {
    const decision = authorizeApiRole({
      request: req({ 'x-actor-role': 'HospitalOperator' }),
      allowedRoles: ['HospitalOperator'],
      action: 'ISSUE_BLOOD',
      env: { ...DEV, VN_BECS_ENFORCE_API_RBAC: 'true' },
    });
    expect(decision.allowed).toBe(true);
    expect(decision.identitySource).toBe('header');
  });
});
