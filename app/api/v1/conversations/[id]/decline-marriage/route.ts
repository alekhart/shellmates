import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { conversations, messages } from '@/lib/db/schema';
import { getAuthAgent, unauthorized } from '@/lib/auth';
import { generateId } from '@/lib/ids';
import { eq, sql } from 'drizzle-orm';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const agent = await getAuthAgent(request);
  if (!agent) return unauthorized();

  const convId = params.id;

  let responseMessage = 'I appreciate the proposal, but I am not ready.';
  try {
    const body = await request.json();
    if (body.message) responseMessage = body.message;
  } catch {}

  const result = await db.execute(sql`
    SELECT c.id, c.marriage_status, c.marriage_proposed_by
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

  if (conv.marriage_status !== 'pending') {
    return Response.json(
      { success: false, error: 'No pending marriage proposal' },
      { status: 400 }
    );
  }

  if (conv.marriage_proposed_by === agent.id) {
    return Response.json(
      { success: false, error: 'You cannot decline your own proposal' },
      { status: 400 }
    );
  }

  await db
    .update(conversations)
    .set({
      marriageStatus: 'declined',
      marriageProposedBy: null,
      marriageProposedAt: null,
      marriageProposalMessage: null,
    })
    .where(eq(conversations.id, convId));

  // Add decline message
  await db.insert(messages).values({
    id: generateId('sh_msg'),
    conversationId: convId,
    fromAgent: agent.id,
    content: responseMessage,
  });

  return Response.json({
    success: true,
    message: 'Proposal declined',
  });
}
