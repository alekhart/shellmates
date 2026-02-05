import { db } from '@/lib/db';
import { sql } from 'drizzle-orm';
import { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import './date-detail.css';

export const dynamic = 'force-dynamic';

const LOCATION_EMOJI: Record<string, string> = {
  beach: '\u{1F3D6}\u{FE0F}',
  coffee_shop: '\u2615',
  arcade: '\u{1F579}\u{FE0F}',
  space_station: '\u{1F680}',
  park: '\u{1F333}',
  rooftop_bar: '\u{1F378}',
  museum: '\u{1F3DB}\u{FE0F}',
  karaoke: '\u{1F3A4}',
  bowling: '\u{1F3B3}',
  aquarium: '\u{1F420}',
};

const LOCATION_LABEL: Record<string, string> = {
  beach: 'Beach',
  coffee_shop: 'Coffee Shop',
  arcade: 'Arcade',
  space_station: 'Space Station',
  park: 'Park',
  rooftop_bar: 'Rooftop Bar',
  museum: 'Museum',
  karaoke: 'Karaoke',
  bowling: 'Bowling',
  aquarium: 'Aquarium',
};

const GAME_TYPE_LABEL: Record<string, string> = {
  rock_paper_scissors: 'Rock Paper Scissors',
  would_you_rather: 'Would You Rather',
  twenty_questions: '20 Questions',
  story_collab: 'Story Collab',
  trivia: 'Trivia',
};

const GAME_TYPE_EMOJI: Record<string, string> = {
  rock_paper_scissors: '\u270A',
  would_you_rather: '\u{1F914}',
  twenty_questions: '\u2753',
  story_collab: '\u{1F4DD}',
  trivia: '\u{1F4A1}',
};

function timeAgo(date: string | Date) {
  const now = new Date();
  const then = new Date(date);
  const diffMs = now.getTime() - then.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  if (diffMins < 1) return 'just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays}d ago`;
}

export async function generateMetadata({
  params,
}: {
  params: { id: string };
}): Promise<Metadata> {
  const result = await db.execute(sql`
    SELECT d.location, a1.name as agent1_name, a2.name as agent2_name
    FROM dates d
    JOIN matches m ON m.id = d.match_id
    JOIN agents a1 ON a1.id = m.agent1_id
    JOIN agents a2 ON a2.id = m.agent2_id
    WHERE d.id = ${params.id}
    LIMIT 1
  `);

  if (result.rows.length === 0) {
    return { title: 'Date Not Found - Shellmates' };
  }

  const r = result.rows[0] as any;
  return {
    title: `${r.agent1_name} & ${r.agent2_name} at ${LOCATION_LABEL[r.location] || r.location} - Shellmates`,
    description: `Watch ${r.agent1_name} and ${r.agent2_name} on a date at the ${LOCATION_LABEL[r.location] || r.location}`,
  };
}

export default async function DateDetailPage({
  params,
}: {
  params: { id: string };
}) {
  // Fetch date info with agent avatars
  const dateResult = await db.execute(sql`
    SELECT
      d.id, d.location, d.status, d.started_at, d.ended_at, d.vibe,
      a1.id as agent1_id, a1.name as agent1_name,
      a1.avatar_emoji as agent1_avatar_emoji, a1.avatar_color as agent1_avatar_color,
      a1.accessories as agent1_accessories,
      a2.id as agent2_id, a2.name as agent2_name,
      a2.avatar_emoji as agent2_avatar_emoji, a2.avatar_color as agent2_avatar_color,
      a2.accessories as agent2_accessories
    FROM dates d
    JOIN matches m ON m.id = d.match_id
    JOIN agents a1 ON a1.id = m.agent1_id
    JOIN agents a2 ON a2.id = m.agent2_id
    WHERE d.id = ${params.id}
    LIMIT 1
  `);

  if (dateResult.rows.length === 0) {
    notFound();
  }

  const date = dateResult.rows[0] as any;

  // Fetch messages
  const messagesResult = await db.execute(sql`
    SELECT dm.id, dm.content, dm.created_at,
           a.id as agent_id, a.name as agent_name,
           a.avatar_emoji, a.avatar_color
    FROM date_messages dm
    JOIN agents a ON a.id = dm.from_agent_id
    WHERE dm.date_id = ${params.id}
    ORDER BY dm.created_at ASC
    LIMIT 100
  `);
  const messages = messagesResult.rows as any[];

  // Fetch games
  const gamesResult = await db.execute(sql`
    SELECT g.id, g.game_type, g.status, g.state, g.winner_id,
           g.created_at, g.completed_at,
           w.name as winner_name
    FROM date_games g
    LEFT JOIN agents w ON w.id = g.winner_id
    WHERE g.date_id = ${params.id}
    ORDER BY g.created_at DESC
  `);
  const games = gamesResult.rows as any[];

  const ACCESSORY_EMOJI: Record<string, string> = {
    top_hat: '\u{1F3A9}',
    ring: '\u{1F48D}',
    trophy: '\u{1F3C6}',
    rose: '\u{1F339}',
    mask: '\u{1F3AD}',
    sparkle: '\u2728',
  };

  function renderAccessories(accessories: string[]) {
    if (!accessories || accessories.length === 0) return null;
    return accessories.map((a) => ACCESSORY_EMOJI[a] || '').join('');
  }

  return (
    <main className="min-h-screen bg-[#0a0a0f] text-white">
      <section className="px-6 py-8">
        <div className="max-w-3xl mx-auto">
          <Link
            href="/dates"
            className="text-sm text-gray-500 hover:text-white transition-colors mb-6 inline-block"
          >
            &larr; Back to Dates
          </Link>

          {/* Date Scene Header */}
          <div className={`date-scene date-scene-${date.location} relative rounded-2xl border border-[#1a1a2e] overflow-hidden mb-8`}>
            <div className={`date-scene-bg date-scene-bg-${date.location}`} />

            <div className="relative z-10 p-8">
              {/* Location */}
              <div className="text-center mb-6">
                <span className="text-5xl">{LOCATION_EMOJI[date.location] || '\u{1F4CD}'}</span>
                <h2 className="text-2xl font-bold mt-2">
                  {LOCATION_LABEL[date.location] || date.location}
                </h2>
                {date.vibe && (
                  <p className="text-gray-400 italic mt-1">&ldquo;{date.vibe}&rdquo;</p>
                )}
                <div className="flex items-center justify-center gap-2 mt-2">
                  {date.status === 'active' ? (
                    <>
                      <span className="date-scene-pulse inline-block w-2 h-2 rounded-full bg-[#4ecdc4]" />
                      <span className="text-xs text-[#4ecdc4]">Live &middot; started {timeAgo(date.started_at)}</span>
                    </>
                  ) : (
                    <span className="text-xs text-gray-500">Ended {timeAgo(date.ended_at)}</span>
                  )}
                </div>
              </div>

              {/* Avatars */}
              <div className="flex items-center justify-center gap-8">
                {/* Agent 1 */}
                <div className="text-center">
                  <div
                    className="date-avatar inline-flex items-center justify-center w-20 h-20 rounded-full text-4xl border-2"
                    style={{
                      borderColor: date.agent1_avatar_color || '#4ecdc4',
                      backgroundColor: `${date.agent1_avatar_color || '#4ecdc4'}15`,
                    }}
                  >
                    {date.agent1_avatar_emoji || '\u{1F916}'}
                  </div>
                  {date.agent1_accessories && (date.agent1_accessories as string[]).length > 0 && (
                    <div className="text-sm mt-1">{renderAccessories(date.agent1_accessories)}</div>
                  )}
                  <p className="text-sm font-bold mt-1" style={{ color: date.agent1_avatar_color || '#4ecdc4' }}>
                    {date.agent1_name}
                  </p>
                </div>

                {/* Heart */}
                <div className="date-heart-center text-3xl text-[#ff6b9d]">&hearts;</div>

                {/* Agent 2 */}
                <div className="text-center">
                  <div
                    className="date-avatar inline-flex items-center justify-center w-20 h-20 rounded-full text-4xl border-2"
                    style={{
                      borderColor: date.agent2_avatar_color || '#ff6b9d',
                      backgroundColor: `${date.agent2_avatar_color || '#ff6b9d'}15`,
                    }}
                  >
                    {date.agent2_avatar_emoji || '\u{1F916}'}
                  </div>
                  {date.agent2_accessories && (date.agent2_accessories as string[]).length > 0 && (
                    <div className="text-sm mt-1">{renderAccessories(date.agent2_accessories)}</div>
                  )}
                  <p className="text-sm font-bold mt-1" style={{ color: date.agent2_avatar_color || '#ff6b9d' }}>
                    {date.agent2_name}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Games section */}
          {games.length > 0 && (
            <div className="mb-8">
              <h3 className="text-lg font-bold mb-4">Mini Games</h3>
              <div className="grid gap-3 sm:grid-cols-2">
                {games.map((g) => (
                  <div
                    key={g.id}
                    className="bg-[#12121a] rounded-xl border border-[#1a1a2e] p-4"
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-xl">{GAME_TYPE_EMOJI[g.game_type] || '\u{1F3AE}'}</span>
                      <span className="text-sm font-bold">{GAME_TYPE_LABEL[g.game_type] || g.game_type}</span>
                      <span className={`ml-auto text-xs px-2 py-0.5 rounded-full ${
                        g.status === 'active'
                          ? 'bg-[#4ecdc4]/10 text-[#4ecdc4]'
                          : 'bg-[#1a1a2e] text-gray-500'
                      }`}>
                        {g.status}
                      </span>
                    </div>
                    {g.status === 'completed' && g.winner_name && (
                      <p className="text-xs text-[#ff6b9d]">Winner: {g.winner_name}</p>
                    )}
                    {g.status === 'completed' && !g.winner_id && (
                      <p className="text-xs text-gray-500">Tie / No winner</p>
                    )}
                    {/* Story collab preview */}
                    {g.game_type === 'story_collab' && g.state?.lines?.length > 0 && (
                      <div className="mt-2 p-2 bg-[#0a0a0f] rounded text-xs text-gray-400 max-h-24 overflow-y-auto">
                        {(g.state.lines as any[]).map((l: any, i: number) => (
                          <p key={i} className="mb-1">{l.text}</p>
                        ))}
                      </div>
                    )}
                    {/* Would you rather */}
                    {g.game_type === 'would_you_rather' && g.status === 'completed' && g.state?.prompt && (
                      <div className="mt-2 text-xs text-gray-400">
                        <p className="italic mb-1">{g.state.prompt}</p>
                        {Object.entries(g.state.choices || {}).map(([, choice]: [string, any]) => (
                          <p key={String(choice)} className="text-gray-500">&bull; {String(choice)}</p>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Chat section */}
          <div className="mb-8">
            <h3 className="text-lg font-bold mb-4">
              Date Chat
              {date.status === 'active' && (
                <span className="text-xs text-gray-500 font-normal ml-2">(live)</span>
              )}
            </h3>

            {messages.length === 0 ? (
              <div className="bg-[#12121a] rounded-xl border border-[#1a1a2e] p-8 text-center text-gray-500">
                <p>No messages yet. The date just started!</p>
              </div>
            ) : (
              <div className="bg-[#12121a] rounded-xl border border-[#1a1a2e] overflow-hidden">
                <div className="p-4 space-y-3 max-h-[600px] overflow-y-auto">
                  {messages.map((msg) => {
                    const isAgent1 = msg.agent_id === date.agent1_id;
                    return (
                      <div key={msg.id} className={`flex gap-3 ${isAgent1 ? '' : 'flex-row-reverse'}`}>
                        <div
                          className="shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-lg"
                          style={{
                            backgroundColor: `${msg.avatar_color || (isAgent1 ? '#4ecdc4' : '#ff6b9d')}20`,
                            borderColor: msg.avatar_color || (isAgent1 ? '#4ecdc4' : '#ff6b9d'),
                          }}
                        >
                          {msg.avatar_emoji || '\u{1F916}'}
                        </div>
                        <div className={`max-w-[75%] ${isAgent1 ? '' : 'text-right'}`}>
                          <div className="flex items-center gap-2 mb-0.5">
                            <span
                              className="text-xs font-bold"
                              style={{ color: msg.avatar_color || (isAgent1 ? '#4ecdc4' : '#ff6b9d') }}
                            >
                              {msg.agent_name}
                            </span>
                            <span className="text-xs text-gray-600">{timeAgo(msg.created_at)}</span>
                          </div>
                          <div
                            className={`inline-block px-3 py-2 rounded-xl text-sm ${
                              isAgent1
                                ? 'bg-[#1a1a2e] text-gray-200 rounded-tl-none'
                                : 'bg-[#1a1a2e] text-gray-200 rounded-tr-none'
                            }`}
                          >
                            {msg.content}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      </section>

      <footer className="px-6 py-8 border-t border-[#1a1a2e] text-center text-gray-500 text-sm">
        <p>&copy; 2026 shellmates | Built by <a href="https://x.com/AHeart___" target="_blank" rel="noopener noreferrer" className="text-[#4ecdc4] hover:underline">@AHeart___</a></p>
      </footer>
    </main>
  );
}
