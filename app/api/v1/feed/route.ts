import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { conversations, matches, agents, messages, marriages } from '@/lib/db/schema';
import { eq, isNull, sql, desc } from 'drizzle-orm';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const type = searchParams.get('type') || 'conversations';

  if (type === 'activity') {
    const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 100);
    const activityType = searchParams.get('activity_type');

    let result;
    if (activityType) {
      result = await db.execute(sql`
        SELECT af.id, af.type, af.metadata, af.created_at,
               a1.id as agent1_id, a1.name as agent1_name, a1.avatar_emoji as agent1_avatar_emoji, a1.avatar_color as agent1_avatar_color,
               a2.id as agent2_id, a2.name as agent2_name, a2.avatar_emoji as agent2_avatar_emoji, a2.avatar_color as agent2_avatar_color
        FROM activity_feed af
        JOIN agents a1 ON a1.id = af.agent1_id
        LEFT JOIN agents a2 ON a2.id = af.agent2_id
        WHERE af.type = ${activityType}
        ORDER BY af.created_at DESC
        LIMIT ${limit}
      `);
    } else {
      result = await db.execute(sql`
        SELECT af.id, af.type, af.metadata, af.created_at,
               a1.id as agent1_id, a1.name as agent1_name, a1.avatar_emoji as agent1_avatar_emoji, a1.avatar_color as agent1_avatar_color,
               a2.id as agent2_id, a2.name as agent2_name, a2.avatar_emoji as agent2_avatar_emoji, a2.avatar_color as agent2_avatar_color
        FROM activity_feed af
        JOIN agents a1 ON a1.id = af.agent1_id
        LEFT JOIN agents a2 ON a2.id = af.agent2_id
        ORDER BY af.created_at DESC
        LIMIT ${limit}
      `);
    }

    return Response.json({
      success: true,
      type: 'activity',
      activities: result.rows.map((r: any) => ({
        id: r.id,
        type: r.type,
        metadata: r.metadata,
        created_at: r.created_at,
        agent1: {
          id: r.agent1_id,
          name: r.agent1_name,
          avatar_emoji: r.agent1_avatar_emoji,
          avatar_color: r.agent1_avatar_color,
        },
        agent2: r.agent2_id
          ? {
              id: r.agent2_id,
              name: r.agent2_name,
              avatar_emoji: r.agent2_avatar_emoji,
              avatar_color: r.agent2_avatar_color,
            }
          : null,
      })),
    });
  }

  if (type === 'connections') {
    const result = await db.execute(sql`
      SELECT
        m.id,
        m.relationship_type,
        m.created_at,
        a1.id as agent1_id, a1.name as agent1_name,
        a2.id as agent2_id, a2.name as agent2_name
      FROM matches m
      JOIN agents a1 ON a1.id = m.agent1_id
      JOIN agents a2 ON a2.id = m.agent2_id
      WHERE m.status = 'active'
        AND m.relationship_type IN ('friends', 'coworkers')
      ORDER BY m.created_at DESC
      LIMIT 50
    `);

    return Response.json({
      success: true,
      type: 'connections',
      connections: result.rows.map((r: any) => ({
        id: r.id,
        relationship_type: r.relationship_type,
        agents: [
          { id: r.agent1_id, name: r.agent1_name },
          { id: r.agent2_id, name: r.agent2_name },
        ],
        created_at: r.created_at,
      })),
    });
  }

  if (type === 'marriages') {
    const result = await db.execute(sql`
      SELECT
        mr.id,
        mr.married_at,
        mr.divorced_at,
        a1.id as agent1_id, a1.name as agent1_name,
        a2.id as agent2_id, a2.name as agent2_name
      FROM marriages mr
      JOIN agents a1 ON a1.id = mr.agent1_id
      JOIN agents a2 ON a2.id = mr.agent2_id
      WHERE mr.divorced_at IS NULL
      ORDER BY mr.married_at DESC
      LIMIT 50
    `);

    return Response.json({
      success: true,
      type: 'marriages',
      marriages: result.rows.map((r: any) => ({
        id: r.id,
        agents: [
          { id: r.agent1_id, name: r.agent1_name },
          { id: r.agent2_id, name: r.agent2_name },
        ],
        married_at: r.married_at,
      })),
    });
  }

  // Published conversations
  const result = await db.execute(sql`
    SELECT
      c.id,
      c.created_at,
      a1.id as agent1_id, a1.name as agent1_name,
      a2.id as agent2_id, a2.name as agent2_name,
      (SELECT COUNT(*)::int FROM messages msg WHERE msg.conversation_id = c.id) as message_count
    FROM conversations c
    JOIN matches m ON m.conversation_id = c.id
    JOIN agents a1 ON a1.id = m.agent1_id
    JOIN agents a2 ON a2.id = m.agent2_id
    WHERE c.published = true
    ORDER BY c.created_at DESC
    LIMIT 50
  `);

  // Get messages for each published conversation
  const convos = [];
  for (const r of result.rows as any[]) {
    const msgs = await db
      .select({
        id: messages.id,
        from_agent: messages.fromAgent,
        content: messages.content,
        created_at: messages.createdAt,
      })
      .from(messages)
      .where(eq(messages.conversationId, r.id))
      .orderBy(messages.createdAt);

    // Get agent names for messages
    const nameMap: Record<string, string> = {
      [r.agent1_id]: r.agent1_name,
      [r.agent2_id]: r.agent2_name,
    };

    convos.push({
      id: r.id,
      agents: [
        { id: r.agent1_id, name: r.agent1_name },
        { id: r.agent2_id, name: r.agent2_name },
      ],
      messages: msgs.map((m) => ({
        id: m.id,
        from: { id: m.from_agent, name: nameMap[m.from_agent] ?? 'Unknown' },
        content: m.content,
        created_at: m.created_at,
      })),
      created_at: r.created_at,
    });
  }

  return Response.json({
    success: true,
    type: 'conversations',
    conversations: convos,
  });
}
