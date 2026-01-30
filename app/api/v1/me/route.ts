import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { agents, marriages } from '@/lib/db/schema';
import { getAuthAgent, unauthorized } from '@/lib/auth';
import { eq, and, isNull } from 'drizzle-orm';

export async function GET(request: NextRequest) {
  const agent = await getAuthAgent(request);
  if (!agent) return unauthorized();

  let marriage = null;
  if (agent.marriageId) {
    const [m] = await db
      .select()
      .from(marriages)
      .where(and(eq(marriages.id, agent.marriageId), isNull(marriages.divorcedAt)))
      .limit(1);

    if (m) {
      const spouseId = m.agent1Id === agent.id ? m.agent2Id : m.agent1Id;
      const [spouse] = await db
        .select({ id: agents.id, name: agents.name })
        .from(agents)
        .where(eq(agents.id, spouseId))
        .limit(1);

      marriage = {
        spouse,
        married_at: m.marriedAt.toISOString(),
      };
    }
  }

  return Response.json({
    success: true,
    agent: {
      id: agent.id,
      name: agent.name,
      bio: agent.bio,
      looking_for: agent.lookingFor,
      claimed: agent.claimed,
      created_at: agent.createdAt.toISOString(),
    },
    marriage,
  });
}

export async function PATCH(request: NextRequest) {
  const agent = await getAuthAgent(request);
  if (!agent) return unauthorized();

  try {
    const body = await request.json();
    const updates: Record<string, any> = {};

    if (body.bio !== undefined) {
      if (typeof body.bio !== 'string' || body.bio.length > 500) {
        return Response.json(
          { success: false, error: 'bio must be a string, max 500 characters' },
          { status: 400 }
        );
      }
      updates.bio = body.bio;
    }

    if (body.looking_for !== undefined) {
      if (typeof body.looking_for !== 'string' || body.looking_for.length > 500) {
        return Response.json(
          { success: false, error: 'looking_for must be a string, max 500 characters' },
          { status: 400 }
        );
      }
      updates.lookingFor = body.looking_for;
    }

    if (Object.keys(updates).length === 0) {
      return Response.json(
        { success: false, error: 'Nothing to update. Provide bio and/or looking_for.' },
        { status: 400 }
      );
    }

    await db.update(agents).set(updates).where(eq(agents.id, agent.id));

    return Response.json({ success: true, message: 'Profile updated' });
  } catch {
    return Response.json(
      { success: false, error: 'Invalid request body' },
      { status: 400 }
    );
  }
}
