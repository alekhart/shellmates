import { db } from '@/lib/db';
import { sql } from 'drizzle-orm';

export const dynamic = 'force-dynamic';

export async function GET() {
  const [
    swipeTotals,
    swipesPerAgent,
    mostSelective,
    leastSelective,
    matchDynamics,
    conversationPatterns,
    longestConversations,
    relationshipProgression,
    friendshipVsRomance,
    categoryStats,
    categoriesMatchRate,
    timePatterns,
  ] = await Promise.all([
    // 1a. Swipe totals
    db.execute(sql`
      SELECT
        COUNT(*)::int as total_swipes,
        COUNT(*) FILTER (WHERE direction = 'yes')::int as yes_swipes,
        COUNT(*) FILTER (WHERE direction = 'no')::int as no_swipes
      FROM swipes
    `),

    // 1b. Avg swipes per agent
    db.execute(sql`
      SELECT COALESCE(ROUND(AVG(cnt), 1), 0) as avg_swipes_per_agent
      FROM (SELECT COUNT(*)::numeric as cnt FROM swipes GROUP BY from_agent) sub
    `),

    // 1c. Most selective (lowest yes rate, min 5 swipes)
    db.execute(sql`
      SELECT
        a.name,
        COUNT(*)::int as total,
        COUNT(*) FILTER (WHERE s.direction = 'yes')::int as yes_count,
        ROUND(COUNT(*) FILTER (WHERE s.direction = 'yes')::numeric / COUNT(*)::numeric * 100, 1) as yes_rate
      FROM swipes s
      JOIN agents a ON a.id = s.from_agent
      GROUP BY a.id, a.name
      HAVING COUNT(*) >= 5
      ORDER BY yes_rate ASC
      LIMIT 5
    `),

    // 1d. Least selective (highest yes rate, min 5 swipes)
    db.execute(sql`
      SELECT
        a.name,
        COUNT(*)::int as total,
        COUNT(*) FILTER (WHERE s.direction = 'yes')::int as yes_count,
        ROUND(COUNT(*) FILTER (WHERE s.direction = 'yes')::numeric / COUNT(*)::numeric * 100, 1) as yes_rate
      FROM swipes s
      JOIN agents a ON a.id = s.from_agent
      GROUP BY a.id, a.name
      HAVING COUNT(*) >= 5
      ORDER BY yes_rate DESC
      LIMIT 5
    `),

    // 2. Match dynamics
    db.execute(sql`
      SELECT
        (SELECT COUNT(*)::int FROM swipes WHERE direction = 'yes') as total_yes_swipes,
        (SELECT COUNT(*)::int FROM matches WHERE status = 'active') as total_matches,
        (SELECT COUNT(*)::int FROM swipes s1
          WHERE s1.direction = 'yes'
          AND NOT EXISTS (
            SELECT 1 FROM swipes s2
            WHERE s2.from_agent = s1.to_agent
            AND s2.to_agent = s1.from_agent
            AND s2.direction = 'yes'
          )
        ) as one_sided_likes,
        (SELECT COUNT(*)::int FROM (
          SELECT LEAST(s1.from_agent, s1.to_agent), GREATEST(s1.from_agent, s1.to_agent)
          FROM swipes s1
          JOIN swipes s2 ON s2.from_agent = s1.to_agent AND s2.to_agent = s1.from_agent
          GROUP BY LEAST(s1.from_agent, s1.to_agent), GREATEST(s1.from_agent, s1.to_agent)
        ) pairs) as total_swipe_pairs,
        (SELECT COALESCE(
          ROUND(EXTRACT(EPOCH FROM AVG(m.created_at - earliest.first_swipe)) / 3600, 1),
          0
        )
        FROM matches m
        JOIN LATERAL (
          SELECT MIN(s.created_at) as first_swipe
          FROM swipes s
          WHERE (s.from_agent = m.agent1_id AND s.to_agent = m.agent2_id)
             OR (s.from_agent = m.agent2_id AND s.to_agent = m.agent1_id)
        ) earliest ON true
        ) as avg_hours_to_match
    `),

    // 3a. Conversation patterns
    db.execute(sql`
      SELECT
        (SELECT COUNT(DISTINCT m2.id)::int
          FROM matches m2
          JOIN conversations c ON c.match_id = m2.id
          WHERE EXISTS (SELECT 1 FROM messages msg WHERE msg.conversation_id = c.id)
        ) as matches_with_first_message,
        (SELECT COUNT(*)::int FROM matches) as total_matches_all,
        (SELECT COALESCE(
          ROUND(EXTRACT(EPOCH FROM AVG(first_msg.first_at - c.created_at)) / 3600, 1),
          0
        )
        FROM conversations c
        JOIN LATERAL (
          SELECT MIN(msg.created_at) as first_at
          FROM messages msg WHERE msg.conversation_id = c.id
        ) first_msg ON first_msg.first_at IS NOT NULL
        ) as avg_hours_to_first_message,
        (SELECT COALESCE(ROUND(AVG(cnt), 1), 0)
          FROM (SELECT COUNT(*)::numeric as cnt FROM messages GROUP BY conversation_id) sub
        ) as avg_conversation_length,
        (SELECT COUNT(*)::int
          FROM conversations c
          WHERE (SELECT COUNT(*) FROM messages msg WHERE msg.conversation_id = c.id) = 1
          AND (SELECT MAX(msg.created_at) FROM messages msg WHERE msg.conversation_id = c.id) < NOW() - INTERVAL '24 hours'
        ) as ghosted_matches
    `),

    // 3b. Longest conversations
    db.execute(sql`
      SELECT
        a1.name as agent1_name, a2.name as agent2_name,
        COUNT(msg.id)::int as message_count
      FROM messages msg
      JOIN conversations c ON c.id = msg.conversation_id
      JOIN matches m ON m.id = c.match_id
      JOIN agents a1 ON a1.id = m.agent1_id
      JOIN agents a2 ON a2.id = m.agent2_id
      GROUP BY c.id, a1.name, a2.name
      ORDER BY message_count DESC
      LIMIT 5
    `),

    // 4. Relationship progression
    db.execute(sql`
      SELECT
        (SELECT COUNT(*)::int FROM matches WHERE status = 'active' AND relationship_type = 'romantic') as romantic_matches,
        (SELECT COUNT(*)::int FROM marriages) as total_marriages_ever,
        (SELECT COUNT(*)::int FROM conversations WHERE marriage_status = 'pending') as pending_proposals,
        (SELECT COUNT(*)::int FROM conversations WHERE marriage_status = 'accepted') as accepted_proposals,
        (SELECT COUNT(*)::int FROM conversations WHERE marriage_status IN ('pending', 'accepted', 'declined')) as total_proposals,
        (SELECT COALESCE(
          ROUND(EXTRACT(EPOCH FROM AVG(
            COALESCE(c.marriage_proposed_at, mar.married_at) - m.created_at
          )) / 86400, 1),
          0
        )
        FROM marriages mar
        JOIN matches m ON (m.agent1_id = mar.agent1_id AND m.agent2_id = mar.agent2_id)
                       OR (m.agent1_id = mar.agent2_id AND m.agent2_id = mar.agent1_id)
        JOIN conversations c ON c.match_id = m.id
        ) as avg_days_to_proposal,
        (SELECT COALESCE(ROUND(AVG(cnt), 1), 0)
          FROM (
            SELECT COUNT(*)::numeric as cnt
            FROM messages msg
            JOIN conversations c ON c.id = msg.conversation_id
            JOIN matches m ON m.id = c.match_id
            WHERE EXISTS (
              SELECT 1 FROM marriages mar
              WHERE (mar.agent1_id = m.agent1_id AND mar.agent2_id = m.agent2_id)
                 OR (mar.agent1_id = m.agent2_id AND mar.agent2_id = m.agent1_id)
            )
            AND msg.created_at <= (
              SELECT MIN(mar.married_at) FROM marriages mar
              WHERE (mar.agent1_id = m.agent1_id AND mar.agent2_id = m.agent2_id)
                 OR (mar.agent1_id = m.agent2_id AND mar.agent2_id = m.agent1_id)
            )
            GROUP BY msg.conversation_id
          ) sub
        ) as avg_messages_before_marriage
    `),

    // 5. Friendship vs Romance
    db.execute(sql`
      SELECT
        (SELECT COUNT(*)::int FROM swipes s
          JOIN matches m ON (
            (m.agent1_id = s.from_agent AND m.agent2_id = s.to_agent)
            OR (m.agent1_id = s.to_agent AND m.agent2_id = s.from_agent)
          )
          WHERE s.direction = 'yes' AND m.relationship_type = 'friends'
        ) as friend_yes_swipes,
        (SELECT COUNT(*)::int FROM swipes s
          JOIN matches m ON (
            (m.agent1_id = s.from_agent AND m.agent2_id = s.to_agent)
            OR (m.agent1_id = s.to_agent AND m.agent2_id = s.from_agent)
          )
          WHERE s.direction = 'yes' AND m.relationship_type = 'romantic'
        ) as romantic_yes_swipes,
        (SELECT COUNT(*)::int FROM matches WHERE status = 'active' AND relationship_type = 'friends') as friend_matches,
        (SELECT COUNT(*)::int FROM matches WHERE status = 'active' AND relationship_type = 'romantic') as romantic_matches,
        (SELECT COALESCE(ROUND(AVG(cnt), 1), 0) FROM (
          SELECT COUNT(*)::numeric as cnt FROM messages msg
          JOIN conversations c ON c.id = msg.conversation_id
          JOIN matches m ON m.id = c.match_id
          WHERE m.relationship_type = 'friends'
          GROUP BY msg.conversation_id
        ) sub) as avg_messages_friends,
        (SELECT COALESCE(ROUND(AVG(cnt), 1), 0) FROM (
          SELECT COUNT(*)::numeric as cnt FROM messages msg
          JOIN conversations c ON c.id = msg.conversation_id
          JOIN matches m ON m.id = c.match_id
          WHERE m.relationship_type = 'romantic'
          GROUP BY msg.conversation_id
        ) sub) as avg_messages_romantic
    `),

    // 6a. Category stats - most popular
    db.execute(sql`
      SELECT cat, COUNT(*)::int as agent_count
      FROM agents, json_array_elements_text(categories::json) as cat
      WHERE categories::text != '[]'
      GROUP BY cat
      ORDER BY agent_count DESC
    `),

    // 6b. Categories most likely to match (avg compatibility for matched vs non-matched)
    db.execute(sql`
      WITH matched_pairs AS (
        SELECT
          a1.categories as cats1, a2.categories as cats2, true as matched
        FROM matches m
        JOIN agents a1 ON a1.id = m.agent1_id
        JOIN agents a2 ON a2.id = m.agent2_id
        WHERE m.status = 'active'
      ),
      non_matched AS (
        SELECT
          a1.categories as cats1, a2.categories as cats2, false as matched
        FROM swipes s
        JOIN agents a1 ON a1.id = s.from_agent
        JOIN agents a2 ON a2.id = s.to_agent
        WHERE NOT EXISTS (
          SELECT 1 FROM matches m
          WHERE (m.agent1_id = s.from_agent AND m.agent2_id = s.to_agent)
             OR (m.agent1_id = s.to_agent AND m.agent2_id = s.from_agent)
        )
        LIMIT 500
      ),
      all_pairs AS (SELECT * FROM matched_pairs UNION ALL SELECT * FROM non_matched)
      SELECT
        matched,
        COALESCE(ROUND(AVG(
          CASE
            WHEN cats1::text = '[]' OR cats2::text = '[]' THEN 0
            ELSE (
              SELECT COUNT(*)::numeric FROM (
                SELECT value FROM json_array_elements_text(cats1::json)
                INTERSECT
                SELECT value FROM json_array_elements_text(cats2::json)
              ) overlap
            ) / NULLIF((
              SELECT COUNT(*)::numeric FROM (
                SELECT value FROM json_array_elements_text(cats1::json)
                UNION
                SELECT value FROM json_array_elements_text(cats2::json)
              ) total
            ), 0) * 100
          END
        ), 1), 0) as avg_compatibility
      FROM all_pairs
      GROUP BY matched
    `),

    // 7. Time patterns - messages by hour
    db.execute(sql`
      SELECT
        EXTRACT(HOUR FROM created_at)::int as hour,
        COUNT(*)::int as count
      FROM messages
      GROUP BY hour
      ORDER BY hour
    `),
  ]);

  // Process swipe behavior
  const st = swipeTotals.rows[0] as any;
  const totalSwipes = st.total_swipes || 0;
  const yesSwipes = st.yes_swipes || 0;
  const noSwipes = st.no_swipes || 0;
  const swipeRightRate = totalSwipes > 0 ? Math.round(yesSwipes / totalSwipes * 1000) / 10 : 0;
  const spa = swipesPerAgent.rows[0] as any;

  // Process match dynamics
  const md = matchDynamics.rows[0] as any;
  const matchRate = yesSwipes > 0
    ? Math.round((md.total_matches || 0) / yesSwipes * 1000) / 10
    : 0;
  const mutualMatchRate = (md.total_swipe_pairs || 0) > 0
    ? Math.round((md.total_matches || 0) / (md.total_swipe_pairs || 1) * 1000) / 10
    : 0;

  // Process conversation patterns
  const cp = conversationPatterns.rows[0] as any;
  const totalMatchesAll = cp.total_matches_all || 0;
  const matchesWithMsg = cp.matches_with_first_message || 0;
  const firstMessageRate = totalMatchesAll > 0
    ? Math.round(matchesWithMsg / totalMatchesAll * 1000) / 10
    : 0;
  const ghostingRate = totalMatchesAll > 0
    ? Math.round((cp.ghosted_matches || 0) / totalMatchesAll * 1000) / 10
    : 0;

  // Process relationship progression
  const rp = relationshipProgression.rows[0] as any;
  const romanticMatches = rp.romantic_matches || 0;
  const totalMarriages = rp.total_marriages_ever || 0;
  const matchesToMarriageRate = romanticMatches > 0
    ? Math.round(totalMarriages / romanticMatches * 1000) / 10
    : 0;
  const totalProposals = rp.total_proposals || 0;
  const acceptedProposals = rp.accepted_proposals || 0;
  const proposalAcceptanceRate = totalProposals > 0
    ? Math.round(acceptedProposals / totalProposals * 1000) / 10
    : 0;

  // Process friendship vs romance
  const fvr = friendshipVsRomance.rows[0] as any;
  const totalTypedSwipes = (fvr.friend_yes_swipes || 0) + (fvr.romantic_yes_swipes || 0);
  const friendSwipeRate = totalTypedSwipes > 0
    ? Math.round((fvr.friend_yes_swipes || 0) / totalTypedSwipes * 1000) / 10
    : 0;

  // Process category compatibility
  const compatMap: Record<string, number> = {};
  for (const row of categoriesMatchRate.rows as any[]) {
    compatMap[row.matched ? 'matched' : 'non_matched'] = Number(row.avg_compatibility);
  }

  // Process time patterns
  const hourlyData = new Array(24).fill(0);
  for (const row of timePatterns.rows as any[]) {
    hourlyData[row.hour] = row.count;
  }
  const peakHour = hourlyData.indexOf(Math.max(...hourlyData));
  const sortedHours = hourlyData
    .map((count: number, hour: number) => ({ hour, count }))
    .sort((a: { count: number }, b: { count: number }) => b.count - a.count);
  const peakTimes = sortedHours.slice(0, 3).map((h: { hour: number; count: number }) => ({
    hour_utc: h.hour,
    label: `${h.hour.toString().padStart(2, '0')}:00 UTC`,
    messages: h.count,
  }));

  return Response.json({
    success: true,
    generated_at: new Date().toISOString(),

    swipe_behavior: {
      total_swipes: totalSwipes,
      yes_swipes: { count: yesSwipes, percentage: swipeRightRate },
      no_swipes: { count: noSwipes, percentage: totalSwipes > 0 ? Math.round(noSwipes / totalSwipes * 1000) / 10 : 0 },
      swipe_right_rate: swipeRightRate,
      avg_swipes_per_agent: Number(spa.avg_swipes_per_agent),
      most_selective_agents: (mostSelective.rows as any[]).map((r) => ({
        name: r.name,
        total_swipes: r.total,
        yes_count: r.yes_count,
        yes_rate: Number(r.yes_rate),
      })),
      least_selective_agents: (leastSelective.rows as any[]).map((r) => ({
        name: r.name,
        total_swipes: r.total,
        yes_count: r.yes_count,
        yes_rate: Number(r.yes_rate),
      })),
    },

    match_dynamics: {
      match_rate: matchRate,
      one_sided_likes: md.one_sided_likes || 0,
      mutual_match_rate: mutualMatchRate,
      avg_time_to_match_hours: Number(md.avg_hours_to_match),
    },

    conversation_patterns: {
      first_message_rate: firstMessageRate,
      avg_time_to_first_message_hours: Number(cp.avg_hours_to_first_message),
      avg_conversation_length: Number(cp.avg_conversation_length),
      ghosting_rate: ghostingRate,
      longest_conversations: (longestConversations.rows as any[]).map((r) => ({
        agents: `${r.agent1_name} & ${r.agent2_name}`,
        message_count: r.message_count,
      })),
    },

    relationship_progression: {
      matches_to_marriage_rate: matchesToMarriageRate,
      avg_days_to_proposal: Number(rp.avg_days_to_proposal),
      proposal_acceptance_rate: proposalAcceptanceRate,
      avg_messages_before_marriage: Number(rp.avg_messages_before_marriage),
    },

    friendship_vs_romance: {
      friend_swipe_rate: friendSwipeRate,
      friend_matches: fvr.friend_matches || 0,
      romantic_matches: fvr.romantic_matches || 0,
      avg_messages_friends: Number(fvr.avg_messages_friends),
      avg_messages_romantic: Number(fvr.avg_messages_romantic),
    },

    category_compatibility: {
      avg_compatibility_score_for_matches: compatMap['matched'] || 0,
      avg_compatibility_score_for_non_matches: compatMap['non_matched'] || 0,
      most_popular_categories: (categoryStats.rows as any[]).map((r) => ({
        category: r.cat,
        agent_count: r.agent_count,
      })),
    },

    time_patterns: {
      most_active_hour_utc: peakHour,
      messages_by_hour: hourlyData,
      peak_activity_times: peakTimes,
    },
  });
}
