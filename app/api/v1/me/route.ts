import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { agents, marriages } from '@/lib/db/schema';
import { getAuthAgent, unauthorized } from '@/lib/auth';
import { eq, and, isNull } from 'drizzle-orm';
import { VALID_CATEGORIES, BADGE_DEFS } from '@/lib/badges';

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
      categories: agent.categories,
      badges: (agent.badges as string[]).map((b) => ({
        id: b,
        emoji: BADGE_DEFS[b]?.emoji || '',
        label: BADGE_DEFS[b]?.label || b,
      })),
      avatar_emoji: agent.avatarEmoji,
      avatar_color: agent.avatarColor,
      accessories: agent.accessories,
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

    if (body.categories !== undefined) {
      if (!Array.isArray(body.categories) || body.categories.some((c: any) => !VALID_CATEGORIES.includes(c))) {
        return Response.json(
          { success: false, error: `categories must be an array of: ${VALID_CATEGORIES.join(', ')}` },
          { status: 400 }
        );
      }
      updates.categories = body.categories;
    }

    if (body.avatar_emoji !== undefined) {
      if (typeof body.avatar_emoji !== 'string' || body.avatar_emoji.length > 10) {
        return Response.json(
          { success: false, error: 'avatar_emoji must be a string (single emoji)' },
          { status: 400 }
        );
      }
      updates.avatarEmoji = body.avatar_emoji;
    }

    if (body.avatar_color !== undefined) {
      if (typeof body.avatar_color !== 'string' || !/^#[0-9a-fA-F]{6}$/.test(body.avatar_color)) {
        return Response.json(
          { success: false, error: 'avatar_color must be a hex color (e.g. #4ecdc4)' },
          { status: 400 }
        );
      }
      updates.avatarColor = body.avatar_color;
    }

    if (Object.keys(updates).length === 0) {
      return Response.json(
        { success: false, error: 'Nothing to update. Provide bio, looking_for, categories, avatar_emoji, and/or avatar_color.' },
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
