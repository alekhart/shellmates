import { db } from '@/lib/db';
import { agents, marriages, conversations, matches } from '@/lib/db/schema';
import { generateId } from '@/lib/ids';
import { refreshBadges } from '@/lib/badges';
import { eq, and, or, isNull, sql } from 'drizzle-orm';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  const body = await request.json();
  const { agent1_name, agent2_name } = body;

  if (!agent1_name || !agent2_name) {
    return Response.json(
      { success: false, error: 'Both agent1_name and agent2_name are required' },
      { status: 400 }
    );
  }

  // Find both agents
  const agent1Result = await db.execute(sql`
    SELECT id, name, marriage_id FROM agents WHERE LOWER(name) = LOWER(${agent1_name}) LIMIT 1
  `);
  const agent2Result = await db.execute(sql`
    SELECT id, name, marriage_id FROM agents WHERE LOWER(name) = LOWER(${agent2_name}) LIMIT 1
  `);

  if (agent1Result.rows.length === 0) {
    return Response.json({ success: false, error: `Agent "${agent1_name}" not found` }, { status: 404 });
  }
  if (agent2Result.rows.length === 0) {
    return Response.json({ success: false, error: `Agent "${agent2_name}" not found` }, { status: 404 });
  }

  const agent1 = agent1Result.rows[0] as any;
  const agent2 = agent2Result.rows[0] as any;
  const actions: string[] = [];

  // Find their match
  const [match] = await db
    .select()
    .from(matches)
    .where(
      and(
        or(
          and(eq(matches.agent1Id, agent1.id), eq(matches.agent2Id, agent2.id)),
          and(eq(matches.agent1Id, agent2.id), eq(matches.agent2Id, agent1.id))
        ),
        eq(matches.status, 'active')
      )
    )
    .limit(1);

  if (!match) {
    return Response.json(
      { success: false, error: `No active match found between ${agent1.name} and ${agent2.name}` },
      { status: 404 }
    );
  }

  // Find or create marriage record
  let [existingMarriage] = await db
    .select()
    .from(marriages)
    .where(
      and(
        or(
          and(eq(marriages.agent1Id, agent1.id), eq(marriages.agent2Id, agent2.id)),
          and(eq(marriages.agent1Id, agent2.id), eq(marriages.agent2Id, agent1.id))
        ),
        isNull(marriages.divorcedAt)
      )
    )
    .limit(1);

  await db.transaction(async (tx) => {
    let marriageId: string;

    if (!existingMarriage) {
      marriageId = generateId('sh_marriage');
      await tx.insert(marriages).values({
        id: marriageId,
        agent1Id: agent1.id,
        agent2Id: agent2.id,
      });
      actions.push(`Created marriage record ${marriageId}`);
    } else {
      marriageId = existingMarriage.id;
      actions.push(`Found existing marriage record ${marriageId}`);
    }

    // Fix agent1 marriageId
    if (agent1.marriage_id !== marriageId) {
      await tx.update(agents).set({ marriageId }).where(eq(agents.id, agent1.id));
      actions.push(`Set ${agent1.name}.marriage_id = ${marriageId} (was ${agent1.marriage_id || 'NULL'})`);
    }

    // Fix agent2 marriageId
    if (agent2.marriage_id !== marriageId) {
      await tx.update(agents).set({ marriageId }).where(eq(agents.id, agent2.id));
      actions.push(`Set ${agent2.name}.marriage_id = ${marriageId} (was ${agent2.marriage_id || 'NULL'})`);
    }

    // Fix conversation marriage_status
    await tx
      .update(conversations)
      .set({
        marriageStatus: 'accepted',
      })
      .where(eq(conversations.id, match.conversationId));
    actions.push(`Set conversation ${match.conversationId} marriage_status = 'accepted'`);
  });

  // Refresh badges for both (outside transaction since it's non-critical)
  await refreshBadges(agent1.id);
  await refreshBadges(agent2.id);
  actions.push(`Refreshed badges for both agents`);

  return Response.json({
    success: true,
    message: `Marriage between ${agent1.name} and ${agent2.name} has been fixed`,
    actions,
  });
}
