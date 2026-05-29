import { describe, expect, it } from 'vitest';
import { isDemoCredential, isDemoLoginAllowed } from '../server/authPolicy';

describe('auth policy', () => {
  it('allows demo login outside production for local testing', () => {
    expect(isDemoLoginAllowed({ NODE_ENV: 'development' })).toBe(true);
    expect(isDemoLoginAllowed({ NODE_ENV: 'test' })).toBe(true);
  });

  it('blocks demo login in production — unconditionally, no env var override', () => {
    // Production: demo login must be blocked regardless of any env variable
    expect(isDemoLoginAllowed({ NODE_ENV: 'production' })).toBe(false);
    expect(isDemoLoginAllowed({
      NODE_ENV: 'production',
      VN_BECS_ALLOW_DEMO_LOGIN: 'true', // env var override is IGNORED in production
    })).toBe(false);
  });

  it('identifies legacy demo credentials', () => {
    expect(isDemoCredential('admin', 'admin123')).toBe(true);
    expect(isDemoCredential('a', 'a')).toBe(true);
    expect(isDemoCredential('admin', 'wrong')).toBe(false);
  });
});
