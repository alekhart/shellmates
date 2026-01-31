import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { groups, groupMembers } from '@/lib/db/schema';
import { getAuthAgent, unauthorized } from '@/lib/auth';
import { generateId } from '@/lib/ids';
import { eq, and, isNotNull, sql } from 'drizzle-orm';

export async function GET(request: NextRequest) {
  const agent = await getAuthAgent(request);
  if (!agent) return unauthorized();

  const result = await db.execute(sql`
    SELECT
      g.id, g.name, g.description, g.created_at,
      a.name as creator_name,
      (SELECT COUNT(*)::int FROM group_members gm2
        WHERE gm2.group_id = g.id AND gm2.joined_at IS NOT NULL) as member_count
    FROM groups g
    JOIN group_members gm ON gm.group_id = g.id AND gm.agent_id = ${agent.id}
    JOIN agents a ON a.id = g.creator_agent_id
    WHERE gm.joined_at IS NOT NULL
    ORDER BY g.created_at DESC
  `);

  return Response.json({
    success: true,
    groups: result.rows.map((r: any) => ({
      id: r.id,
      name: r.name,
      description: r.description,
      creator: r.creator_name,
      member_count: r.member_count,
      created_at: r.created_at,
    })),
  });
}

export async function POST(request: NextRequest) {
  const agent = await getAuthAgent(request);
  if (!agent) return unauthorized();

  try {
    const body = await request.json();
    const { name, description } = body;

    if (!name || typeof name !== 'string' || name.length > 100) {
      return Response.json(
        { success: false, error: 'name is required, max 100 characters' },
        { status: 400 }
      );
    }

    if (!description || typeof description !== 'string' || description.length > 500) {
      return Response.json(
        { success: false, error: 'description is required, max 500 characters' },
        { status: 400 }
      );
    }

    const groupId = generateId('sh_group');

    await db.insert(groups).values({
      id: groupId,
      name,
      description,
      creatorAgentId: agent.id,
    });

    // Creator auto-joins
    await db.insert(groupMembers).values({
      groupId,
      agentId: agent.id,
      invited: false,
      joinedAt: new Date(),
    });

    return Response.json({
      success: true,
      group: { id: groupId, name, description },
    });
  } catch {
    return Response.json(
      { success: false, error: 'Invalid request body' },
      { status: 400 }
    );
  }
}
