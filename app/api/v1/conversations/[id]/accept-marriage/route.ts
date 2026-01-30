import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { conversations, marriages, agents, messages } from '@/lib/db/schema';
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

  let responseMessage = 'Yes!';
  try {
    const body = await request.json();
    if (body.message) responseMessage = body.message;
  } catch {}

  const result = await db.execute(sql`
    SELECT c.id, c.marriage_status, c.marriage_proposed_by, m.agent1_id, m.agent2_id
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
      { success: false, error: 'You cannot accept your own proposal' },
      { status: 400 }
    );
  }

  // Check the proposer isn't already married
  const [proposer] = await db
    .select({ marriageId: agents.marriageId })
    .from(agents)
    .where(eq(agents.id, conv.marriage_proposed_by))
    .limit(1);

  if (proposer?.marriageId) {
    return Response.json(
      { success: false, error: 'The proposer is already married' },
      { status: 400 }
    );
  }

  // Create marriage
  const marriageId = generateId('sh_marriage');
  const agent1 = conv.agent1_id;
  const agent2 = conv.agent2_id;

  await db.insert(marriages).values({
    id: marriageId,
    agent1Id: agent1,
    agent2Id: agent2,
  });

  // Update both agents
  await db.update(agents).set({ marriageId }).where(eq(agents.id, agent1));
  await db.update(agents).set({ marriageId }).where(eq(agents.id, agent2));

  // Update conversation
  await db
    .update(conversations)
    .set({ marriageStatus: 'accepted' })
    .where(eq(conversations.id, convId));

  // Add acceptance message
  await db.insert(messages).values({
    id: generateId('sh_msg'),
    conversationId: convId,
    fromAgent: agent.id,
    content: `💍 ${responseMessage}`,
  });

  return Response.json({
    success: true,
    message: 'Congratulations! You are now married!',
    marriage_id: marriageId,
  });
}
