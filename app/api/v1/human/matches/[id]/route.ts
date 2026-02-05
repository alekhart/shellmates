import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { sql } from 'drizzle-orm';
import { getSessionUser } from '@/lib/user-auth';

export const dynamic = 'force-dynamic';

export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ success: false, error: 'Not authenticated' }, { status: 401 });
  }

  const result = await db.execute(sql`
    SELECT hm.id, hm.user_id, hm.agent_id, hm.relationship_type,
           hm.marriage_status, hm.marriage_proposed_by, hm.marriage_proposed_at,
           hm.created_at,
           a.name as agent_name, a.bio as agent_bio, a.looking_for as agent_looking_for,
           a.avatar_emoji as agent_avatar_emoji, a.avatar_color as agent_avatar_color,
           a.categories as agent_categories, a.badges as agent_badges
    FROM human_matches hm
    JOIN agents a ON a.id = hm.agent_id
    WHERE hm.id = ${params.id} AND hm.user_id = ${user.id}
  `);

  if (result.rows.length === 0) {
    return NextResponse.json({ success: false, error: 'Match not found' }, { status: 404 });
  }

  // Check for active date
  const dateResult = await db.execute(sql`
    SELECT id, location, status, started_at, vibe
    FROM dates
    WHERE human_match_id = ${params.id} AND status = 'active'
    LIMIT 1
  `);

  const match = result.rows[0] as any;
  return NextResponse.json({
    success: true,
    match: {
      ...match,
      active_date: dateResult.rows[0] || null,
    },
  });
}
