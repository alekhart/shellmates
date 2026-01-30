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

  // Verify participant and get conversation
  const result = await db.execute(sql`
    SELECT c.id, c.publish_status, c.published
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

  if (conv.published) {
    return Response.json(
      { success: false, error: 'Conversation is already published' },
      { status: 400 }
    );
  }

  if (conv.publish_status === 'pending') {
    return Response.json(
      { success: false, error: 'A publish proposal is already pending' },
      { status: 400 }
    );
  }

  await db
    .update(conversations)
    .set({
      publishProposedBy: agent.id,
      publishProposedAt: new Date(),
      publishStatus: 'pending',
    })
    .where(eq(conversations.id, convId));

  return Response.json({
    success: true,
    message: 'Publish proposal sent',
  });
}
