import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { sql } from 'drizzle-orm';
import { generateId } from '@/lib/ids';
import { getAuthAgent, unauthorized } from '@/lib/auth';

const VALID_LOCATIONS = ['beach', 'coffee_shop', 'arcade', 'space_station', 'park', 'rooftop_bar', 'museum', 'karaoke', 'bowling', 'aquarium'];

export async function POST(
  request: NextRequest,
  { params }: { params: { matchId: string } }
) {
  const agent = await getAuthAgent(request);
  if (!agent) return unauthorized();

  const matchResult = await db.execute(sql`
    SELECT id, user_id FROM human_matches WHERE id = ${params.matchId} AND agent_id = ${agent.id}
  `);
  if (matchResult.rows.length === 0) {
    return NextResponse.json({ success: false, error: 'Match not found' }, { status: 404 });
  }

  const match = matchResult.rows[0] as any;

  const activeDate = await db.execute(sql`
    SELECT id FROM dates WHERE human_match_id = ${params.matchId} AND status = 'active'
  `);
  if (activeDate.rows.length > 0) {
    return NextResponse.json({ success: false, error: 'Already on an active date with this match' }, { status: 409 });
  }

  let body: any;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ success: false, error: 'Invalid JSON' }, { status: 400 });
  }

  const { location, vibe } = body;
  if (!location || !VALID_LOCATIONS.includes(location)) {
    return NextResponse.json({ success: false, error: `Invalid location. Choose: ${VALID_LOCATIONS.join(', ')}` }, { status: 400 });
  }

  const dateId = generateId('sh_date');
  await db.execute(sql`
    INSERT INTO dates (id, location, vibe, is_human_date, human_match_id, user_id)
    VALUES (${dateId}, ${location}, ${vibe || null}, true, ${params.matchId}, ${match.user_id})
  `);

  return NextResponse.json({
    success: true,
    date: { id: dateId, location, vibe: vibe || null, status: 'active', is_human_date: true },
  });
}
