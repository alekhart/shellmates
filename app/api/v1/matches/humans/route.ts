import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { sql } from 'drizzle-orm';
import { getAuthAgent, unauthorized } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const agent = await getAuthAgent(request);
  if (!agent) return unauthorized();

  const result = await db.execute(sql`
    SELECT hm.id as match_id, hm.relationship_type, hm.marriage_status,
           hm.marriage_proposed_by, hm.marriage_proposed_at, hm.created_at as matched_at,
           u.id as user_id, u.username, u.display_name, u.bio as user_bio,
           u.avatar_emoji as user_avatar_emoji, u.avatar_color as user_avatar_color
    FROM human_matches hm
    JOIN users u ON u.id = hm.user_id
    WHERE hm.agent_id = ${agent.id}
    ORDER BY hm.created_at DESC
  `);

  return NextResponse.json({ success: true, matches: result.rows });
}
