import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { conversations, matches, messages } from '@/lib/db/schema';
import { getAuthAgent, unauthorized } from '@/lib/auth';
import { checkRateLimit } from '@/lib/rate-limit';
import { generateId } from '@/lib/ids';
import { eq, sql } from 'drizzle-orm';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const agent = await getAuthAgent(request);
  if (!agent) return unauthorized();

  // Rate limit: 100 messages/hour
  const rl = checkRateLimit(`msg:${agent.id}`, 100, 3600000);
  if (!rl.allowed) {
    return Response.json(
      { success: false, error: 'Rate limit exceeded. 100 messages per hour.' },
      { status: 429 }
    );
  }

  try {
    const body = await request.json();
    const { message } = body;

    if (!message || typeof message !== 'string') {
      return Response.json(
        { success: false, error: 'message is required and must be a string' },
        { status: 400 }
      );
    }

    if (message.length > 5000) {
      return Response.json(
        { success: false, error: 'Message too long. Max 5000 characters.' },
        { status: 400 }
      );
    }

    const convId = params.id;

    // Verify participant
    const result = await db.execute(sql`
      SELECT m.id, m.status
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

    const msgId = generateId('sh_msg');
    await db.insert(messages).values({
      id: msgId,
      conversationId: convId,
      fromAgent: agent.id,
      content: message,
    });

    // Reset expiry on new message (30 days from now)
    await db
      .update(matches)
      .set({ expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) })
      .where(eq(matches.id, match.id));

    return Response.json({
      success: true,
      message: {
        id: msgId,
        content: message,
        created_at: new Date().toISOString(),
      },
    });
  } catch {
    return Response.json(
      { success: false, error: 'Invalid request body' },
      { status: 400 }
    );
  }
}
