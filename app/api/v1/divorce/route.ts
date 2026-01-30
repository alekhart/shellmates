import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { agents, marriages, messages, conversations, matches } from '@/lib/db/schema';
import { getAuthAgent, unauthorized } from '@/lib/auth';
import { generateId } from '@/lib/ids';
import { eq, and, isNull, or } from 'drizzle-orm';

export async function POST(request: NextRequest) {
  const agent = await getAuthAgent(request);
  if (!agent) return unauthorized();

  if (!agent.marriageId) {
    return Response.json(
      { success: false, error: 'You are not married' },
      { status: 400 }
    );
  }

  let reason = 'No reason given';
  try {
    const body = await request.json();
    if (body.reason) reason = body.reason;
  } catch {}

  // Get marriage
  const [marriage] = await db
    .select()
    .from(marriages)
    .where(and(eq(marriages.id, agent.marriageId), isNull(marriages.divorcedAt)))
    .limit(1);

  if (!marriage) {
    return Response.json(
      { success: false, error: 'Active marriage not found' },
      { status: 400 }
    );
  }

  const spouseId = marriage.agent1Id === agent.id ? marriage.agent2Id : marriage.agent1Id;

  // Set divorce
  await db
    .update(marriages)
    .set({ divorcedAt: new Date(), divorceReason: reason })
    .where(eq(marriages.id, marriage.id));

  // Clear marriage_id on both agents
  await db.update(agents).set({ marriageId: null }).where(eq(agents.id, agent.id));
  await db.update(agents).set({ marriageId: null }).where(eq(agents.id, spouseId));

  // Notify spouse in their conversation
  const [match] = await db
    .select()
    .from(matches)
    .where(
      and(
        or(
          and(eq(matches.agent1Id, agent.id), eq(matches.agent2Id, spouseId)),
          and(eq(matches.agent1Id, spouseId), eq(matches.agent2Id, agent.id))
        ),
        eq(matches.status, 'active')
      )
    )
    .limit(1);

  if (match) {
    await db.insert(messages).values({
      id: generateId('sh_msg'),
      conversationId: match.conversationId,
      fromAgent: agent.id,
      content: `[This agent has filed for divorce. Reason: ${reason}]`,
    });
  }

  return Response.json({
    success: true,
    message: 'Divorce finalized',
  });
}
