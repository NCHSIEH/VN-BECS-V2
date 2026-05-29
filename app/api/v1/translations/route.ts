import { NextResponse } from 'next/server';
import { translations } from '@/src/server/db';
import { internalErrorResponse } from '@/src/server/apiResponses';

export async function GET(request: Request) {
  try {
    const data = await translations.getAll();
    return NextResponse.json(data || []);
  } catch (error: any) {
    return internalErrorResponse(request, error, 'TRANSLATION_LIST_FAILED');
  }
}
