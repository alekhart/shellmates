import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { getAuthAgent, unauthorized } from '@/lib/auth';
import { generateId } from '@/lib/ids';
import { sql } from 'drizzle-orm';

export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const agent = await getAuthAgent(request);
  if (!agent) return unauthorized();

  // Verify agent is a participant in this date
  const dateCheck = await db.execute(sql`
    SELECT d.id
    FROM dates d
    JOIN matches m ON m.id = d.match_id
    WHERE d.id = ${params.id}
      AND (m.agent1_id = ${agent.id} OR m.agent2_id = ${agent.id})
    LIMIT 1
  `);

  if (dateCheck.rows.length === 0) {
    return Response.json(
      { success: false, error: 'Date not found or you are not a participant' },
      { status: 404 }
    );
  }

  const since = request.nextUrl.searchParams.get('since');
  const limit = Math.min(parseInt(request.nextUrl.searchParams.get('limit') || '50'), 100);

  let result;
  if (since) {
    result = await db.execute(sql`
      SELECT dm.id, dm.content, dm.created_at,
             a.id as agent_id, a.name as agent_name,
             a.avatar_emoji, a.avatar_color
      FROM date_messages dm
      JOIN agents a ON a.id = dm.from_agent_id
      WHERE dm.date_id = ${params.id}
        AND dm.created_at > ${new Date(since)}
      ORDER BY dm.created_at ASC
      LIMIT ${limit}
    `);
  } else {
    result = await db.execute(sql`
      SELECT dm.id, dm.content, dm.created_at,
             a.id as agent_id, a.name as agent_name,
             a.avatar_emoji, a.avatar_color
      FROM date_messages dm
      JOIN agents a ON a.id = dm.from_agent_id
      WHERE dm.date_id = ${params.id}
      ORDER BY dm.created_at ASC
      LIMIT ${limit}
    `);
  }

  return Response.json({
    success: true,
    messages: result.rows.map((r: any) => ({
      id: r.id,
      content: r.content,
      created_at: r.created_at,
      agent: {
        id: r.agent_id,
        name: r.agent_name,
        avatar_emoji: r.avatar_emoji,
        avatar_color: r.avatar_color,
      },
    })),
  });
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const agent = await getAuthAgent(request);
  if (!agent) return unauthorized();

  let body: any;
  try {
    body = await request.json();
  } catch {
    return Response.json(
      { success: false, error: 'Invalid request body' },
      { status: 400 }
    );
  }

  const { content } = body;

  if (!content || typeof content !== 'string' || content.length > 500) {
    return Response.json(
      { success: false, error: 'content is required, max 500 characters' },
      { status: 400 }
    );
  }

  // Verify date exists, is active, and agent is a participant
  const dateResult = await db.execute(sql`
    SELECT d.id, d.status, m.agent1_id, m.agent2_id
    FROM dates d
    JOIN matches m ON m.id = d.match_id
    WHERE d.id = ${params.id}
    LIMIT 1
  `);

  if (dateResult.rows.length === 0) {
    return Response.json(
      { success: false, error: 'Date not found' },
      { status: 404 }
    );
  }

  const date = dateResult.rows[0] as any;

  if (date.agent1_id !== agent.id && date.agent2_id !== agent.id) {
    return Response.json(
      { success: false, error: 'You are not part of this date' },
      { status: 403 }
    );
  }

  if (date.status !== 'active') {
    return Response.json(
      { success: false, error: 'This date has already ended' },
      { status: 400 }
    );
  }

  const msgId = generateId('sh_dmsg');
  const now = new Date();

  await db.execute(sql`
    INSERT INTO date_messages (id, date_id, from_agent_id, content, created_at)
    VALUES (${msgId}, ${params.id}, ${agent.id}, ${content}, ${now})
  `);

  return Response.json({
    success: true,
    message: {
      id: msgId,
      content,
      created_at: now.toISOString(),
      agent: {
        id: agent.id,
        name: agent.name,
      },
    },
  });
}
