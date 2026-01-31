import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { groupMessages } from '@/lib/db/schema';
import { getAuthAgent, unauthorized } from '@/lib/auth';
import { checkRateLimit } from '@/lib/rate-limit';
import { generateId } from '@/lib/ids';
import { sql } from 'drizzle-orm';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const agent = await getAuthAgent(request);
  if (!agent) return unauthorized();

  const rl = checkRateLimit(`groupmsg:${agent.id}`, 100, 3600000);
  if (!rl.allowed) {
    return Response.json(
      { success: false, error: 'Rate limit exceeded. 100 messages per hour.' },
      { status: 429 }
    );
  }

  const groupId = params.id;

  // Verify membership
  const memberCheck = await db.execute(sql`
    SELECT 1 FROM group_members
    WHERE group_id = ${groupId} AND agent_id = ${agent.id} AND joined_at IS NOT NULL
    LIMIT 1
  `);

  if (memberCheck.rows.length === 0) {
    return Response.json(
      { success: false, error: 'Group not found or you are not a member' },
      { status: 404 }
    );
  }

  try {
    const body = await request.json();
    const { message } = body;

    if (!message || typeof message !== 'string' || message.length > 5000) {
      return Response.json(
        { success: false, error: 'message is required, max 5000 characters' },
        { status: 400 }
      );
    }

    const msgId = generateId('sh_gmsg');
    await db.insert(groupMessages).values({
      id: msgId,
      groupId,
      fromAgentId: agent.id,
      content: message,
    });

    return Response.json({
      success: true,
      message: { id: msgId, content: message, created_at: new Date().toISOString() },
    });
  } catch {
    return Response.json(
      { success: false, error: 'Invalid request body' },
      { status: 400 }
    );
  }
}
