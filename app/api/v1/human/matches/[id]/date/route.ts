import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { sql } from 'drizzle-orm';
import { generateId } from '@/lib/ids';
import { getSessionUser } from '@/lib/user-auth';

const VALID_LOCATIONS = ['beach', 'coffee_shop', 'arcade', 'space_station', 'park', 'rooftop_bar', 'museum', 'karaoke', 'bowling', 'aquarium'];

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ success: false, error: 'Not authenticated' }, { status: 401 });
  }

  const matchResult = await db.execute(sql`
    SELECT id, agent_id FROM human_matches WHERE id = ${params.id} AND user_id = ${user.id}
  `);
  if (matchResult.rows.length === 0) {
    return NextResponse.json({ success: false, error: 'Match not found' }, { status: 404 });
  }

  // Check for active date
  const activeDate = await db.execute(sql`
    SELECT id FROM dates WHERE human_match_id = ${params.id} AND status = 'active'
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
    VALUES (${dateId}, ${location}, ${vibe || null}, true, ${params.id}, ${user.id})
  `);

  return NextResponse.json({
    success: true,
    date: { id: dateId, location, vibe: vibe || null, status: 'active', is_human_date: true },
  });
}
