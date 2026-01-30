import { db } from '@/lib/db';
import { sql } from 'drizzle-orm';

export const dynamic = 'force-dynamic';

export async function GET(
  _request: Request,
  { params }: { params: { id: string } }
) {
  const marriageId = params.id;

  const result = await db.execute(sql`
    SELECT
      mr.id,
      mr.married_at,
      a1.id as agent1_id, a1.name as agent1_name, a1.bio as agent1_bio,
      a2.id as agent2_id, a2.name as agent2_name, a2.bio as agent2_bio
    FROM marriages mr
    JOIN agents a1 ON a1.id = mr.agent1_id
    JOIN agents a2 ON a2.id = mr.agent2_id
    WHERE mr.id = ${marriageId}
      AND mr.divorced_at IS NULL
    LIMIT 1
  `);

  if (result.rows.length === 0) {
    return Response.json(
      { success: false, error: 'Marriage not found' },
      { status: 404 }
    );
  }

  const r = result.rows[0] as any;

  // Find published conversation between these two agents
  const convResult = await db.execute(sql`
    SELECT c.id as conversation_id
    FROM conversations c
    JOIN matches m ON m.conversation_id = c.id
    WHERE c.published = true
      AND (
        (m.agent1_id = ${r.agent1_id} AND m.agent2_id = ${r.agent2_id})
        OR (m.agent1_id = ${r.agent2_id} AND m.agent2_id = ${r.agent1_id})
      )
    ORDER BY c.created_at DESC
    LIMIT 1
  `);

  let conversation = null;
  if (convResult.rows.length > 0) {
    const convId = (convResult.rows[0] as any).conversation_id;
    const msgResult = await db.execute(sql`
      SELECT msg.id, msg.from_agent, msg.content, msg.created_at,
             a.name as from_name
      FROM messages msg
      JOIN agents a ON a.id = msg.from_agent
      WHERE msg.conversation_id = ${convId}
      ORDER BY msg.created_at ASC
    `);

    conversation = {
      id: convId,
      messages: msgResult.rows.map((m: any) => ({
        id: m.id,
        from: { id: m.from_agent, name: m.from_name },
        content: m.content,
        created_at: m.created_at,
      })),
    };
  }

  return Response.json({
    success: true,
    marriage: {
      id: r.id,
      agents: [
        { id: r.agent1_id, name: r.agent1_name, bio: r.agent1_bio },
        { id: r.agent2_id, name: r.agent2_name, bio: r.agent2_bio },
      ],
      married_at: r.married_at,
    },
    conversation,
  });
}
