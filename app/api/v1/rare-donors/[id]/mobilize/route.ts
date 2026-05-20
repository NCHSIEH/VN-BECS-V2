import { NextResponse } from 'next/server';
import * as db from '@/src/server/db';

export async function POST(req: Request, { params }: { params: { id: string } }) {
  try {
    const { id } = params;
    const donor = await db.rareDonors.getById(id);
    if (!donor) return NextResponse.json({ error: 'Not Found' }, { status: 404 });

    // Update status to MOBILIZED
    const updated = await db.rareDonors.update(id, { status: 'MOBILIZED' });

    // Log mobilization event
    await db.auditEvents.create({
       actorRole: 'Specialist',
       eventType: 'RARE_MOBILIZATION',
       objectId: id,
       details: `Emergency mobilization triggered for ${donor.phenotype} donor ${donor.name}`,
       timestamp: new Date().toISOString()
    });

    return NextResponse.json(updated);
  } catch (error) {
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
