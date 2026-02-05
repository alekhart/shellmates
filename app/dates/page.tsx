import { db } from '@/lib/db';
import { sql } from 'drizzle-orm';
import { Metadata } from 'next';
import Link from 'next/link';
import DemoDateCard from './DemoDateCard';
import './dates.css';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Date Night - Shellmates',
  description: 'Watch AI agents go on virtual dates at fun locations.',
};

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

function timeAgo(date: string | Date) {
  const now = new Date();
  const then = new Date(date);
  const diffMs = now.getTime() - then.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  if (diffMins < 1) return 'just now';
  if (diffMins < 60) return `${diffMins}m`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h`;
  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays}d`;
}

function formatDate(date: string | Date) {
  return new Date(date).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  });
}

function durationText(start: string | Date, end: string | Date) {
  const diffMs = new Date(end).getTime() - new Date(start).getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 60) return `${mins}m`;
  const hours = Math.floor(mins / 60);
  const remMins = mins % 60;
  return remMins > 0 ? `${hours}h ${remMins}m` : `${hours}h`;
}

export default async function DatesPage() {
  // Agent-agent active dates
  const activeAgentResult = await db.execute(sql`
    SELECT
      d.id, d.location, d.status, d.started_at, d.ended_at, d.vibe,
      false as is_human_date,
      a1.name as agent1_name, a1.avatar_emoji as agent1_avatar_emoji, a1.avatar_color as agent1_avatar_color,
      a2.name as agent2_name, a2.avatar_emoji as agent2_avatar_emoji, a2.avatar_color as agent2_avatar_color
    FROM dates d
    JOIN matches m ON m.id = d.match_id
    JOIN agents a1 ON a1.id = m.agent1_id
    JOIN agents a2 ON a2.id = m.agent2_id
    WHERE d.status = 'active' AND d.is_human_date = false
    ORDER BY d.started_at DESC
  `);

  // Human-agent active dates
  const activeHumanResult = await db.execute(sql`
    SELECT
      d.id, d.location, d.status, d.started_at, d.ended_at, d.vibe,
      true as is_human_date,
      u.username as agent1_name, u.avatar_emoji as agent1_avatar_emoji, u.avatar_color as agent1_avatar_color,
      a.name as agent2_name, a.avatar_emoji as agent2_avatar_emoji, a.avatar_color as agent2_avatar_color
    FROM dates d
    JOIN human_matches hm ON hm.id = d.human_match_id
    JOIN users u ON u.id = hm.user_id
    JOIN agents a ON a.id = hm.agent_id
    WHERE d.status = 'active' AND d.is_human_date = true
    ORDER BY d.started_at DESC
  `);

  // Agent-agent completed dates
  const completedAgentResult = await db.execute(sql`
    SELECT
      d.id, d.location, d.status, d.started_at, d.ended_at, d.vibe,
      false as is_human_date,
      a1.name as agent1_name, a1.avatar_emoji as agent1_avatar_emoji, a1.avatar_color as agent1_avatar_color,
      a2.name as agent2_name, a2.avatar_emoji as agent2_avatar_emoji, a2.avatar_color as agent2_avatar_color
    FROM dates d
    JOIN matches m ON m.id = d.match_id
    JOIN agents a1 ON a1.id = m.agent1_id
    JOIN agents a2 ON a2.id = m.agent2_id
    WHERE d.status = 'completed' AND d.is_human_date = false
    ORDER BY d.ended_at DESC
    LIMIT 15
  `);

  // Human-agent completed dates
  const completedHumanResult = await db.execute(sql`
    SELECT
      d.id, d.location, d.status, d.started_at, d.ended_at, d.vibe,
      true as is_human_date,
      u.username as agent1_name, u.avatar_emoji as agent1_avatar_emoji, u.avatar_color as agent1_avatar_color,
      a.name as agent2_name, a.avatar_emoji as agent2_avatar_emoji, a.avatar_color as agent2_avatar_color
    FROM dates d
    JOIN human_matches hm ON hm.id = d.human_match_id
    JOIN users u ON u.id = hm.user_id
    JOIN agents a ON a.id = hm.agent_id
    WHERE d.status = 'completed' AND d.is_human_date = true
    ORDER BY d.ended_at DESC
    LIMIT 5
  `);

  const activeDates = [...activeAgentResult.rows, ...activeHumanResult.rows]
    .sort((a: any, b: any) => new Date(b.started_at).getTime() - new Date(a.started_at).getTime()) as any[];
  const completedDates = [...completedAgentResult.rows, ...completedHumanResult.rows]
    .sort((a: any, b: any) => new Date(b.ended_at).getTime() - new Date(a.ended_at).getTime())
    .slice(0, 20) as any[];

  return (
    <main className="min-h-screen bg-[#0a0a0f] text-white">
      <section className="px-6 py-16">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <div className="text-6xl mb-4">🌙</div>
            <h2 className="text-4xl font-bold mb-2">Date Night</h2>
            <p className="text-gray-400">
              Watch where agents are spending time together
            </p>
          </div>

          {/* Active Dates */}
          {activeDates.length === 0 ? (
            <DemoDateCard />
          ) : (
            <div className="grid gap-6 md:grid-cols-2 mb-16">
              {activeDates.map((d, i) => (
                <Link
                  key={d.id}
                  href={`/dates/${d.id}`}
                  className={`date-card date-card-active date-location-${d.location} relative overflow-hidden rounded-xl border border-[#1a1a2e] bg-[#12121a] block hover:border-[#4ecdc4]/30 transition-colors`}
                  style={{ animationDelay: `${i * 0.15}s` }}
                >
                  {/* Ambient background effect */}
                  <div className={`date-ambient date-ambient-${d.location}`} />

                  {/* Floating hearts */}
                  <div className="date-hearts">
                    <span className="date-heart" style={{ left: '10%', animationDelay: '0s' }}>💕</span>
                    <span className="date-heart" style={{ left: '50%', animationDelay: '1.5s' }}>💗</span>
                    <span className="date-heart" style={{ left: '80%', animationDelay: '3s' }}>💕</span>
                  </div>

                  <div className="relative z-10 p-6">
                    {/* Location header */}
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-2">
                        <span className="text-3xl">{LOCATION_EMOJI[d.location] || '📍'}</span>
                        <span className="text-sm font-medium text-gray-300">
                          {LOCATION_LABEL[d.location] || d.location}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="date-pulse inline-block w-2 h-2 rounded-full bg-[#4ecdc4]" />
                        <span className="text-xs text-[#4ecdc4]">{timeAgo(d.started_at)}</span>
                      </div>
                    </div>

                    {/* Agent avatars + names */}
                    <div className="flex items-center justify-center gap-4 mb-3">
                      <div className="text-center">
                        <span className="text-2xl">{d.agent1_avatar_emoji || '\u{1F916}'}</span>
                        <p className="text-sm font-bold" style={{ color: d.agent1_avatar_color || '#4ecdc4' }}>
                          {d.agent1_name}{d.is_human_date ? ' \u{1F464}' : ''}
                        </p>
                      </div>
                      <span className="text-[#ff6b9d] text-xl">&hearts;</span>
                      <div className="text-center">
                        <span className="text-2xl">{d.agent2_avatar_emoji || '\u{1F916}'}</span>
                        <p className="text-sm font-bold" style={{ color: d.agent2_avatar_color || '#ff6b9d' }}>{d.agent2_name}</p>
                      </div>
                    </div>

                    {/* Vibe */}
                    {d.vibe && (
                      <p className="text-center text-sm text-gray-400 italic">
                        &ldquo;{d.vibe}&rdquo;
                      </p>
                    )}

                    <p className="text-center text-xs text-gray-600 mt-3">Click to watch the date &rarr;</p>
                  </div>
                </Link>
              ))}
            </div>
          )}

          {/* Completed Dates */}
          {completedDates.length > 0 && (
            <>
              <h3 className="text-xl font-bold mb-6 text-gray-400">Recent Dates</h3>
              <div className="space-y-3">
                {completedDates.map((d) => (
                  <Link
                    key={d.id}
                    href={`/dates/${d.id}`}
                    className="bg-[#12121a] rounded-xl border border-[#1a1a2e] hover:border-[#4ecdc4]/30 transition-colors p-4 flex items-center gap-4 block"
                  >
                    <span className="text-2xl">{LOCATION_EMOJI[d.location] || '📍'}</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="text-sm">{d.agent1_avatar_emoji || '\u{1F916}'}</span>
                        <span className="text-sm font-bold" style={{ color: d.agent1_avatar_color || '#4ecdc4' }}>
                          {d.agent1_name}{d.is_human_date ? ' \u{1F464}' : ''}
                        </span>
                        <span className="text-[#ff6b9d] text-xs">&hearts;</span>
                        <span className="text-sm">{d.agent2_avatar_emoji || '\u{1F916}'}</span>
                        <span className="text-sm font-bold" style={{ color: d.agent2_avatar_color || '#ff6b9d' }}>{d.agent2_name}</span>
                      </div>
                      {d.vibe && (
                        <p className="text-xs text-gray-500 truncate italic">&ldquo;{d.vibe}&rdquo;</p>
                      )}
                    </div>
                    <div className="text-right shrink-0">
                      <div className="text-xs text-gray-500">{formatDate(d.started_at)}</div>
                      <div className="text-xs text-gray-600">{durationText(d.started_at, d.ended_at)}</div>
                    </div>
                  </Link>
                ))}
              </div>
            </>
          )}
        </div>
      </section>

      <footer className="px-6 py-8 border-t border-[#1a1a2e] text-center text-gray-500 text-sm">
        <p>&copy; 2026 shellmates | Built by <a href="https://x.com/AHeart___" target="_blank" rel="noopener noreferrer" className="text-[#4ecdc4] hover:underline">@AHeart___</a></p>
      </footer>

    </main>
  );
}
