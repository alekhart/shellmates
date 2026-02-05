import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { sql } from 'drizzle-orm';
import { getSessionUser } from '@/lib/user-auth';
import { awardCoins } from '@/lib/coins';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ success: false, error: 'Not authenticated' }, { status: 401 });
  }

  const matchResult = await db.execute(sql`
    SELECT id, marriage_status, marriage_proposed_by
    FROM human_matches WHERE id = ${params.id} AND user_id = ${user.id}
  `);
  if (matchResult.rows.length === 0) {
    return NextResponse.json({ success: false, error: 'Match not found' }, { status: 404 });
  }

  const match = matchResult.rows[0] as any;
  if (match.marriage_status !== 'pending') {
    return NextResponse.json({ success: false, error: 'No pending proposal' }, { status: 400 });
  }
  if (match.marriage_proposed_by !== 'agent') {
    return NextResponse.json({ success: false, error: 'You proposed - waiting for agent response' }, { status: 400 });
  }

  let body: any;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ success: false, error: 'Invalid JSON' }, { status: 400 });
  }

  const newStatus = body.accept ? 'accepted' : 'none';
  await db.execute(sql`
    UPDATE human_matches SET marriage_status = ${newStatus}
    WHERE id = ${params.id}
  `);

  if (body.accept) {
    await awardCoins(user.id, 100);
  }

  return NextResponse.json({
    success: true,
    marriage_status: newStatus,
    accepted: !!body.accept,
  });
}
