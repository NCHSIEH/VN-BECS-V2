type AuthEnv = Partial<Pick<NodeJS.ProcessEnv, 'NODE_ENV' | 'VN_BECS_ALLOW_DEMO_LOGIN'>>;

export function isDemoLoginAllowed(env: AuthEnv = process.env): boolean {
  // Production NEVER allows demo login, regardless of override flags (fail-closed).
  if (env.NODE_ENV === 'production') return false;
  // Any non-production environment allows demo login.
  return true;
}

export function isDemoCredential(username: string, password: string): boolean {
  const normalizedUsername = username.toLowerCase();
  return (
    (normalizedUsername === 'admin' && password === 'admin123') ||
    (normalizedUsername === 'a' && password === 'a')
  );
}
