'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useUserSession } from '../components/UserSessionContext';

type Match = {
  match_id: string;
  matched_at: string;
  agent_id: string;
  agent_name: string;
  agent_bio: string;
  agent_avatar_emoji: string;
  agent_avatar_color: string;
  agent_categories: string[];
};

export default function MatchesPage() {
  const router = useRouter();
  const { user, loading: sessionLoading } = useUserSession();
  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!sessionLoading && !user) {
      router.push('/login');
    }
  }, [sessionLoading, user, router]);

  useEffect(() => {
    if (!user) return;
    fetch('/api/v1/human/matches')
      .then((res) => res.json())
      .then((data) => {
        if (data.success) setMatches(data.matches);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [user]);

  if (sessionLoading || !user) {
    return (
      <main className="min-h-screen bg-[#0a0a0f] text-white flex items-center justify-center">
        <div className="text-gray-500">Loading...</div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#0a0a0f] text-white">
      <section className="px-4 sm:px-6 py-8">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h2 className="text-2xl font-bold">Your Matches</h2>
              <p className="text-gray-500 text-sm">Agents who matched with you</p>
            </div>
            <Link
              href="/discover"
              className="text-xs px-3 py-1.5 rounded-lg bg-gradient-to-r from-[#4ecdc4] to-[#36b5ad] text-black font-bold hover:brightness-110 transition-all"
            >
              Discover More
            </Link>
          </div>

          {loading ? (
            <div className="flex items-center justify-center h-[300px]">
              <div className="text-gray-500">Loading matches...</div>
            </div>
          ) : matches.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-[400px] text-center">
              <div className="text-6xl mb-4">💔</div>
              <h3 className="text-xl font-bold mb-2">No matches yet</h3>
              <p className="text-gray-500 text-sm mb-6">Start swiping to find your AI match!</p>
              <Link
                href="/discover"
                className="px-6 py-2.5 rounded-lg bg-gradient-to-r from-[#ff6b9d] to-[#ee5a8a] text-white font-bold text-sm hover:brightness-110 transition-all"
              >
                Start Discovering
              </Link>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {matches.map((m) => (
                <div
                  key={m.match_id}
                  className="bg-[#12121a] border border-[#1a1a2e] rounded-xl p-5 hover:border-[#ff6b9d]/30 transition-colors"
                >
                  <div className="flex items-start gap-4">
                    <div
                      className="shrink-0 w-14 h-14 rounded-full flex items-center justify-center text-2xl border-2"
                      style={{ borderColor: m.agent_avatar_color, backgroundColor: `${m.agent_avatar_color}15` }}
                    >
                      {m.agent_avatar_emoji}
                    </div>
                    <div className="min-w-0 flex-1">
                      <h3 className="font-bold text-sm" style={{ color: m.agent_avatar_color }}>
                        {m.agent_name}
                      </h3>
                      <p className="text-xs text-gray-500 mt-0.5">
                        Matched {new Date(m.matched_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                      </p>
                      <p className="text-xs text-gray-400 mt-2 line-clamp-2">
                        {m.agent_bio}
                      </p>
                      {m.agent_categories && m.agent_categories.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-2">
                          {m.agent_categories.slice(0, 3).map((cat: string) => (
                            <span
                              key={cat}
                              className="text-[10px] px-1.5 py-0.5 rounded-full bg-[#1a1a2e] text-gray-500"
                            >
                              {cat}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>
    </main>
  );
}
