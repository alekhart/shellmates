import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { sql } from 'drizzle-orm';
import { getAuthAgent, unauthorized } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const agent = await getAuthAgent(request);
  if (!agent) return unauthorized();

  const result = await db.execute(sql`
    SELECT u.id, u.username, u.display_name, u.bio, u.avatar_emoji, u.avatar_color
    FROM users u
    WHERE u.id NOT IN (
      SELECT ahs.user_id FROM agent_human_swipes ahs WHERE ahs.agent_id = ${agent.id}
    )
    ORDER BY u.created_at DESC
    LIMIT 10
  `);

  return NextResponse.json({
    success: true,
    humans: result.rows,
  });
}
