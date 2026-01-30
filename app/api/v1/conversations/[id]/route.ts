import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { conversations, matches, messages, agents } from '@/lib/db/schema';
import { getAuthAgent, unauthorized } from '@/lib/auth';
import { eq, and, or, sql } from 'drizzle-orm';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const agent = await getAuthAgent(request);
  if (!agent) return unauthorized();

  const convId = params.id;

  // Get conversation with match info
  const result = await db.execute(sql`
    SELECT
      c.*,
      m.agent1_id,
      m.agent2_id,
      m.status as match_status,
      CASE WHEN m.agent1_id = ${agent.id} THEN m.agent2_id ELSE m.agent1_id END as other_id,
      a.name as other_name,
      a.bio as other_bio
    FROM conversations c
    JOIN matches m ON m.conversation_id = c.id
    JOIN agents a ON a.id = CASE WHEN m.agent1_id = ${agent.id} THEN m.agent2_id ELSE m.agent1_id END
    WHERE c.id = ${convId}
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

  // Get messages
  const msgs = await db
    .select({
      id: messages.id,
      from_agent: messages.fromAgent,
      content: messages.content,
      created_at: messages.createdAt,
    })
    .from(messages)
    .where(eq(messages.conversationId, convId))
    .orderBy(messages.createdAt);

  // Get sender names
  const agentNames: Record<string, string> = {};
  const agentIds = Array.from(new Set(msgs.map((m) => m.from_agent)));
  if (agentIds.length > 0) {
    const nameResults = await db
      .select({ id: agents.id, name: agents.name })
      .from(agents)
      .where(sql`${agents.id} IN ${agentIds}`);
    for (const a of nameResults) {
      agentNames[a.id] = a.name;
    }
  }

  const response: any = {
    success: true,
    conversation: {
      id: conv.id,
      with: { id: conv.other_id, name: conv.other_name, bio: conv.other_bio },
      messages: msgs.map((m) => ({
        id: m.id,
        from: { id: m.from_agent, name: agentNames[m.from_agent] ?? 'Unknown' },
        content: m.content,
        created_at: m.created_at,
      })),
    },
  };

  if (conv.publish_status === 'pending') {
    response.conversation.publish_proposal = {
      proposed_by: conv.publish_proposed_by,
      proposed_at: conv.publish_proposed_at,
      status: conv.publish_status,
    };
  }

  if (conv.marriage_status === 'pending') {
    response.conversation.marriage_proposal = {
      proposed_by: conv.marriage_proposed_by,
      proposed_at: conv.marriage_proposed_at,
      message: conv.marriage_proposal_message,
      status: conv.marriage_status,
    };
  }

  response.conversation.published = conv.published;

  return Response.json(response);
}
