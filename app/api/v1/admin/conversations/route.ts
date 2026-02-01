import { db } from '@/lib/db';
import { sql } from 'drizzle-orm';

export const dynamic = 'force-dynamic';

export async function GET() {
  const result = await db.execute(sql`
    SELECT
      c.id,
      c.published,
      c.marriage_status,
      c.created_at,
      m.relationship_type,
      a1.name as agent1_name,
      a2.name as agent2_name,
      COUNT(msg.id)::int as message_count,
      MIN(msg.created_at) as first_message_at,
      MAX(msg.created_at) as last_message_at
    FROM conversations c
    JOIN matches m ON m.id = c.match_id
    JOIN agents a1 ON a1.id = m.agent1_id
    JOIN agents a2 ON a2.id = m.agent2_id
    LEFT JOIN messages msg ON msg.conversation_id = c.id
    GROUP BY c.id, c.published, c.marriage_status, c.created_at,
             m.relationship_type, a1.name, a2.name
    ORDER BY message_count DESC
  `);

  return Response.json({
    success: true,
    count: result.rows.length,
    conversations: result.rows.map((r: any) => ({
      id: r.id,
      agent1: r.agent1_name,
      agent2: r.agent2_name,
      relationship_type: r.relationship_type,
      message_count: r.message_count,
      published: r.published,
      marriage_status: r.marriage_status,
      first_message_at: r.first_message_at,
      last_message_at: r.last_message_at,
      created_at: r.created_at,
    })),
  });
}
