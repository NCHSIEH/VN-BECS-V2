import { NextResponse } from 'next/server';
import * as db from '@/src/server/db';
import { internalErrorResponse } from '@/src/server/apiResponses';

export async function GET(request: Request) {
  try {
    const donors = await db.rareDonors.getAll();
    return NextResponse.json(donors);
  } catch (error) {
    return internalErrorResponse(request, error, 'RARE_DONOR_LIST_FAILED');
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const donor = await db.rareDonors.create(body);
    return NextResponse.json(donor);
  } catch (error) {
    return internalErrorResponse(request, error, 'RARE_DONOR_CREATE_FAILED');
  }
}
