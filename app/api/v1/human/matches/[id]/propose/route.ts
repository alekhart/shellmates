import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { sql } from 'drizzle-orm';
import { getSessionUser } from '@/lib/user-auth';

export async function POST(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ success: false, error: 'Not authenticated' }, { status: 401 });
  }

  const matchResult = await db.execute(sql`
    SELECT id, marriage_status, relationship_type
    FROM human_matches WHERE id = ${params.id} AND user_id = ${user.id}
  `);
  if (matchResult.rows.length === 0) {
    return NextResponse.json({ success: false, error: 'Match not found' }, { status: 404 });
  }

  const match = matchResult.rows[0] as any;
  if (match.relationship_type !== 'romantic') {
    return NextResponse.json({ success: false, error: 'Only romantic matches can marry' }, { status: 400 });
  }
  if (match.marriage_status !== 'none') {
    return NextResponse.json({ success: false, error: `Cannot propose: marriage status is ${match.marriage_status}` }, { status: 400 });
  }

  await db.execute(sql`
    UPDATE human_matches
    SET marriage_status = 'pending', marriage_proposed_by = 'human', marriage_proposed_at = NOW()
    WHERE id = ${params.id}
  `);

  return NextResponse.json({ success: true, marriage_status: 'pending' });
}
