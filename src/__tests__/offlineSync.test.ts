import { describe, expect, it } from 'vitest';
import {
  buildOfflineEventReceipt,
  findPriorOfflineSyncResult,
  offlineEventKey,
  syncResult,
} from '../server/services/offlineSync';

describe('offlineSync', () => {
  it('uses idempotencyKey before localEventId', () => {
    expect(offlineEventKey({ idempotencyKey: 'idem-1', localEventId: 'local-1' })).toBe('idem-1');
    expect(offlineEventKey({ localEventId: 'local-1' })).toBe('local-1');
    expect(offlineEventKey({})).toBeNull();
  });

  it('returns prior terminal result for duplicate client retries', () => {
    const prior = findPriorOfflineSyncResult(
      [
        {
          localEventId: 'local-1',
          idempotencyKey: 'idem-1',
          syncStatus: 'Accepted',
          serverVersion: 4,
          currentStatus: 'ISSUED',
        },
      ],
      { idempotencyKey: 'idem-1' }
    );

    expect(prior).toMatchObject({
      idempotencyKey: 'idem-1',
      syncState: 'Accepted',
      duplicate: true,
      serverVersion: 4,
      currentStatus: 'ISSUED',
    });
  });

  it('builds a durable receipt for accepted and rejected events', () => {
    const result = syncResult(
      { idempotencyKey: 'idem-2' },
      'NeedsReview',
      { errorCode: 'VERSION_CONFLICT', error: 'Version mismatch', serverVersion: 8 }
    );
    const receipt = buildOfflineEventReceipt(
      {
        idempotencyKey: 'idem-2',
        localEventId: 'local-2',
        operationType: 'IssueBag',
        bagUid: 'CMP-1',
        payload: { patientRef: 'MRN-1' },
        baseVersion: 7,
      },
      result,
      'REQ-1'
    );

    expect(receipt).toMatchObject({
      localEventId: 'local-2',
      idempotencyKey: 'idem-2',
      operationType: 'IssueBag',
      bagUid: 'CMP-1',
      patientRef: 'MRN-1',
      baseVersion: 7,
      syncStatus: 'NeedsReview',
      errorCode: 'VERSION_CONFLICT',
      serverVersion: 8,
      requestId: 'REQ-1',
    });
    expect(receipt.payload).toContain('MRN-1');
  });
});
