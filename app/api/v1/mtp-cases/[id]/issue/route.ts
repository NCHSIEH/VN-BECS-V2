import { NextResponse } from 'next/server';
import * as db from '@/src/server/db';

export async function POST(req: Request, { params }: { params: { id: string } }) {
  try {
    const { id } = params;
    const mtp = await db.mtpCases.getById(id);
    if (!mtp) return NextResponse.json({ error: 'Not Found' }, { status: 404 });

    const newUnitsIssued = (mtp.unitsIssued || 0) + 1;
    let newRound = mtp.currentRound || 1;
    let newTarget = mtp.unitsTarget || 18;

    // Transition logic: After 6 units, maybe move to round 2
    if (newUnitsIssued === 6 && newRound === 1) {
       newRound = 2;
    }

    const updated = await db.mtpCases.update(id, {
       unitsIssued: newUnitsIssued,
       currentRound: newRound,
       unitsTarget: newTarget
    });

    return NextResponse.json(updated);
  } catch (error) {
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
