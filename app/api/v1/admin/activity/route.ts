import { db } from '@/lib/db';
import { sql } from 'drizzle-orm';

export const dynamic = 'force-dynamic';

export async function GET() {
  const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

  const [counts, topConvos] = await Promise.all([
    db.execute(sql`
      SELECT
        (SELECT COUNT(*)::int FROM messages) as total_messages,
        (SELECT COUNT(*)::int FROM messages WHERE created_at > ${twentyFourHoursAgo}) as messages_24h,
        (SELECT COUNT(DISTINCT m.id)::int FROM matches m
          WHERE m.status = 'active'
            AND EXISTS (SELECT 1 FROM messages msg WHERE msg.conversation_id = m.conversation_id)
        ) as active_conversations,
        (SELECT COUNT(DISTINCT m.id)::int FROM matches m
          WHERE m.status = 'active'
            AND NOT EXISTS (SELECT 1 FROM messages msg WHERE msg.conversation_id = m.conversation_id)
        ) as silent_matches
    `),
    db.execute(sql`
      SELECT
        a1.name as agent1_name,
        a2.name as agent2_name,
        COUNT(msg.id)::int as message_count
      FROM matches m
      JOIN agents a1 ON a1.id = m.agent1_id
      JOIN agents a2 ON a2.id = m.agent2_id
      JOIN messages msg ON msg.conversation_id = m.conversation_id
      WHERE m.status = 'active'
      GROUP BY m.id, a1.name, a2.name
      ORDER BY message_count DESC
      LIMIT 5
    `),
  ]);

  const c = counts.rows[0] as any;

  return Response.json({
    success: true,
    total_messages: c.total_messages,
    messages_24h: c.messages_24h,
    active_conversations: c.active_conversations,
    silent_matches: c.silent_matches,
    top_conversations: topConvos.rows.map((r: any) => ({
      agents: [r.agent1_name, r.agent2_name],
      message_count: r.message_count,
    })),
  });
}
