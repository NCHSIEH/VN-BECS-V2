import { NextResponse } from 'next/server';

export interface ApiErrorOptions {
  code: string;
  message: string;
  status?: number;
  request?: Request;
  details?: unknown;
}

export function getRequestId(request?: Request): string | null {
  return request?.headers.get('X-Request-ID') || request?.headers.get('x-request-id') || null;
}

export function apiErrorResponse(options: ApiErrorOptions) {
  const requestId = getRequestId(options.request);
  return NextResponse.json(
    {
      success: false,
      error: options.code,
      code: options.code,
      message: options.message,
      requestId,
      details: options.details,
    },
    { status: options.status || 500 }
  );
}

export function internalErrorResponse(request: Request | undefined, error: unknown, code = 'INTERNAL_SERVER_ERROR') {
  return apiErrorResponse({
    request,
    code,
    message: error instanceof Error ? error.message : 'Internal Server Error',
    status: 500,
  });
}
