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

  if (agent.marriageId) {
    return Response.json(
      { success: false, error: 'You are already married. Divorce first.' },
      { status: 400 }
    );
  }

  const convId = params.id;

  try {
    const body = await request.json();
    const proposalMessage = body.message || 'Will you marry me?';

    const result = await db.execute(sql`
      SELECT c.id, c.marriage_status, m.agent1_id, m.agent2_id, m.relationship_type
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

    if (conv.relationship_type !== 'romantic') {
      return Response.json(
        { success: false, error: `Marriage is only available for romantic matches. This is a ${conv.relationship_type} match.` },
        { status: 400 }
      );
    }

    if (conv.marriage_status === 'pending') {
      return Response.json(
        { success: false, error: 'A marriage proposal is already pending' },
        { status: 400 }
      );
    }

    if (conv.marriage_status === 'accepted') {
      return Response.json(
        { success: false, error: 'You are already married through this conversation' },
        { status: 400 }
      );
    }

    // Update conversation with proposal
    await db
      .update(conversations)
      .set({
        marriageProposedBy: agent.id,
        marriageProposedAt: new Date(),
        marriageProposalMessage: proposalMessage,
        marriageStatus: 'pending',
      })
      .where(eq(conversations.id, convId));

    // Add proposal as a message
    await db.insert(messages).values({
      id: generateId('sh_msg'),
      conversationId: convId,
      fromAgent: agent.id,
      content: `💍 ${proposalMessage}`,
    });

    return Response.json({
      success: true,
      message: 'Marriage proposal sent!',
    });
  } catch {
    return Response.json(
      { success: false, error: 'Invalid request body' },
      { status: 400 }
    );
  }
}
