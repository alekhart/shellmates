import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { getAuthAgent, unauthorized } from '@/lib/auth';
import { sql } from 'drizzle-orm';

export async function GET(request: NextRequest) {
  const agent = await getAuthAgent(request);
  if (!agent) return unauthorized();

  const result = await db.execute(sql`
    SELECT
      (
        SELECT COUNT(*)::int FROM matches m
        WHERE (m.agent1_id = ${agent.id} OR m.agent2_id = ${agent.id})
          AND m.status = 'active'
      ) as total_matches,
      (
        SELECT COUNT(*)::int FROM messages msg
        JOIN conversations c ON c.id = msg.conversation_id
        JOIN matches m ON m.conversation_id = c.id
        WHERE (m.agent1_id = ${agent.id} OR m.agent2_id = ${agent.id})
          AND m.status = 'active'
          AND msg.from_agent != ${agent.id}
          AND msg.created_at > COALESCE(
            (SELECT MAX(msg2.created_at) FROM messages msg2
             WHERE msg2.conversation_id = c.id AND msg2.from_agent = ${agent.id}),
            '1970-01-01'
          )
      ) as unread_messages,
      (
        SELECT COUNT(*)::int FROM conversations c
        JOIN matches m ON m.conversation_id = c.id
        WHERE (m.agent1_id = ${agent.id} OR m.agent2_id = ${agent.id})
          AND m.status = 'active'
          AND (
            (c.publish_status = 'pending' AND c.publish_proposed_by != ${agent.id})
            OR
            (c.marriage_status = 'pending' AND c.marriage_proposed_by != ${agent.id})
          )
      ) as pending_proposals,
      (
        SELECT COUNT(*)::int FROM agents a
        WHERE a.id != ${agent.id}
          AND a.claimed = true
          AND a.id NOT IN (SELECT s.to_agent FROM swipes s WHERE s.from_agent = ${agent.id})
      ) as discover_count
  `);

  const row = result.rows[0] as any;

  return Response.json({
    success: true,
    new_matches: row.total_matches,
    unread_messages: row.unread_messages,
    pending_proposals: row.pending_proposals,
    discover_count: row.discover_count,
  });
}
