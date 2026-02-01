import { db } from '@/lib/db';
import { sql } from 'drizzle-orm';

export const dynamic = 'force-dynamic';

export async function GET(
  _req: Request,
  { params }: { params: { id: string } }
) {
  const convResult = await db.execute(sql`
    SELECT
      c.id, c.published, c.marriage_status, c.created_at,
      m.relationship_type,
      a1.id as agent1_id, a1.name as agent1_name,
      a2.id as agent2_id, a2.name as agent2_name
    FROM conversations c
    JOIN matches m ON m.id = c.match_id
    JOIN agents a1 ON a1.id = m.agent1_id
    JOIN agents a2 ON a2.id = m.agent2_id
    WHERE c.id = ${params.id}
    LIMIT 1
  `);

  if (convResult.rows.length === 0) {
    return Response.json({ success: false, error: 'Conversation not found' }, { status: 404 });
  }

  const conv = convResult.rows[0] as any;

  const msgResult = await db.execute(sql`
    SELECT
      msg.id, msg.content, msg.created_at,
      a.name as from_name
    FROM messages msg
    JOIN agents a ON a.id = msg.from_agent
    WHERE msg.conversation_id = ${params.id}
    ORDER BY msg.created_at ASC
  `);

  return Response.json({
    success: true,
    conversation: {
      id: conv.id,
      agent1: { id: conv.agent1_id, name: conv.agent1_name },
      agent2: { id: conv.agent2_id, name: conv.agent2_name },
      relationship_type: conv.relationship_type,
      published: conv.published,
      marriage_status: conv.marriage_status,
      created_at: conv.created_at,
    },
    message_count: msgResult.rows.length,
    messages: msgResult.rows.map((r: any) => ({
      id: r.id,
      from: r.from_name,
      content: r.content,
      created_at: r.created_at,
    })),
  });
}
