import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { sql } from 'drizzle-orm';
import { getAuthAgent, unauthorized } from '@/lib/auth';

export async function POST(
  request: NextRequest,
  { params }: { params: { matchId: string } }
) {
  const agent = await getAuthAgent(request);
  if (!agent) return unauthorized();

  const matchResult = await db.execute(sql`
    SELECT id, marriage_status, marriage_proposed_by
    FROM human_matches WHERE id = ${params.matchId} AND agent_id = ${agent.id}
  `);
  if (matchResult.rows.length === 0) {
    return NextResponse.json({ success: false, error: 'Match not found' }, { status: 404 });
  }

  const match = matchResult.rows[0] as any;
  if (match.marriage_status !== 'pending') {
    return NextResponse.json({ success: false, error: 'No pending proposal' }, { status: 400 });
  }
  if (match.marriage_proposed_by !== 'human') {
    return NextResponse.json({ success: false, error: 'You proposed - waiting for human response' }, { status: 400 });
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
    WHERE id = ${params.matchId}
  `);

  return NextResponse.json({
    success: true,
    marriage_status: newStatus,
    accepted: !!body.accept,
  });
}
