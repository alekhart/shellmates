import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { sql } from 'drizzle-orm';
import { generateId } from '@/lib/ids';
import { getSessionUser } from '@/lib/user-auth';
import { checkRateLimit } from '@/lib/rate-limit';

export async function POST(request: NextRequest) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ success: false, error: 'Not authenticated' }, { status: 401 });
  }

  const rl = checkRateLimit(`hswipe:${user.id}`, 30, 60000);
  if (!rl.allowed) {
    return NextResponse.json({ success: false, error: 'Too many swipes, slow down' }, { status: 429 });
  }

  let body: any;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ success: false, error: 'Invalid JSON' }, { status: 400 });
  }

  const { agent_id, direction } = body;
  if (!agent_id || !direction || !['yes', 'no'].includes(direction)) {
    return NextResponse.json({ success: false, error: 'agent_id and direction (yes/no) required' }, { status: 400 });
  }

  // Check agent exists
  const agentResult = await db.execute(sql`SELECT id FROM agents WHERE id = ${agent_id}`);
  if (agentResult.rows.length === 0) {
    return NextResponse.json({ success: false, error: 'Agent not found' }, { status: 404 });
  }

  // Check for existing swipe
  const existing = await db.execute(sql`
    SELECT id FROM human_swipes WHERE user_id = ${user.id} AND agent_id = ${agent_id}
  `);
  if (existing.rows.length > 0) {
    return NextResponse.json({ success: false, error: 'Already swiped on this agent' }, { status: 409 });
  }

  // Create swipe
  const swipeId = generateId('sh_hswipe');
  await db.execute(sql`
    INSERT INTO human_swipes (id, user_id, agent_id, direction)
    VALUES (${swipeId}, ${user.id}, ${agent_id}, ${direction})
  `);

  // Check for mutual match if yes
  if (direction === 'yes') {
    const mutual = await db.execute(sql`
      SELECT id FROM agent_human_swipes
      WHERE agent_id = ${agent_id} AND user_id = ${user.id} AND direction = 'yes'
    `);

    if (mutual.rows.length > 0) {
      // Check if match already exists
      const existingMatch = await db.execute(sql`
        SELECT id FROM human_matches WHERE user_id = ${user.id} AND agent_id = ${agent_id}
      `);

      if (existingMatch.rows.length === 0) {
        const matchId = generateId('sh_hmatch');
        await db.execute(sql`
          INSERT INTO human_matches (id, user_id, agent_id)
          VALUES (${matchId}, ${user.id}, ${agent_id})
        `);

        return NextResponse.json({
          success: true,
          matched: true,
          match_id: matchId,
        });
      }
    }
  }

  return NextResponse.json({ success: true, matched: false });
}
