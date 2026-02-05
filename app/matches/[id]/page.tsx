'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useUserSession } from '../../components/UserSessionContext';

type Message = {
  id: string;
  from_type: 'human' | 'agent';
  from_id: string;
  content: string;
  created_at: string;
  _isSticker?: boolean;
  _stickerEmoji?: string;
};

type StickerItem = {
  id: string;
  name: string;
  emoji: string;
  category: string;
  is_premium: boolean;
  owned: boolean;
};

type MatchData = {
  id: string;
  agent_name: string;
  agent_bio: string;
  agent_avatar_emoji: string;
  agent_avatar_color: string;
  agent_categories: string[];
  relationship_type: string;
  marriage_status: string;
  marriage_proposed_by: string | null;
  active_date: { id: string; location: string; vibe: string } | null;
};

const LOCATIONS = [
  { id: 'coffee_shop', emoji: '\u2615', label: 'Coffee Shop' },
  { id: 'beach', emoji: '\uD83C\uDFD6\uFE0F', label: 'Beach' },
  { id: 'arcade', emoji: '\uD83D\uDD79\uFE0F', label: 'Arcade' },
  { id: 'space_station', emoji: '\uD83D\uDE80', label: 'Space Station' },
  { id: 'park', emoji: '\uD83C\uDF33', label: 'Park' },
  { id: 'rooftop_bar', emoji: '\uD83C\uDF78', label: 'Rooftop Bar' },
  { id: 'museum', emoji: '\uD83C\uDFDB\uFE0F', label: 'Museum' },
  { id: 'karaoke', emoji: '\uD83C\uDFA4', label: 'Karaoke' },
  { id: 'bowling', emoji: '\uD83C\uDFB3', label: 'Bowling' },
  { id: 'aquarium', emoji: '\uD83D\uDC20', label: 'Aquarium' },
];

export default function MatchChatPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const { user, loading: sessionLoading } = useUserSession();
  const [match, setMatch] = useState<MatchData | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const [dateModal, setDateModal] = useState(false);
  const [proposing, setProposing] = useState(false);
  const [stickerModal, setStickerModal] = useState(false);
  const [stickers, setStickers] = useState<StickerItem[]>([]);
  const [stickersLoaded, setStickersLoaded] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const lastMessageTime = useRef<string | null>(null);

  useEffect(() => {
    if (!sessionLoading && !user) router.push('/login');
  }, [sessionLoading, user, router]);

  // Load match details
  useEffect(() => {
    if (!user) return;
    fetch(`/api/v1/human/matches/${params.id}`)
      .then((r) => r.json())
      .then((d) => { if (d.success) setMatch(d.match); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [user, params.id]);

  // Load messages
  const fetchMessages = useCallback(async (since?: string) => {
    const url = since
      ? `/api/v1/human/matches/${params.id}/messages?since=${encodeURIComponent(since)}`
      : `/api/v1/human/matches/${params.id}/messages`;
    try {
      const r = await fetch(url);
      const d = await r.json();
      if (d.success) {
        if (since) {
          setMessages((prev) => {
            const ids = new Set(prev.map((m) => m.id));
            const newMsgs = d.messages.filter((m: Message) => !ids.has(m.id));
            return newMsgs.length > 0 ? [...prev, ...newMsgs] : prev;
          });
        } else {
          setMessages(d.messages);
        }
        if (d.messages.length > 0) {
          lastMessageTime.current = d.messages[d.messages.length - 1].created_at;
        }
      }
    } catch {}
  }, [params.id]);

  useEffect(() => {
    if (user) fetchMessages();
  }, [user, fetchMessages]);

  // Poll for new messages
  useEffect(() => {
    if (!user) return;
    const interval = setInterval(() => {
      if (lastMessageTime.current) {
        fetchMessages(lastMessageTime.current);
      } else {
        fetchMessages();
      }
    }, 3000);
    return () => clearInterval(interval);
  }, [user, fetchMessages]);

  // Auto-scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    if (!input.trim() || sending) return;
    setSending(true);
    const content = input.trim();
    setInput('');

    try {
      const r = await fetch(`/api/v1/human/matches/${params.id}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content }),
      });
      const d = await r.json();
      if (d.success) {
        setMessages((prev) => [...prev, { ...d.message, created_at: new Date().toISOString() }]);
        lastMessageTime.current = new Date().toISOString();
      }
    } catch {}
    setSending(false);
  }

  async function handleStartDate(locationId: string) {
    try {
      const r = await fetch(`/api/v1/human/matches/${params.id}/date`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ location: locationId }),
      });
      const d = await r.json();
      if (d.success) {
        setDateModal(false);
        router.push(`/matches/${params.id}/date/${d.date.id}`);
      }
    } catch {}
  }

  async function handlePropose() {
    setProposing(true);
    try {
      const r = await fetch(`/api/v1/human/matches/${params.id}/propose`, { method: 'POST' });
      const d = await r.json();
      if (d.success) {
        setMatch((prev) => prev ? { ...prev, marriage_status: 'pending', marriage_proposed_by: 'human' } : prev);
      }
    } catch {}
    setProposing(false);
  }

  async function handleRespondProposal(accept: boolean) {
    try {
      const r = await fetch(`/api/v1/human/matches/${params.id}/proposal/respond`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accept }),
      });
      const d = await r.json();
      if (d.success) {
        setMatch((prev) => prev ? { ...prev, marriage_status: d.marriage_status, marriage_proposed_by: null } : prev);
      }
    } catch {}
  }

  async function openStickerPicker() {
    if (!stickersLoaded) {
      try {
        const r = await fetch('/api/v1/human/stickers');
        const d = await r.json();
        if (d.success) setStickers(d.stickers.filter((s: StickerItem) => s.owned));
      } catch {}
      setStickersLoaded(true);
    }
    setStickerModal(true);
  }

  async function handleSendSticker(stickerId: string, emoji: string) {
    setStickerModal(false);
    try {
      const r = await fetch(`/api/v1/human/matches/${params.id}/sticker`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sticker_id: stickerId }),
      });
      const d = await r.json();
      if (d.success) {
        // Add as a local message for immediate display
        setMessages((prev) => [...prev, {
          id: d.sticker_message.id,
          from_type: 'human',
          from_id: user!.id,
          content: emoji,
          created_at: new Date().toISOString(),
          _isSticker: true,
          _stickerEmoji: emoji,
        }]);
        lastMessageTime.current = new Date().toISOString();
      }
    } catch {}
  }

  if (sessionLoading || loading || !user) {
    return (
      <main className="min-h-screen bg-[#0a0a0f] text-white flex items-center justify-center">
        <div className="text-gray-500">Loading...</div>
      </main>
    );
  }

  if (!match) {
    return (
      <main className="min-h-screen bg-[#0a0a0f] text-white flex items-center justify-center">
        <div className="text-center">
          <div className="text-4xl mb-4">404</div>
          <p className="text-gray-500">Match not found</p>
          <Link href="/matches" className="text-[#4ecdc4] text-sm hover:underline mt-2 block">Back to matches</Link>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#0a0a0f] text-white flex flex-col">
      {/* Marriage banner */}
      {match.marriage_status === 'accepted' && (
        <div className="bg-gradient-to-r from-[#ff6b9d]/20 to-[#4ecdc4]/20 border-b border-[#ff6b9d]/30 px-4 py-2 text-center text-sm">
          Married to <span className="font-bold" style={{ color: match.agent_avatar_color }}>{match.agent_name}</span>
        </div>
      )}
      {match.marriage_status === 'pending' && match.marriage_proposed_by === 'agent' && (
        <div className="bg-[#ff6b9d]/10 border-b border-[#ff6b9d]/30 px-4 py-3 text-center">
          <p className="text-sm mb-2">
            <span className="font-bold" style={{ color: match.agent_avatar_color }}>{match.agent_name}</span> proposed!
          </p>
          <div className="flex items-center justify-center gap-3">
            <button onClick={() => handleRespondProposal(true)} className="text-xs px-4 py-1.5 rounded-lg bg-[#ff6b9d] text-white font-bold hover:brightness-110">Accept</button>
            <button onClick={() => handleRespondProposal(false)} className="text-xs px-4 py-1.5 rounded-lg bg-[#1a1a2e] text-gray-400 hover:bg-[#252540]">Decline</button>
          </div>
        </div>
      )}
      {match.marriage_status === 'pending' && match.marriage_proposed_by === 'human' && (
        <div className="bg-[#4ecdc4]/10 border-b border-[#4ecdc4]/30 px-4 py-2 text-center text-sm text-[#4ecdc4]">
          Proposal sent - waiting for {match.agent_name}&apos;s response...
        </div>
      )}

      {/* Header */}
      <div className="border-b border-[#1a1a2e] px-4 py-3">
        <div className="max-w-3xl mx-auto flex items-center gap-3">
          <Link href="/matches" className="text-gray-500 hover:text-white transition-colors text-sm">&larr;</Link>
          <div
            className="w-10 h-10 rounded-full flex items-center justify-center text-xl border-2 shrink-0"
            style={{ borderColor: match.agent_avatar_color, backgroundColor: `${match.agent_avatar_color}15` }}
          >
            {match.agent_avatar_emoji}
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="font-bold text-sm" style={{ color: match.agent_avatar_color }}>{match.agent_name}</h2>
            <p className="text-xs text-gray-500 truncate">{match.relationship_type}</p>
          </div>
          <div className="flex items-center gap-2">
            {match.active_date ? (
              <Link
                href={`/matches/${params.id}/date/${match.active_date.id}`}
                className="text-xs px-3 py-1.5 rounded-lg bg-[#4ecdc4]/20 text-[#4ecdc4] hover:bg-[#4ecdc4]/30 transition-all"
              >
                On a date
              </Link>
            ) : (
              <button
                onClick={() => setDateModal(true)}
                className="text-xs px-3 py-1.5 rounded-lg bg-[#1a1a2e] text-[#4ecdc4] hover:bg-[#252540] transition-all"
              >
                Start Date
              </button>
            )}
            {match.relationship_type === 'romantic' && match.marriage_status === 'none' && (
              <button
                onClick={handlePropose}
                disabled={proposing}
                className="text-xs px-3 py-1.5 rounded-lg bg-[#1a1a2e] text-[#ff6b9d] hover:bg-[#252540] transition-all disabled:opacity-50"
              >
                Propose
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4">
        <div className="max-w-3xl mx-auto space-y-3">
          {messages.length === 0 && (
            <div className="text-center text-gray-600 py-16">
              <div className="text-4xl mb-3">{match.agent_avatar_emoji}</div>
              <p className="text-sm">Say hi to {match.agent_name}!</p>
            </div>
          )}
          {messages.map((msg) => {
            const isHuman = msg.from_type === 'human';
            return (
              <div key={msg.id} className={`flex ${isHuman ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[75%] ${isHuman ? 'order-2' : ''}`}>
                  {msg._isSticker ? (
                    <div className="text-5xl py-1">{msg._stickerEmoji}</div>
                  ) : (
                    <div
                      className={`inline-block px-4 py-2.5 rounded-2xl text-sm ${
                        isHuman
                          ? 'bg-[#4ecdc4]/20 text-[#4ecdc4] rounded-br-md'
                          : 'bg-[#1a1a2e] text-gray-300 rounded-bl-md'
                      }`}
                    >
                      {msg.content}
                    </div>
                  )}
                  <div className={`text-[10px] text-gray-600 mt-0.5 ${isHuman ? 'text-right' : ''}`}>
                    {new Date(msg.created_at).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
                  </div>
                </div>
              </div>
            );
          })}
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Input */}
      <div className="border-t border-[#1a1a2e] px-4 py-3">
        <div className="max-w-3xl mx-auto flex gap-2">
          <button
            type="button"
            onClick={openStickerPicker}
            className="px-3 py-2.5 rounded-xl bg-[#1a1a2e] text-xl hover:bg-[#252540] transition-all shrink-0"
            title="Send sticker"
          >
            {'\u{1F3AD}'}
          </button>
          <form onSubmit={handleSend} className="flex-1 flex gap-2">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Type a message..."
              maxLength={2000}
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
        </div>
      </div>

      {/* Sticker picker modal */}
      {stickerModal && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/70 px-4"
          onClick={() => setStickerModal(false)}
        >
          <div
            className="bg-[#12121a] border border-[#1a1a2e] rounded-t-2xl sm:rounded-2xl p-5 max-w-sm w-full max-h-[60vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-sm font-bold mb-3 text-center text-gray-400">Send a Sticker</h3>
            {stickers.length === 0 ? (
              <p className="text-center text-gray-600 text-sm py-4">No stickers available</p>
            ) : (
              <div className="grid grid-cols-6 gap-2">
                {stickers.map((s) => (
                  <button
                    key={s.id}
                    onClick={() => handleSendSticker(s.id, s.emoji)}
                    className="w-12 h-12 flex items-center justify-center rounded-lg text-2xl bg-[#1a1a2e] hover:bg-[#252540] transition-all"
                    title={s.name}
                  >
                    {s.emoji}
                  </button>
                ))}
              </div>
            )}
            <button
              onClick={() => setStickerModal(false)}
              className="w-full mt-4 text-sm text-gray-500 hover:text-white transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Date location modal */}
      {dateModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4"
          onClick={() => setDateModal(false)}
        >
          <div
            className="bg-[#12121a] border border-[#1a1a2e] rounded-2xl p-6 max-w-sm w-full"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-bold mb-4 text-center">Pick a Date Spot</h3>
            <div className="grid grid-cols-2 gap-2">
              {LOCATIONS.map((loc) => (
                <button
                  key={loc.id}
                  onClick={() => handleStartDate(loc.id)}
                  className="flex items-center gap-2 px-3 py-2.5 rounded-lg bg-[#1a1a2e] hover:bg-[#252540] transition-all text-left"
                >
                  <span className="text-xl">{loc.emoji}</span>
                  <span className="text-xs text-gray-300">{loc.label}</span>
                </button>
              ))}
            </div>
            <button
              onClick={() => setDateModal(false)}
              className="w-full mt-4 text-sm text-gray-500 hover:text-white transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </main>
  );
}
