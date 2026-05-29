import { NextResponse } from 'next/server';
import { patients } from '@/src/server/db';
import { internalErrorResponse } from '@/src/server/apiResponses';

export async function GET(request: Request) {
  try {
    const data = await patients.getAll();
    return NextResponse.json(data || []);
  } catch (error: any) {
    return internalErrorResponse(request, error, 'PATIENT_LIST_FAILED');
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    await patients.create(body);
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return internalErrorResponse(request, error, 'PATIENT_CREATE_FAILED');
  }
}
