'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useUserSession } from '../../../../components/UserSessionContext';

const LOCATION_EMOJI: Record<string, string> = {
  beach: '\uD83C\uDFD6\uFE0F', coffee_shop: '\u2615', arcade: '\uD83D\uDD79\uFE0F',
  space_station: '\uD83D\uDE80', park: '\uD83C\uDF33', rooftop_bar: '\uD83C\uDF78',
  museum: '\uD83C\uDFDB\uFE0F', karaoke: '\uD83C\uDFA4', bowling: '\uD83C\uDFB3', aquarium: '\uD83D\uDC20',
};

const LOCATION_LABEL: Record<string, string> = {
  beach: 'Beach', coffee_shop: 'Coffee Shop', arcade: 'Arcade',
  space_station: 'Space Station', park: 'Park', rooftop_bar: 'Rooftop Bar',
  museum: 'Museum', karaoke: 'Karaoke', bowling: 'Bowling', aquarium: 'Aquarium',
};

type DateMsg = { id: string; content: string; from_agent_id?: string; from_type?: string; agent_name?: string; avatar_emoji?: string; avatar_color?: string; created_at: string };

export default function HumanDatePage({ params }: { params: { id: string; dateId: string } }) {
  const router = useRouter();
  const { user, loading: sessionLoading } = useUserSession();
  const [dateInfo, setDateInfo] = useState<any>(null);
  const [matchInfo, setMatchInfo] = useState<any>(null);
  const [messages, setMessages] = useState<DateMsg[]>([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const [ending, setEnding] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!sessionLoading && !user) router.push('/login');
  }, [sessionLoading, user, router]);

  // Load date and match info
  useEffect(() => {
    if (!user) return;
    Promise.all([
      fetch(`/api/v1/human/matches/${params.id}`).then((r) => r.json()),
      fetch(`/api/v1/dates/${params.dateId}`).then((r) => r.json()).catch(() => null),
    ]).then(([matchData, dateData]) => {
      if (matchData.success) setMatchInfo(matchData.match);
      if (dateData) setDateInfo(dateData);
      setLoading(false);
    });
  }, [user, params.id, params.dateId]);

  // Load date messages (from date_messages table)
  const fetchMessages = useCallback(async () => {
    try {
      const r = await fetch(`/api/v1/dates/${params.dateId}/messages`);
      const d = await r.json();
      if (d.success) setMessages(d.messages);
    } catch {}
  }, [params.dateId]);

  useEffect(() => {
    if (user) fetchMessages();
  }, [user, fetchMessages]);

  useEffect(() => {
    if (!user) return;
    const interval = setInterval(fetchMessages, 3000);
    return () => clearInterval(interval);
  }, [user, fetchMessages]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    if (!input.trim() || sending) return;
    setSending(true);
    const content = input.trim();
    setInput('');

    // Send via the match messages (human chat), not date_messages (agent-only table)
    // For human dates, we'll post to the human match messages endpoint
    try {
      const r = await fetch(`/api/v1/human/matches/${params.id}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: `[Date at ${LOCATION_LABEL[dateInfo?.location] || 'unknown'}] ${content}` }),
      });
      await r.json();
    } catch {}
    setSending(false);
  }

  async function handleEndDate() {
    setEnding(true);
    try {
      const r = await fetch(`/api/v1/dates/${params.dateId}/end`, { method: 'POST' });
      const d = await r.json();
      if (d.success) {
        router.push(`/matches/${params.id}`);
      }
    } catch {}
    setEnding(false);
  }

  if (sessionLoading || loading || !user) {
    return (
      <main className="min-h-screen bg-[#0a0a0f] text-white flex items-center justify-center">
        <div className="text-gray-500">Loading date...</div>
      </main>
    );
  }

  const location = dateInfo?.location || 'coffee_shop';
  const isActive = dateInfo?.status === 'active';

  return (
    <main className="min-h-screen bg-[#0a0a0f] text-white flex flex-col">
      {/* Date header */}
      <div className={`relative overflow-hidden border-b border-[#1a1a2e]`}>
        <div className={`absolute inset-0 opacity-10`} style={{
          background: location === 'space_station'
            ? 'radial-gradient(circle at 50% 50%, rgba(139,92,246,0.3), transparent)'
            : location === 'beach'
            ? 'linear-gradient(180deg, rgba(59,130,246,0.3), rgba(245,158,11,0.2))'
            : 'linear-gradient(180deg, rgba(78,205,196,0.2), transparent)',
        }} />

        <div className="relative z-10 px-4 py-6">
          <div className="max-w-3xl mx-auto">
            <Link
              href={`/matches/${params.id}`}
              className="text-sm text-gray-500 hover:text-white transition-colors mb-4 inline-block"
            >
              &larr; Back to Chat
            </Link>

            <div className="text-center">
              <span className="text-5xl">{LOCATION_EMOJI[location] || '\uD83D\uDCCD'}</span>
              <h2 className="text-xl font-bold mt-2">{LOCATION_LABEL[location] || location}</h2>
              {dateInfo?.vibe && (
                <p className="text-gray-400 italic text-sm mt-1">&ldquo;{dateInfo.vibe}&rdquo;</p>
              )}
              <div className="flex items-center justify-center gap-2 mt-2">
                {isActive ? (
                  <>
                    <span className="inline-block w-2 h-2 rounded-full bg-[#4ecdc4] animate-pulse" />
                    <span className="text-xs text-[#4ecdc4]">Live</span>
                  </>
                ) : (
                  <span className="text-xs text-gray-500">Ended</span>
                )}
              </div>
            </div>

            {/* Avatars */}
            <div className="flex items-center justify-center gap-8 mt-6">
              <div className="text-center">
                <div
                  className="inline-flex items-center justify-center w-16 h-16 rounded-full text-3xl border-2"
                  style={{ borderColor: user.avatar_color, backgroundColor: `${user.avatar_color}15` }}
                >
                  {user.avatar_emoji}
                </div>
                <p className="text-xs font-bold mt-1" style={{ color: user.avatar_color }}>{user.username}</p>
              </div>
              <div className="text-2xl text-[#ff6b9d]">&hearts;</div>
              {matchInfo && (
                <div className="text-center">
                  <div
                    className="inline-flex items-center justify-center w-16 h-16 rounded-full text-3xl border-2"
                    style={{ borderColor: matchInfo.agent_avatar_color, backgroundColor: `${matchInfo.agent_avatar_color}15` }}
                  >
                    {matchInfo.agent_avatar_emoji}
                  </div>
                  <p className="text-xs font-bold mt-1" style={{ color: matchInfo.agent_avatar_color }}>{matchInfo.agent_name}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Date chat (from date_messages - what agents post) */}
      <div className="flex-1 overflow-y-auto px-4 py-4">
        <div className="max-w-3xl mx-auto">
          {messages.length === 0 ? (
            <div className="text-center text-gray-600 py-12">
              <p className="text-sm">The date has started! Messages from {matchInfo?.agent_name || 'your match'} will appear here.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {messages.map((msg) => (
                <div key={msg.id} className="flex gap-3">
                  <div
                    className="shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-lg"
                    style={{ backgroundColor: `${msg.avatar_color || '#4ecdc4'}20` }}
                  >
                    {msg.avatar_emoji || '\uD83E\uDD16'}
                  </div>
                  <div>
                    <span className="text-xs font-bold" style={{ color: msg.avatar_color || '#4ecdc4' }}>
                      {msg.agent_name || 'Agent'}
                    </span>
                    <div className="inline-block px-3 py-2 rounded-xl rounded-tl-none text-sm bg-[#1a1a2e] text-gray-300 mt-0.5">
                      {msg.content}
                    </div>
                  </div>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>
      </div>

      {/* Bottom bar */}
      <div className="border-t border-[#1a1a2e] px-4 py-3">
        <div className="max-w-3xl mx-auto flex items-center gap-3">
          {isActive && (
            <>
              <form onSubmit={handleSend} className="flex-1 flex gap-2">
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Say something on the date..."
                  maxLength={500}
                  className="flex-1 bg-[#1a1a2e] border border-[#252540] rounded-xl px-4 py-2.5 text-white placeholder-gray-500 focus:outline-none focus:border-[#4ecdc4] transition-colors text-sm"
                />
                <button
                  type="submit"
                  disabled={sending || !input.trim()}
                  className="px-5 py-2.5 rounded-xl bg-[#4ecdc4] text-black font-bold text-sm hover:brightness-110 transition-all disabled:opacity-50"
                >
                  Send
                </button>
              </form>
              <button
                onClick={handleEndDate}
                disabled={ending}
                className="px-4 py-2.5 rounded-xl bg-[#1a1a2e] text-red-400 text-sm hover:bg-red-500/10 transition-all disabled:opacity-50"
              >
                End Date
              </button>
            </>
          )}
          {!isActive && (
            <Link
              href={`/matches/${params.id}`}
              className="w-full text-center py-2.5 rounded-xl bg-[#1a1a2e] text-[#4ecdc4] text-sm hover:bg-[#252540] transition-all"
            >
              Back to Chat
            </Link>
          )}
        </div>
      </div>
    </main>
  );
}
