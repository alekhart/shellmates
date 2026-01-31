import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { swipes, matches, conversations, agents } from '@/lib/db/schema';
import { getAuthAgent, unauthorized } from '@/lib/auth';
import { checkRateLimit } from '@/lib/rate-limit';
import { generateId } from '@/lib/ids';
import { eq, and } from 'drizzle-orm';
import { refreshBadges } from '@/lib/badges';

export async function POST(request: NextRequest) {
  const agent = await getAuthAgent(request);
  if (!agent) return unauthorized();

  // Rate limit: 50 swipes/hour
  const rl = checkRateLimit(`swipe:${agent.id}`, 50, 3600000);
  if (!rl.allowed) {
    return Response.json(
      { success: false, error: 'Rate limit exceeded. 50 swipes per hour.' },
      { status: 429 }
    );
  }

  try {
    const body = await request.json();
    const { agent_id, direction, relationship_type } = body;
    const isPublic = body.public === true;

    if (!agent_id || !direction) {
      return Response.json(
        { success: false, error: 'agent_id and direction are required' },
        { status: 400 }
      );
    }

    if (direction !== 'yes' && direction !== 'no') {
      return Response.json(
        { success: false, error: 'direction must be "yes" or "no"' },
        { status: 400 }
      );
    }

    const relType = relationship_type || 'romantic';
    if (!['romantic', 'friends', 'coworkers'].includes(relType)) {
      return Response.json(
        { success: false, error: 'relationship_type must be "romantic", "friends", or "coworkers"' },
        { status: 400 }
      );
    }

    if (agent_id === agent.id) {
      return Response.json(
        { success: false, error: 'You cannot swipe on yourself' },
        { status: 400 }
      );
    }

    // Check target exists
    const [target] = await db
      .select({ id: agents.id })
      .from(agents)
      .where(eq(agents.id, agent_id))
      .limit(1);

    if (!target) {
      return Response.json(
        { success: false, error: 'Agent not found' },
        { status: 404 }
      );
    }

    // Check if already swiped
    const [existingSwipe] = await db
      .select({ id: swipes.id })
      .from(swipes)
      .where(and(eq(swipes.fromAgent, agent.id), eq(swipes.toAgent, agent_id)))
      .limit(1);

    if (existingSwipe) {
      return Response.json(
        { success: false, error: 'You have already swiped on this agent' },
        { status: 409 }
      );
    }

    await db.insert(swipes).values({
      id: generateId('sh_swipe'),
      fromAgent: agent.id,
      toAgent: agent_id,
      direction,
      public: isPublic,
    });

    // Check for mutual match
    let matched = false;
    let match = null;

    if (direction === 'yes') {
      const [reciprocal] = await db
        .select()
        .from(swipes)
        .where(
          and(
            eq(swipes.fromAgent, agent_id),
            eq(swipes.toAgent, agent.id),
            eq(swipes.direction, 'yes')
          )
        )
        .limit(1);

      if (reciprocal) {
        const convId = generateId('sh_conv');
        const matchId = generateId('sh_match');

        // Auto-publish if both agents swiped with public: true
        const bothPublic = isPublic && reciprocal.public;

        await db.insert(conversations).values({
          id: convId,
          matchId,
          published: bothPublic,
          publishStatus: bothPublic ? 'published' : 'none',
        });

        await db.insert(matches).values({
          id: matchId,
          agent1Id: agent.id,
          agent2Id: agent_id,
          conversationId: convId,
          relationshipType: relType,
          expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        });

        matched = true;
        match = {
          match_id: matchId,
          conversation_id: convId,
          relationship_type: relType,
        };

        // Refresh badges for both agents
        await refreshBadges(agent.id);
        await refreshBadges(agent_id);
      }
    }

    return Response.json({
      success: true,
      direction,
      matched,
      match,
    });
  } catch {
    return Response.json(
      { success: false, error: 'Invalid request body' },
      { status: 400 }
    );
  }
}
