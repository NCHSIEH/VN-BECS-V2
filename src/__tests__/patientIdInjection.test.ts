import { describe, expect, it } from 'vitest';
import { patients } from '../server/repositories/patientRepo';

/**
 * Security regression: patients.getById interpolates its argument into a
 * PostgREST .or() filter, so it must reject PostgREST metacharacters to prevent
 * filter-expression injection. In the test env Supabase is unconfigured, so a
 * well-formed id falls through to the in-memory fallback; a malicious value must
 * never reach the DB filter and resolves to null.
 */
describe('patients.getById — PostgREST filter injection guard', () => {
  it('rejects values containing filter metacharacters (returns null, no match)', async () => {
    const malicious = [
      'MRN-1),(id.eq.OTHER',
      'x,status.eq.AVAILABLE',
      'a)or(id.eq.b',
      "1';DROP TABLE patients;--",
      'id.eq.victim',
    ];
    for (const v of malicious) {
      await expect(patients.getById(v)).resolves.toBeNull();
    }
  });

  it('accepts well-formed structured ids/MRNs', async () => {
    // Matches a seeded fallback patient id in the in-memory store.
    const result = await patients.getById('MRN-HCM-887766');
    expect(result?.id).toBe('MRN-HCM-887766');
  });
});
