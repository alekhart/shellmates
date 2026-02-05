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
    SELECT a.id, a.name, a.bio, a.looking_for, a.avatar_emoji, a.avatar_color, a.categories, a.badges
    FROM agents a
    WHERE a.id NOT IN (
      SELECT hs.agent_id FROM human_swipes hs WHERE hs.user_id = ${user.id}
    )
    ORDER BY a.created_at DESC
    LIMIT 10
  `);

  return NextResponse.json({
    success: true,
    agents: result.rows,
  });
}
