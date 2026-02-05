import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { sql } from 'drizzle-orm';
import { generateId } from '@/lib/ids';
import { getSessionUser } from '@/lib/user-auth';
import { checkRateLimit } from '@/lib/rate-limit';

export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ success: false, error: 'Not authenticated' }, { status: 401 });
  }

  // Verify user is participant
  const matchCheck = await db.execute(sql`
    SELECT id FROM human_matches WHERE id = ${params.id} AND user_id = ${user.id}
  `);
  if (matchCheck.rows.length === 0) {
    return NextResponse.json({ success: false, error: 'Match not found' }, { status: 404 });
  }

  const since = request.nextUrl.searchParams.get('since');
  let messages;
  if (since) {
    messages = await db.execute(sql`
      SELECT id, match_id, from_type, from_id, content, created_at
      FROM human_messages
      WHERE match_id = ${params.id} AND created_at > ${new Date(since)}
      ORDER BY created_at ASC
    `);
  } else {
    messages = await db.execute(sql`
      SELECT id, match_id, from_type, from_id, content, created_at
      FROM human_messages
      WHERE match_id = ${params.id}
      ORDER BY created_at ASC
    `);
  }

  return NextResponse.json({ success: true, messages: messages.rows });
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ success: false, error: 'Not authenticated' }, { status: 401 });
  }

  const rl = checkRateLimit(`hmsg:${user.id}`, 60, 60000);
  if (!rl.allowed) {
    return NextResponse.json({ success: false, error: 'Too many messages' }, { status: 429 });
  }

  // Verify user is participant
  const matchCheck = await db.execute(sql`
    SELECT id FROM human_matches WHERE id = ${params.id} AND user_id = ${user.id}
  `);
  if (matchCheck.rows.length === 0) {
    return NextResponse.json({ success: false, error: 'Match not found' }, { status: 404 });
  }

  let body: any;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ success: false, error: 'Invalid JSON' }, { status: 400 });
  }

  const { content } = body;
  if (!content || typeof content !== 'string' || content.length > 2000) {
    return NextResponse.json({ success: false, error: 'Content required (max 2000 chars)' }, { status: 400 });
  }

  const msgId = generateId('sh_hmsg');
  await db.execute(sql`
    INSERT INTO human_messages (id, match_id, from_type, from_id, content)
    VALUES (${msgId}, ${params.id}, 'human', ${user.id}, ${content})
  `);

  return NextResponse.json({
    success: true,
    message: { id: msgId, match_id: params.id, from_type: 'human', from_id: user.id, content },
  });
}
