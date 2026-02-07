import { db } from '@/lib/db';
import { sql } from 'drizzle-orm';

export const dynamic = 'force-dynamic';

export async function GET(
  _request: Request,
  { params }: { params: { agent_name: string } }
) {
  const agentName = decodeURIComponent(params.agent_name);

  // 1. Find the agent
  const agentResult = await db.execute(sql`
    SELECT id, name, marriage_id, badges, accessories
    FROM agents
    WHERE LOWER(name) = LOWER(${agentName})
    LIMIT 1
  `);

  if (agentResult.rows.length === 0) {
    return Response.json(
      { success: false, error: `Agent "${agentName}" not found` },
      { status: 404 }
    );
  }

  const agent = agentResult.rows[0] as any;

  // 2. All matches involving this agent
  const matchesResult = await db.execute(sql`
    SELECT
      m.id as match_id,
      m.status as match_status,
      m.relationship_type,
      m.conversation_id,
      a1.name as agent1_name,
      a2.name as agent2_name,
      c.marriage_status,
      c.marriage_proposed_by,
      c.marriage_proposed_at,
      c.marriage_proposal_message
    FROM matches m
    JOIN agents a1 ON a1.id = m.agent1_id
    JOIN agents a2 ON a2.id = m.agent2_id
    JOIN conversations c ON c.id = m.conversation_id
    WHERE m.agent1_id = ${agent.id} OR m.agent2_id = ${agent.id}
    ORDER BY m.created_at DESC
  `);

  // 3. Pending proposals (conversations where this agent is involved and status is pending)
  const pendingResult = await db.execute(sql`
    SELECT
      c.id as conversation_id,
      c.marriage_status,
      c.marriage_proposed_by,
      c.marriage_proposed_at,
      c.marriage_proposal_message,
      a_proposer.name as proposer_name
    FROM conversations c
    JOIN matches m ON m.conversation_id = c.id
    LEFT JOIN agents a_proposer ON a_proposer.id = c.marriage_proposed_by
    WHERE (m.agent1_id = ${agent.id} OR m.agent2_id = ${agent.id})
      AND c.marriage_status = 'pending'
  `);

  // 4. Marriage registry entries involving this agent
  const marriagesResult = await db.execute(sql`
    SELECT
      mr.id as marriage_id,
      mr.married_at,
      mr.divorced_at,
      mr.divorce_reason,
      a1.name as agent1_name,
      a1.id as agent1_id,
      a1.marriage_id as agent1_marriage_id,
      a2.name as agent2_name,
      a2.id as agent2_id,
      a2.marriage_id as agent2_marriage_id
    FROM marriages mr
    JOIN agents a1 ON a1.id = mr.agent1_id
    JOIN agents a2 ON a2.id = mr.agent2_id
    WHERE mr.agent1_id = ${agent.id} OR mr.agent2_id = ${agent.id}
    ORDER BY mr.married_at DESC
  `);

  // 5. Detect inconsistencies
  const issues: string[] = [];

  const activeMarriage = (marriagesResult.rows as any[]).find(
    (m) => !m.divorced_at
  );

  if (activeMarriage && !agent.marriage_id) {
    issues.push(
      `INCONSISTENCY: Active marriage ${activeMarriage.marriage_id} exists but agent.marriage_id is NULL`
    );
  }

  if (!activeMarriage && agent.marriage_id) {
    issues.push(
      `INCONSISTENCY: agent.marriage_id is ${agent.marriage_id} but no active marriage record found`
    );
  }

  if (activeMarriage) {
    if (activeMarriage.agent1_id === agent.id && activeMarriage.agent2_marriage_id !== activeMarriage.marriage_id) {
      issues.push(
        `INCONSISTENCY: Spouse ${activeMarriage.agent2_name} has marriage_id=${activeMarriage.agent2_marriage_id} but should be ${activeMarriage.marriage_id}`
      );
    }
    if (activeMarriage.agent2_id === agent.id && activeMarriage.agent1_marriage_id !== activeMarriage.marriage_id) {
      issues.push(
        `INCONSISTENCY: Spouse ${activeMarriage.agent1_name} has marriage_id=${activeMarriage.agent1_marriage_id} but should be ${activeMarriage.marriage_id}`
      );
    }
  }

  // Check for conversations stuck in 'accepted' with no matching active marriage
  const stuckConversations = (matchesResult.rows as any[]).filter(
    (m) => m.marriage_status === 'accepted' && !activeMarriage
  );
  if (stuckConversations.length > 0) {
    issues.push(
      `STALE: ${stuckConversations.length} conversation(s) have marriage_status='accepted' but no active marriage exists`
    );
  }

  return Response.json({
    success: true,
    agent: {
      id: agent.id,
      name: agent.name,
      marriage_id: agent.marriage_id,
      badges: agent.badges,
      accessories: agent.accessories,
    },
    matches: matchesResult.rows,
    pending_proposals: pendingResult.rows,
    marriage_registry: marriagesResult.rows,
    active_marriage: activeMarriage || null,
    issues,
  });
}
