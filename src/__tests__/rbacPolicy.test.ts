import { describe, expect, it } from 'vitest';
import {
  authorizeApiRole,
  isApiRbacEnforced,
  isKnownRole,
  rbacErrorBody,
} from '../server/rbacPolicy';

function requestWithRole(role?: string) {
  return new Request('http://localhost/api', {
    headers: role ? { 'x-actor-role': role } : {},
  });
}

describe('rbacPolicy', () => {
  it('is opt-in until production deployment enables the RBAC flag', () => {
    expect(isApiRbacEnforced({ VN_BECS_ENFORCE_API_RBAC: undefined })).toBe(false);
    expect(isApiRbacEnforced({ VN_BECS_ENFORCE_API_RBAC: 'true' })).toBe(true);
  });

  it('allows advisory mode without blocking existing local workflows', () => {
    const decision = authorizeApiRole({
      request: requestWithRole(),
      allowedRoles: ['Admin'],
      action: 'MDM_USER_CREATE',
      env: { VN_BECS_ENFORCE_API_RBAC: undefined },
    });

    expect(decision.allowed).toBe(true);
    expect(decision.reason).toBe('RBAC_NOT_ENFORCED');
  });

  it('blocks missing, unknown, and insufficient roles when enforced', () => {
    expect(
      authorizeApiRole({
        request: requestWithRole(),
        allowedRoles: ['Admin'],
        action: 'SYSTEM_RESET',
        env: { VN_BECS_ENFORCE_API_RBAC: 'true' },
      }).reason
    ).toBe('MISSING_ROLE');

    expect(
      authorizeApiRole({
        request: requestWithRole('Visitor'),
        allowedRoles: ['Admin'],
        action: 'SYSTEM_RESET',
        env: { VN_BECS_ENFORCE_API_RBAC: 'true' },
      }).reason
    ).toBe('UNKNOWN_ROLE');

    expect(
      authorizeApiRole({
        request: requestWithRole('Nurse'),
        allowedRoles: ['Admin'],
        action: 'SYSTEM_RESET',
        env: { VN_BECS_ENFORCE_API_RBAC: 'true' },
      }).reason
    ).toBe('ROLE_NOT_ALLOWED');
  });

  it('allows explicitly permitted roles and always allows Admin', () => {
    expect(
      authorizeApiRole({
        request: requestWithRole('Manager'),
        allowedRoles: ['Manager'],
        action: 'REPORT_REVIEW',
        env: { VN_BECS_ENFORCE_API_RBAC: 'true' },
      }).allowed
    ).toBe(true);

    expect(
      authorizeApiRole({
        request: requestWithRole('Admin'),
        allowedRoles: ['Auditor'],
        action: 'AUDIT_EXPORT',
        env: { VN_BECS_ENFORCE_API_RBAC: 'true' },
      }).allowed
    ).toBe(true);
  });

  it('emits a structured RBAC error body', () => {
    const body = rbacErrorBody({
      allowed: false,
      enforced: true,
      actorRole: 'Nurse',
      reason: 'ROLE_NOT_ALLOWED',
      action: 'SYSTEM_RESET',
      allowedRoles: ['Admin'],
    });

    expect(body.code).toBe('ROLE_NOT_ALLOWED');
    expect(isKnownRole('Admin')).toBe(true);
  });
});
