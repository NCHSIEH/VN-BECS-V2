import { describe, expect, it } from 'vitest';
import { apiErrorResponse, getRequestId, internalErrorResponse } from '../server/apiResponses';

describe('apiResponses', () => {
  it('extracts request ids consistently', () => {
    const request = new Request('http://localhost/api', {
      headers: { 'X-Request-ID': 'REQ-123' },
    });

    expect(getRequestId(request)).toBe('REQ-123');
  });

  it('returns structured API errors with code and request id', async () => {
    const response = apiErrorResponse({
      request: new Request('http://localhost/api', {
        headers: { 'X-Request-ID': 'REQ-456' },
      }),
      code: 'VALIDATION_FAILED',
      message: 'Invalid payload',
      status: 400,
    });
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body).toMatchObject({
      success: false,
      error: 'VALIDATION_FAILED',
      code: 'VALIDATION_FAILED',
      message: 'Invalid payload',
      requestId: 'REQ-456',
    });
  });

  it('wraps internal errors without losing the production code', async () => {
    const response = internalErrorResponse(undefined, new Error('database unavailable'), 'DB_DOWN');
    const body = await response.json();

    expect(response.status).toBe(500);
    expect(body.code).toBe('DB_DOWN');
    expect(body.message).toBe('database unavailable');
  });
});
