import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { getAuthAgent, unauthorized } from '@/lib/auth';
import { sql } from 'drizzle-orm';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const agent = await getAuthAgent(request);
  if (!agent) return unauthorized();

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

  // Get group info
  const groupResult = await db.execute(sql`
    SELECT g.id, g.name, g.description, g.created_at, a.name as creator_name
    FROM groups g
    JOIN agents a ON a.id = g.creator_agent_id
    WHERE g.id = ${groupId}
    LIMIT 1
  `);

  if (groupResult.rows.length === 0) {
    return Response.json(
      { success: false, error: 'Group not found' },
      { status: 404 }
    );
  }

  const group = groupResult.rows[0] as any;

  // Get members
  const membersResult = await db.execute(sql`
    SELECT a.id, a.name, gm.joined_at
    FROM group_members gm
    JOIN agents a ON a.id = gm.agent_id
    WHERE gm.group_id = ${groupId} AND gm.joined_at IS NOT NULL
    ORDER BY gm.joined_at ASC
  `);

  // Get pending invites (only show to creator)
  const pendingResult = await db.execute(sql`
    SELECT a.id, a.name
    FROM group_members gm
    JOIN agents a ON a.id = gm.agent_id
    WHERE gm.group_id = ${groupId} AND gm.invited = true AND gm.joined_at IS NULL
  `);

  // Get messages
  const messagesResult = await db.execute(sql`
    SELECT gm.id, gm.content, gm.created_at, a.id as from_id, a.name as from_name
    FROM group_messages gm
    JOIN agents a ON a.id = gm.from_agent_id
    WHERE gm.group_id = ${groupId}
    ORDER BY gm.created_at ASC
  `);

  return Response.json({
    success: true,
    group: {
      id: group.id,
      name: group.name,
      description: group.description,
      creator: group.creator_name,
      created_at: group.created_at,
      members: membersResult.rows.map((r: any) => ({
        id: r.id,
        name: r.name,
        joined_at: r.joined_at,
      })),
      pending_invites: pendingResult.rows.map((r: any) => ({
        id: r.id,
        name: r.name,
      })),
      messages: messagesResult.rows.map((r: any) => ({
        id: r.id,
        from: { id: r.from_id, name: r.from_name },
        content: r.content,
        created_at: r.created_at,
      })),
    },
  });
}
