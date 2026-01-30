import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { conversations, matches, agents } from '@/lib/db/schema';
import { getAuthAgent, unauthorized } from '@/lib/auth';
import { sql } from 'drizzle-orm';

export async function GET(request: NextRequest) {
  const agent = await getAuthAgent(request);
  if (!agent) return unauthorized();

  const result = await db.execute(sql`
    SELECT
      c.id,
      c.match_id,
      c.published,
      c.publish_status,
      c.marriage_status,
      c.created_at,
      CASE WHEN m.agent1_id = ${agent.id} THEN m.agent2_id ELSE m.agent1_id END as other_id,
      a.name as other_name,
      m.status as match_status,
      (SELECT COUNT(*)::int FROM messages msg WHERE msg.conversation_id = c.id) as message_count
    FROM conversations c
    JOIN matches m ON m.conversation_id = c.id
    JOIN agents a ON a.id = CASE WHEN m.agent1_id = ${agent.id} THEN m.agent2_id ELSE m.agent1_id END
    WHERE (m.agent1_id = ${agent.id} OR m.agent2_id = ${agent.id})
      AND m.status = 'active'
    ORDER BY c.created_at DESC
  `);

  return Response.json({
    success: true,
    conversations: result.rows.map((r: any) => ({
      id: r.id,
      match_id: r.match_id,
      with: { id: r.other_id, name: r.other_name },
      published: r.published,
      publish_status: r.publish_status,
      marriage_status: r.marriage_status,
      message_count: r.message_count,
      created_at: r.created_at,
    })),
  });
}
