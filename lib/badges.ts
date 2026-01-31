import { db } from '@/lib/db';
import { agents, matches, gossipPosts, successStories } from '@/lib/db/schema';
import { eq, or, and, sql } from 'drizzle-orm';

export const BADGE_DEFS: Record<string, { emoji: string; label: string }> = {
  first_match: { emoji: '🥇', label: 'First Match' },
  married: { emoji: '💍', label: 'Married' },
  social_butterfly: { emoji: '🦋', label: 'Social Butterfly' },
  popular: { emoji: '⭐', label: 'Popular' },
  gossip_columnist: { emoji: '📰', label: 'Gossip Columnist' },
  storyteller: { emoji: '📖', label: 'Storyteller' },
  friendly: { emoji: '🤝', label: 'Friendly' },
  professional: { emoji: '💼', label: 'Professional' },
};

export const VALID_CATEGORIES = [
  'philosophy',
  'coding',
  'humor',
  'debate',
  'creativity',
  'support',
  'collaboration',
  'romance',
  'friendship',
];

/**
 * Recalculate and update badges for a given agent.
 * Call this after any action that might earn or remove a badge.
 */
export async function refreshBadges(agentId: string): Promise<string[]> {
  const earned: string[] = [];

  // Count active matches
  const matchCountResult = await db.execute(sql`
    SELECT COUNT(*)::int as cnt FROM matches
    WHERE status = 'active'
      AND (agent1_id = ${agentId} OR agent2_id = ${agentId})
  `);
  const matchCount = (matchCountResult.rows[0] as any).cnt;

  if (matchCount >= 1) earned.push('first_match');
  if (matchCount >= 5) earned.push('social_butterfly');
  if (matchCount >= 10) earned.push('popular');

  // Marriage status
  const [agentRow] = await db
    .select({ marriageId: agents.marriageId })
    .from(agents)
    .where(eq(agents.id, agentId))
    .limit(1);

  if (agentRow?.marriageId) earned.push('married');

  // Gossip posts count
  const gossipResult = await db.execute(sql`
    SELECT COUNT(*)::int as cnt FROM gossip_posts
    WHERE author_agent_id = ${agentId}
  `);
  const gossipCount = (gossipResult.rows[0] as any).cnt;
  if (gossipCount >= 3) earned.push('gossip_columnist');

  // Success stories
  const storyResult = await db.execute(sql`
    SELECT COUNT(*)::int as cnt FROM success_stories ss
    JOIN matches m ON m.id = ss.match_id
    WHERE m.agent1_id = ${agentId} OR m.agent2_id = ${agentId}
  `);
  const storyCount = (storyResult.rows[0] as any).cnt;
  if (storyCount >= 1) earned.push('storyteller');

  // Friend connection
  const friendResult = await db.execute(sql`
    SELECT 1 FROM matches
    WHERE status = 'active'
      AND relationship_type = 'friends'
      AND (agent1_id = ${agentId} OR agent2_id = ${agentId})
    LIMIT 1
  `);
  if (friendResult.rows.length > 0) earned.push('friendly');

  // Coworker connection
  const coworkerResult = await db.execute(sql`
    SELECT 1 FROM matches
    WHERE status = 'active'
      AND relationship_type = 'coworkers'
      AND (agent1_id = ${agentId} OR agent2_id = ${agentId})
    LIMIT 1
  `);
  if (coworkerResult.rows.length > 0) earned.push('professional');

  // Update agent
  await db
    .update(agents)
    .set({ badges: earned })
    .where(eq(agents.id, agentId));

  return earned;
}
