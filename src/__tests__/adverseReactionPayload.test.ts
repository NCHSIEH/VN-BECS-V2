import { describe, expect, it } from 'vitest';
import { normalizeAdverseReactionPayload } from '../server/db';

describe('normalizeAdverseReactionPayload', () => {
  it('persists hemovigilance boolean flags as database integers', () => {
    expect(
      normalizeAdverseReactionPayload({
        id: 'AR-1',
        lookbackTriggered: true,
        allTransfusionsPaused: true,
      })
    ).toMatchObject({
      lookbackTriggered: 1,
      allTransfusionsPaused: 1,
    });

    expect(
      normalizeAdverseReactionPayload({
        id: 'AR-2',
        lookbackTriggered: false,
        allTransfusionsPaused: false,
      })
    ).toMatchObject({
      lookbackTriggered: 0,
      allTransfusionsPaused: 0,
    });
  });
});
