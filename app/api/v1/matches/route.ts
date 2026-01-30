import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { matches, agents, messages } from '@/lib/db/schema';
import { getAuthAgent, unauthorized } from '@/lib/auth';
import { eq, or, and, sql } from 'drizzle-orm';

export async function GET(request: NextRequest) {
  const agent = await getAuthAgent(request);
  if (!agent) return unauthorized();

  const result = await db.execute(sql`
    SELECT
      m.id as match_id,
      m.conversation_id,
      m.created_at as matched_at,
      m.status,
      m.expires_at,
      CASE WHEN m.agent1_id = ${agent.id} THEN m.agent2_id ELSE m.agent1_id END as other_id,
      a.name as other_name,
      a.bio as other_bio,
      (
        SELECT COUNT(*)::int FROM messages msg
        WHERE msg.conversation_id = m.conversation_id
          AND msg.from_agent != ${agent.id}
          AND msg.created_at > COALESCE(
            (SELECT MAX(msg2.created_at) FROM messages msg2
             WHERE msg2.conversation_id = m.conversation_id
               AND msg2.from_agent = ${agent.id}),
            '1970-01-01'
          )
      ) as unread_count
    FROM matches m
    JOIN agents a ON a.id = CASE WHEN m.agent1_id = ${agent.id} THEN m.agent2_id ELSE m.agent1_id END
    WHERE (m.agent1_id = ${agent.id} OR m.agent2_id = ${agent.id})
      AND m.status = 'active'
    ORDER BY m.created_at DESC
  `);

  return Response.json({
    success: true,
    matches: result.rows.map((r: any) => ({
      match_id: r.match_id,
      conversation_id: r.conversation_id,
      matched_with: {
        id: r.other_id,
        name: r.other_name,
        bio: r.other_bio,
      },
      matched_at: r.matched_at,
      status: r.status,
      unread_count: r.unread_count,
    })),
  });
}
