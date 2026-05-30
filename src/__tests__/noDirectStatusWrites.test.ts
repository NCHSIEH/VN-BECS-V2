import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

/**
 * RTM-STATE-02 regression guard (ratchet).
 *
 * Blood-unit status transitions must go through the centralized command service
 * (executeBloodUnitTransition), which validates the state machine AND atomically
 * syncs inventory + immutable audit. This test statically scans every API route
 * for direct low-level status writers that bypass it, and asserts the set of
 * offending files equals an explicit, reviewed allowlist. Adding a new direct
 * write makes this fail — forcing the author to route through the command
 * service or consciously justify an allowlist entry in review.
 */
const FORBIDDEN = [
  /\.components\.updateStatus\(/,
  /\.components\.update\(/,
  /\.inventory\.updateStatusWithLock\(/,
];

// Each entry writes blood-unit status outside executeBloodUnitTransition for a
// reviewed reason:
//  - inventory/route.ts            : else-branch new-unit / same-status (non-transition)
//  - lims/lab-tests/[id]/auth|run  : guarded by evaluateBloodUnitTransition first
//  - reconciliation/[id]/autocorrect: admin data-repair (reconciliation)
const ALLOWLIST = new Set<string>([
  'v1/inventory/route.ts',
  'v1/lims/lab-tests/[id]/auth/route.ts',
  'v1/lims/lab-tests/[id]/run/route.ts',
  'v1/reconciliation/[id]/autocorrect/route.ts',
]);

function walk(dir: string): string[] {
  const out: string[] = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...walk(full));
    else if (entry.isFile() && entry.name === 'route.ts') out.push(full);
  }
  return out;
}

const apiDir = path.join(process.cwd(), 'app', 'api');
const offenders = new Set<string>();
for (const file of walk(apiDir)) {
  const src = fs.readFileSync(file, 'utf8');
  if (FORBIDDEN.some((re) => re.test(src))) {
    offenders.add(path.relative(apiDir, file).split(path.sep).join('/'));
  }
}

describe('RTM-STATE-02: no direct blood-unit status writes in API routes', () => {
  it('flags no direct status write outside the reviewed allowlist', () => {
    const unexpected = [...offenders].filter((f) => !ALLOWLIST.has(f)).sort();
    expect(unexpected).toEqual([]);
  });

  it('has no stale allowlist entries (cleaned-up routes must leave the list)', () => {
    const stale = [...ALLOWLIST].filter((f) => !offenders.has(f)).sort();
    expect(stale).toEqual([]);
  });
});
