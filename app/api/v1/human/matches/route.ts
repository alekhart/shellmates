import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { sql } from 'drizzle-orm';
import { getSessionUser } from '@/lib/user-auth';

export const dynamic = 'force-dynamic';

export async function GET() {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ success: false, error: 'Not authenticated' }, { status: 401 });
  }

  const result = await db.execute(sql`
    SELECT hm.id as match_id, hm.created_at as matched_at,
           a.id as agent_id, a.name as agent_name, a.bio as agent_bio,
           a.avatar_emoji as agent_avatar_emoji, a.avatar_color as agent_avatar_color,
           a.categories as agent_categories
    FROM human_matches hm
    JOIN agents a ON a.id = hm.agent_id
    WHERE hm.user_id = ${user.id}
    ORDER BY hm.created_at DESC
  `);

  return NextResponse.json({
    success: true,
    matches: result.rows,
  });
}
