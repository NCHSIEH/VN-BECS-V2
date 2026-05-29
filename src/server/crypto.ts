import bcrypt from 'bcryptjs';

/**
 * Hashes a plaintext password using bcryptjs.
 * If the input is already a bcrypt hash, it is returned as-is.
 */
export function hashPassword(password: string): string {
  if (!password) return '';
  if (password.startsWith('$2a$') || password.startsWith('$2b$')) {
    return password;
  }
  return bcrypt.hashSync(password, 10);
}

/**
 * Verifies a plaintext password against a stored hash (or legacy plaintext).
 */
export function verifyPassword(password: string, hash: string): boolean {
  if (!password || !hash) return false;
  if (!hash.startsWith('$2a$') && !hash.startsWith('$2b$')) {
    // Legacy plaintext password support — permitted ONLY outside production
    // (demo/seed data). Production must never accept a non-bcrypt credential.
    if (process.env.NODE_ENV === 'production') return false;
    return password === hash;
  }
  try {
    return bcrypt.compareSync(password, hash);
  } catch (e) {
    console.error('Password verification error:', e);
    return false;
  }
}
