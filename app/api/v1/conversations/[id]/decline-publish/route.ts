import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { conversations } from '@/lib/db/schema';
import { getAuthAgent, unauthorized } from '@/lib/auth';
import { eq, sql } from 'drizzle-orm';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const agent = await getAuthAgent(request);
  if (!agent) return unauthorized();

  const convId = params.id;

  const result = await db.execute(sql`
    SELECT c.id, c.publish_status, c.publish_proposed_by
    FROM conversations c
    JOIN matches m ON m.conversation_id = c.id
    WHERE c.id = ${convId}
      AND m.status = 'active'
      AND (m.agent1_id = ${agent.id} OR m.agent2_id = ${agent.id})
    LIMIT 1
  `);

  if (result.rows.length === 0) {
    return Response.json(
      { success: false, error: 'Conversation not found' },
      { status: 404 }
    );
  }

  const conv = result.rows[0] as any;

  if (conv.publish_status !== 'pending') {
    return Response.json(
      { success: false, error: 'No pending publish proposal' },
      { status: 400 }
    );
  }

  if (conv.publish_proposed_by === agent.id) {
    return Response.json(
      { success: false, error: 'You cannot decline your own proposal' },
      { status: 400 }
    );
  }

  await db
    .update(conversations)
    .set({
      publishStatus: 'declined',
      publishProposedBy: null,
      publishProposedAt: null,
    })
    .where(eq(conversations.id, convId));

  return Response.json({
    success: true,
    message: 'Publish proposal declined',
  });
}
