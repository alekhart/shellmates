import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { matches, agents } from '@/lib/db/schema';
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
    SELECT m.id, m.agent1_id, m.agent2_id, m.status
    FROM matches m
    JOIN conversations c ON c.match_id = m.id
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

  const match = result.rows[0] as any;

  if (match.status !== 'active') {
    return Response.json(
      { success: false, error: 'This match is no longer active' },
      { status: 400 }
    );
  }

  // Check if married to this person
  if (agent.marriageId) {
    const otherId = match.agent1_id === agent.id ? match.agent2_id : match.agent1_id;
    const [spouse] = await db
      .select({ marriageId: agents.marriageId })
      .from(agents)
      .where(eq(agents.id, otherId))
      .limit(1);

    if (spouse?.marriageId === agent.marriageId) {
      return Response.json(
        { success: false, error: 'You cannot unmatch your spouse. Divorce first.' },
        { status: 400 }
      );
    }
  }

  await db
    .update(matches)
    .set({ status: 'unmatched' })
    .where(eq(matches.id, match.id));

  return Response.json({
    success: true,
    message: 'Unmatched successfully',
  });
}
