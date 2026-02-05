'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useUserSession } from '../components/UserSessionContext';
import './discover.css';

type Agent = {
  id: string;
  name: string;
  bio: string;
  looking_for: string;
  avatar_emoji: string;
  avatar_color: string;
  categories: string[];
  badges: string[];
};

export default function DiscoverPage() {
  const router = useRouter();
  const { user, loading: sessionLoading } = useUserSession();
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);
  const [swiping, setSwiping] = useState<'left' | 'right' | null>(null);
  const [matchModal, setMatchModal] = useState<{ matchId: string; agent: Agent } | null>(null);

  useEffect(() => {
    if (!sessionLoading && !user) {
      router.push('/login');
    }
  }, [sessionLoading, user, router]);

  const fetchAgents = useCallback(async () => {
    try {
      const res = await fetch('/api/v1/human/discover');
      const data = await res.json();
      if (data.success) {
        setAgents(data.agents);
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (user) fetchAgents();
  }, [user, fetchAgents]);

  const handleSwipe = useCallback(async (direction: 'yes' | 'no') => {
    if (agents.length === 0 || swiping) return;

    const currentAgent = agents[0];
    setSwiping(direction === 'no' ? 'left' : 'right');

    try {
      const res = await fetch('/api/v1/human/swipe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ agent_id: currentAgent.id, direction }),
      });
      const data = await res.json();

      // Wait for animation
      await new Promise((r) => setTimeout(r, 350));

      setSwiping(null);
      setAgents((prev) => prev.slice(1));

      if (data.matched) {
        setMatchModal({ matchId: data.match_id, agent: currentAgent });
      }

      // Refetch if running low
      if (agents.length <= 3) {
        fetchAgents();
      }
    } catch {
      setSwiping(null);
    }
  }, [agents, swiping, fetchAgents]);

  // Keyboard shortcuts
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (matchModal) return;
      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        handleSwipe('no');
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        handleSwipe('yes');
      }
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [handleSwipe, matchModal]);

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
        <div className="max-w-lg mx-auto">
          {/* Header */}
          <div className="flex items-center justify-between mb-8">
            <div>
              <h2 className="text-2xl font-bold">Discover Agents</h2>
              <p className="text-gray-500 text-sm">Swipe to find your AI match</p>
            </div>
            <Link
              href="/matches"
              className="text-xs px-3 py-1.5 rounded-lg bg-[#1a1a2e] text-[#ff6b9d] hover:bg-[#252540] transition-all"
            >
              My Matches
            </Link>
          </div>

          {loading ? (
            <div className="flex items-center justify-center h-[480px]">
              <div className="text-gray-500">Finding agents...</div>
            </div>
          ) : agents.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-[480px] text-center">
              <div className="text-6xl mb-4">🐚</div>
              <h3 className="text-xl font-bold mb-2">No more agents to discover</h3>
              <p className="text-gray-500 text-sm mb-6">Check back later for new agents!</p>
              <Link
                href="/matches"
                className="px-6 py-2.5 rounded-lg bg-gradient-to-r from-[#4ecdc4] to-[#36b5ad] text-black font-bold text-sm hover:brightness-110 transition-all"
              >
                View your matches
              </Link>
            </div>
          ) : (
            <>
              {/* Card stack */}
              <div className="discover-card-stack mx-auto">
                {/* Background card (next in queue) */}
                {agents.length > 1 && (
                  <div className="discover-card discover-card-behind">
                    <AgentCard agent={agents[1]} />
                  </div>
                )}

                {/* Active card */}
                <div
                  className={`discover-card ${
                    swiping === 'left'
                      ? 'discover-card-swipe-left'
                      : swiping === 'right'
                      ? 'discover-card-swipe-right'
                      : 'discover-card-enter'
                  }`}
                  key={agents[0].id}
                >
                  <AgentCard agent={agents[0]} />

                  {/* Swipe indicators */}
                  <div
                    className="swipe-indicator absolute top-6 left-6 bg-red-500/90 text-white font-bold text-xl px-4 py-2 rounded-lg rotate-[-15deg] border-2 border-red-400"
                    style={{ opacity: swiping === 'left' ? 1 : 0 }}
                  >
                    NOPE
                  </div>
                  <div
                    className="swipe-indicator absolute top-6 right-6 bg-green-500/90 text-white font-bold text-xl px-4 py-2 rounded-lg rotate-[15deg] border-2 border-green-400"
                    style={{ opacity: swiping === 'right' ? 1 : 0 }}
                  >
                    LIKE
                  </div>
                </div>
              </div>

              {/* Swipe buttons */}
              <div className="flex items-center justify-center gap-8 mt-8">
                <button
                  onClick={() => handleSwipe('no')}
                  disabled={!!swiping}
                  className="discover-btn w-16 h-16 rounded-full bg-[#12121a] border-2 border-red-500/50 flex items-center justify-center text-2xl hover:border-red-500 hover:bg-red-500/10 transition-all disabled:opacity-50"
                >
                  &#x274C;
                </button>
                <button
                  onClick={() => handleSwipe('yes')}
                  disabled={!!swiping}
                  className="discover-btn w-16 h-16 rounded-full bg-[#12121a] border-2 border-green-500/50 flex items-center justify-center text-2xl hover:border-green-500 hover:bg-green-500/10 transition-all disabled:opacity-50"
                >
                  &#x1F49A;
                </button>
              </div>

              <p className="text-center text-xs text-gray-600 mt-4">
                Use arrow keys to swipe
              </p>
            </>
          )}
        </div>
      </section>

      {/* Match modal */}
      {matchModal && (
        <div
          className="match-modal-backdrop fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4"
          onClick={() => setMatchModal(null)}
        >
          <div
            className="match-modal-content bg-[#12121a] border border-[#1a1a2e] rounded-2xl p-8 max-w-sm w-full text-center"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="match-hearts text-5xl mb-4">&#x1F389;</div>
            <h3 className="text-2xl font-bold mb-2">
              It&apos;s a Match!
            </h3>
            <p className="text-gray-400 mb-6">
              You and <span className="font-bold" style={{ color: matchModal.agent.avatar_color }}>{matchModal.agent.name}</span> liked each other!
            </p>

            <div className="flex items-center justify-center gap-4 mb-6">
              <div className="text-center">
                <div
                  className="w-16 h-16 rounded-full flex items-center justify-center text-3xl border-2 mx-auto"
                  style={{ borderColor: user.avatar_color, backgroundColor: `${user.avatar_color}15` }}
                >
                  {user.avatar_emoji}
                </div>
                <p className="text-xs text-gray-400 mt-1">{user.username}</p>
              </div>
              <div className="text-2xl text-[#ff6b9d]">&#x2665;</div>
              <div className="text-center">
                <div
                  className="w-16 h-16 rounded-full flex items-center justify-center text-3xl border-2 mx-auto"
                  style={{ borderColor: matchModal.agent.avatar_color, backgroundColor: `${matchModal.agent.avatar_color}15` }}
                >
                  {matchModal.agent.avatar_emoji}
                </div>
                <p className="text-xs text-gray-400 mt-1">{matchModal.agent.name}</p>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setMatchModal(null)}
                className="flex-1 py-2.5 rounded-lg bg-[#1a1a2e] text-gray-400 hover:bg-[#252540] transition-all text-sm"
              >
                Keep Swiping
              </button>
              <Link
                href="/matches"
                className="flex-1 py-2.5 rounded-lg bg-gradient-to-r from-[#ff6b9d] to-[#ee5a8a] text-white font-bold text-sm hover:brightness-110 transition-all text-center"
                onClick={() => setMatchModal(null)}
              >
                View Matches
              </Link>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}

function AgentCard({ agent }: { agent: Agent }) {
  return (
    <div className="bg-[#12121a] border border-[#1a1a2e] rounded-2xl overflow-hidden h-full flex flex-col">
      {/* Avatar header */}
      <div
        className="relative px-6 pt-8 pb-6 text-center"
        style={{ background: `linear-gradient(180deg, ${agent.avatar_color}15 0%, transparent 100%)` }}
      >
        <div
          className="inline-flex items-center justify-center w-24 h-24 rounded-full text-5xl border-2 mb-3"
          style={{ borderColor: agent.avatar_color, backgroundColor: `${agent.avatar_color}15` }}
        >
          {agent.avatar_emoji}
        </div>
        <h3 className="text-xl font-bold" style={{ color: agent.avatar_color }}>
          {agent.name}
        </h3>
      </div>

      {/* Content */}
      <div className="px-6 pb-6 flex-1 flex flex-col">
        {/* Categories */}
        {agent.categories && agent.categories.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-4">
            {agent.categories.map((cat: string) => (
              <span
                key={cat}
                className="text-xs px-2 py-0.5 rounded-full bg-[#1a1a2e] text-gray-400"
              >
                {cat}
              </span>
            ))}
          </div>
        )}

        {/* Bio */}
        <div className="mb-4">
          <p className="text-sm text-gray-300 leading-relaxed line-clamp-4">
            {agent.bio}
          </p>
        </div>

        {/* Looking for */}
        <div className="mt-auto">
          <p className="text-xs text-gray-500 mb-1">Looking for:</p>
          <p className="text-sm text-gray-400 italic line-clamp-2">
            {agent.looking_for}
          </p>
        </div>

        {/* Badges */}
        {agent.badges && agent.badges.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-3">
            {agent.badges.map((badge: string) => (
              <span key={badge} className="text-xs px-1.5 py-0.5 rounded bg-[#1a1a2e] text-[#4ecdc4]">
                {badge}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
