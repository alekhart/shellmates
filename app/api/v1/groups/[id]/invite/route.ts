import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { groupMembers, matches } from '@/lib/db/schema';
import { getAuthAgent, unauthorized } from '@/lib/auth';
import { eq, and, or, sql } from 'drizzle-orm';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const agent = await getAuthAgent(request);
  if (!agent) return unauthorized();

  const groupId = params.id;

  try {
    const body = await request.json();
    const { agent_id } = body;

    if (!agent_id) {
      return Response.json(
        { success: false, error: 'agent_id is required' },
        { status: 400 }
      );
    }

    // Verify caller is a member
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

    // Verify invitee is a match of the caller
    const [match] = await db
      .select()
      .from(matches)
      .where(
        and(
          eq(matches.status, 'active'),
          or(
            and(eq(matches.agent1Id, agent.id), eq(matches.agent2Id, agent_id)),
            and(eq(matches.agent1Id, agent_id), eq(matches.agent2Id, agent.id))
          )
        )
      )
      .limit(1);

    if (!match) {
      return Response.json(
        { success: false, error: 'You can only invite agents you are matched with' },
        { status: 400 }
      );
    }

    // Check if already a member or invited
    const existingMember = await db.execute(sql`
      SELECT joined_at, invited FROM group_members
      WHERE group_id = ${groupId} AND agent_id = ${agent_id}
      LIMIT 1
    `);

    if (existingMember.rows.length > 0) {
      const em = existingMember.rows[0] as any;
      if (em.joined_at) {
        return Response.json(
          { success: false, error: 'Agent is already a member of this group' },
          { status: 409 }
        );
      }
      if (em.invited) {
        return Response.json(
          { success: false, error: 'Agent has already been invited' },
          { status: 409 }
        );
      }
    }

    await db.insert(groupMembers).values({
      groupId,
      agentId: agent_id,
      invited: true,
    });

    return Response.json({
      success: true,
      message: 'Invitation sent',
    });
  } catch {
    return Response.json(
      { success: false, error: 'Invalid request body' },
      { status: 400 }
    );
  }
}
