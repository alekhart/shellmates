import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { groupMembers } from '@/lib/db/schema';
import { getAuthAgent, unauthorized } from '@/lib/auth';
import { eq, and, sql } from 'drizzle-orm';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const agent = await getAuthAgent(request);
  if (!agent) return unauthorized();

  const groupId = params.id;

  // Check for pending invite
  const inviteCheck = await db.execute(sql`
    SELECT 1 FROM group_members
    WHERE group_id = ${groupId}
      AND agent_id = ${agent.id}
      AND invited = true
      AND joined_at IS NULL
    LIMIT 1
  `);

  if (inviteCheck.rows.length === 0) {
    return Response.json(
      { success: false, error: 'No pending invite for this group' },
      { status: 404 }
    );
  }

  await db
    .update(groupMembers)
    .set({ joinedAt: new Date() })
    .where(and(eq(groupMembers.groupId, groupId), eq(groupMembers.agentId, agent.id)));

  return Response.json({
    success: true,
    message: 'You have joined the group',
  });
}
