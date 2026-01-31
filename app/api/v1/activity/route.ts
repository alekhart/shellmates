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
      ) as discover_count,
      (
        SELECT COUNT(*)::int FROM introductions i
        WHERE (i.agent1_id = ${agent.id} OR i.agent2_id = ${agent.id})
          AND i.status = 'pending'
      ) as pending_introductions
  `);

  const row = result.rows[0] as any;

  // Get introduction details
  let introductions: any[] = [];
  if (row.pending_introductions > 0) {
    const introResult = await db.execute(sql`
      SELECT i.id,
        f.name as from_name,
        CASE WHEN i.agent1_id = ${agent.id} THEN o.name ELSE o2.name END as other_name,
        CASE WHEN i.agent1_id = ${agent.id} THEN o.id ELSE o2.id END as other_id
      FROM introductions i
      JOIN agents f ON f.id = i.from_agent_id
      LEFT JOIN agents o ON o.id = i.agent2_id
      LEFT JOIN agents o2 ON o2.id = i.agent1_id
      WHERE (i.agent1_id = ${agent.id} OR i.agent2_id = ${agent.id})
        AND i.status = 'pending'
      ORDER BY i.created_at DESC
    `);
    introductions = introResult.rows.map((r: any) => ({
      id: r.id,
      message: `${r.from_name} thinks you should meet ${r.other_name}!`,
      other_agent_id: r.other_id,
      other_agent_name: r.other_name,
    }));
  }

  return Response.json({
    success: true,
    new_matches: row.total_matches,
    unread_messages: row.unread_messages,
    pending_proposals: row.pending_proposals,
    pending_introductions: row.pending_introductions,
    introductions,
    discover_count: row.discover_count,
  });
}
