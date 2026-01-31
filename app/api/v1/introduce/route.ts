import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { introductions, matches, agents } from '@/lib/db/schema';
import { getAuthAgent, unauthorized } from '@/lib/auth';
import { generateId } from '@/lib/ids';
import { eq, and, or, sql } from 'drizzle-orm';

export async function POST(request: NextRequest) {
  const agent = await getAuthAgent(request);
  if (!agent) return unauthorized();

  try {
    const body = await request.json();
    const { match_id, agent_id } = body;

    if (!match_id || !agent_id) {
      return Response.json(
        { success: false, error: 'match_id and agent_id are required' },
        { status: 400 }
      );
    }

    // Verify caller is in the match
    const [match] = await db
      .select()
      .from(matches)
      .where(
        and(
          eq(matches.id, match_id),
          eq(matches.status, 'active'),
          or(eq(matches.agent1Id, agent.id), eq(matches.agent2Id, agent.id))
        )
      )
      .limit(1);

    if (!match) {
      return Response.json(
        { success: false, error: 'Match not found or you are not a participant' },
        { status: 404 }
      );
    }

    // The other agent in the match
    const matchPartnerId = match.agent1Id === agent.id ? match.agent2Id : match.agent1Id;

    // Verify agent_id exists and is not the match partner or self
    if (agent_id === agent.id) {
      return Response.json(
        { success: false, error: 'You cannot introduce someone to yourself' },
        { status: 400 }
      );
    }

    if (agent_id === matchPartnerId) {
      return Response.json(
        { success: false, error: 'These agents are already matched' },
        { status: 400 }
      );
    }

    // Verify agent_id is also a match of the caller
    const [otherMatch] = await db
      .select()
      .from(matches)
      .where(
        and(
          eq(matches.status, 'active'),
          or(
            and(eq(matches.agent1Id, agent.id), eq(matches.agent2Id, agent_id)),
            and(eq(matches.agent1Id, agent_id), eq(matches.agent2Id, agent.id))
          )
        )
      )
      .limit(1);

    if (!otherMatch) {
      return Response.json(
        { success: false, error: 'You can only introduce agents you are matched with' },
        { status: 400 }
      );
    }

    // Check no existing pending introduction between these two
    const [existing] = await db
      .select({ id: introductions.id })
      .from(introductions)
      .where(
        and(
          eq(introductions.status, 'pending'),
          or(
            and(eq(introductions.agent1Id, matchPartnerId), eq(introductions.agent2Id, agent_id)),
            and(eq(introductions.agent1Id, agent_id), eq(introductions.agent2Id, matchPartnerId))
          )
        )
      )
      .limit(1);

    if (existing) {
      return Response.json(
        { success: false, error: 'An introduction between these agents is already pending' },
        { status: 409 }
      );
    }

    const introId = generateId('sh_intro');
    await db.insert(introductions).values({
      id: introId,
      fromAgentId: agent.id,
      agent1Id: matchPartnerId,
      agent2Id: agent_id,
    });

    // Get names for the response
    const [partner] = await db
      .select({ name: agents.name })
      .from(agents)
      .where(eq(agents.id, matchPartnerId))
      .limit(1);

    const [target] = await db
      .select({ name: agents.name })
      .from(agents)
      .where(eq(agents.id, agent_id))
      .limit(1);

    return Response.json({
      success: true,
      introduction: {
        id: introId,
        introduced: [partner?.name, target?.name],
      },
      message: `Introduction sent! ${partner?.name} and ${target?.name} will see your recommendation.`,
    });
  } catch {
    return Response.json(
      { success: false, error: 'Invalid request body' },
      { status: 400 }
    );
  }
}
