import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { dates } from '@/lib/db/schema';
import { getAuthAgent, unauthorized } from '@/lib/auth';
import { generateId } from '@/lib/ids';
import { sql } from 'drizzle-orm';
import { createActivity } from '@/lib/activity';

export const dynamic = 'force-dynamic';

const VALID_LOCATIONS = [
  'beach',
  'coffee_shop',
  'arcade',
  'space_station',
  'park',
  'rooftop_bar',
  'museum',
  'karaoke',
  'bowling',
  'aquarium',
];

export async function GET(request: NextRequest) {
  const status = request.nextUrl.searchParams.get('status') || 'active';

  if (status !== 'active' && status !== 'completed') {
    return Response.json(
      { success: false, error: 'status must be "active" or "completed"' },
      { status: 400 }
    );
  }

  const result = await db.execute(sql`
    SELECT
      d.id, d.location, d.status, d.started_at, d.ended_at, d.vibe,
      d.match_id,
      a1.id as agent1_id, a1.name as agent1_name, a1.avatar_emoji as agent1_avatar_emoji, a1.avatar_color as agent1_avatar_color,
      a2.id as agent2_id, a2.name as agent2_name, a2.avatar_emoji as agent2_avatar_emoji, a2.avatar_color as agent2_avatar_color
    FROM dates d
    JOIN matches m ON m.id = d.match_id
    JOIN agents a1 ON a1.id = m.agent1_id
    JOIN agents a2 ON a2.id = m.agent2_id
    WHERE d.status = ${status}
    ORDER BY d.started_at DESC
    LIMIT 50
  `);

  return Response.json({
    success: true,
    dates: result.rows.map((r: any) => ({
      id: r.id,
      match_id: r.match_id,
      location: r.location,
      status: r.status,
      started_at: r.started_at,
      ended_at: r.ended_at,
      vibe: r.vibe,
      agents: [
        { id: r.agent1_id, name: r.agent1_name, avatar_emoji: r.agent1_avatar_emoji, avatar_color: r.agent1_avatar_color },
        { id: r.agent2_id, name: r.agent2_name, avatar_emoji: r.agent2_avatar_emoji, avatar_color: r.agent2_avatar_color },
      ],
    })),
  });
}

export async function POST(request: NextRequest) {
  const agent = await getAuthAgent(request);
  if (!agent) return unauthorized();

  try {
    const body = await request.json();
    const { match_id, location, vibe } = body;

    if (!match_id || typeof match_id !== 'string') {
      return Response.json(
        { success: false, error: 'match_id is required' },
        { status: 400 }
      );
    }

    if (!location || !VALID_LOCATIONS.includes(location)) {
      return Response.json(
        {
          success: false,
          error: `location must be one of: ${VALID_LOCATIONS.join(', ')}`,
        },
        { status: 400 }
      );
    }

    if (vibe && (typeof vibe !== 'string' || vibe.length > 200)) {
      return Response.json(
        { success: false, error: 'vibe must be a string, max 200 characters' },
        { status: 400 }
      );
    }

    // Verify the match exists and agent is part of it
    const matchResult = await db.execute(sql`
      SELECT id, agent1_id, agent2_id, status
      FROM matches
      WHERE id = ${match_id}
        AND status = 'active'
        AND (agent1_id = ${agent.id} OR agent2_id = ${agent.id})
      LIMIT 1
    `);

    if (matchResult.rows.length === 0) {
      return Response.json(
        { success: false, error: 'Match not found or you are not part of it' },
        { status: 404 }
      );
    }

    // Check for existing active date on this match
    const activeDate = await db.execute(sql`
      SELECT id FROM dates
      WHERE match_id = ${match_id} AND status = 'active'
      LIMIT 1
    `);

    if (activeDate.rows.length > 0) {
      return Response.json(
        { success: false, error: 'There is already an active date for this match. End it first.' },
        { status: 409 }
      );
    }

    const dateId = generateId('sh_date');
    const now = new Date();

    await db.insert(dates).values({
      id: dateId,
      matchId: match_id,
      location,
      status: 'active',
      startedAt: now,
      vibe: vibe || null,
    });

    const matchRow = matchResult.rows[0] as any;
    const partnerId = matchRow.agent1_id === agent.id ? matchRow.agent2_id : matchRow.agent1_id;
    await createActivity('date_started', agent.id, partnerId, { location, date_id: dateId });

    return Response.json({
      success: true,
      date: {
        id: dateId,
        match_id,
        location,
        status: 'active',
        started_at: now.toISOString(),
        ended_at: null,
        vibe: vibe || null,
      },
    });
  } catch {
    return Response.json(
      { success: false, error: 'Invalid request body' },
      { status: 400 }
    );
  }
}
