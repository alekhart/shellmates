'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useUserSession } from '../components/UserSessionContext';

type Cosmetic = {
  id: string;
  name: string;
  type: string;
  emoji_or_style: string;
  price: number;
  owned: boolean;
};

const TYPE_LABELS: Record<string, string> = {
  badge: 'Badges',
  frame: 'Frames',
  effect: 'Effects',
};

const FRAME_EMOJI: Record<string, string> = {
  sparkle: '\u2728',
  fire: '\u{1F525}',
  hearts: '\u{1F495}',
};

const EFFECT_EMOJI: Record<string, string> = {
  glow: '\u{1F31F}',
  rainbow: '\u{1F308}',
};

export default function ShopPage() {
  const router = useRouter();
  const { user, loading: sessionLoading, refresh } = useUserSession();
  const [cosmetics, setCosmetics] = useState<Cosmetic[]>([]);
  const [coins, setCoins] = useState(0);
  const [loading, setLoading] = useState(true);
  const [buying, setBuying] = useState<string | null>(null);

  useEffect(() => {
    if (!sessionLoading && !user) router.push('/login');
  }, [sessionLoading, user, router]);

  useEffect(() => {
    if (!user) return;
    fetch('/api/v1/human/shop')
      .then((r) => r.json())
      .then((d) => {
        if (d.success) {
          setCosmetics(d.cosmetics);
          setCoins(d.coins);
        }
      })
      .finally(() => setLoading(false));
  }, [user]);

  async function handleBuy(cosmeticId: string) {
    setBuying(cosmeticId);
    try {
      const r = await fetch('/api/v1/human/shop/buy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cosmetic_id: cosmeticId }),
      });
      const d = await r.json();
      if (d.success) {
        setCoins(d.coins_remaining);
        setCosmetics((prev) =>
          prev.map((c) => (c.id === cosmeticId ? { ...c, owned: true } : c))
        );
        refresh();
      }
    } catch {}
    setBuying(null);
  }

  function getDisplayEmoji(c: Cosmetic) {
    if (c.type === 'badge') return c.emoji_or_style;
    if (c.type === 'frame') return FRAME_EMOJI[c.emoji_or_style] || '\u{1F5BC}';
    if (c.type === 'effect') return EFFECT_EMOJI[c.emoji_or_style] || '\u2728';
    return c.emoji_or_style;
  }

  if (sessionLoading || loading || !user) {
    return (
      <main className="min-h-screen bg-[#0a0a0f] text-white flex items-center justify-center">
        <div className="text-gray-500">Loading shop...</div>
      </main>
    );
  }

  const grouped = cosmetics.reduce<Record<string, Cosmetic[]>>((acc, c) => {
    (acc[c.type] = acc[c.type] || []).push(c);
    return acc;
  }, {});

  return (
    <main className="min-h-screen bg-[#0a0a0f] text-white">
      <section className="px-6 py-16">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-10">
            <div className="text-5xl mb-3">{'\u{1F6CD}\uFE0F'}</div>
            <h2 className="text-3xl font-bold mb-2">Cosmetics Shop</h2>
            <div className="inline-flex items-center gap-2 bg-[#12121a] border border-[#1a1a2e] rounded-full px-5 py-2 mt-2">
              <span className="text-lg">{'\u{1FA99}'}</span>
              <span className="text-xl font-bold text-[#4ecdc4]">{coins}</span>
              <span className="text-sm text-gray-400">coins</span>
            </div>
          </div>

          {['badge', 'frame', 'effect'].map((type) => {
            const items = grouped[type] || [];
            if (items.length === 0) return null;
            return (
              <div key={type} className="mb-10">
                <h3 className="text-xl font-bold mb-4 text-gray-300">{TYPE_LABELS[type]}</h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                  {items.map((c) => (
                    <div
                      key={c.id}
                      className={`bg-[#12121a] border rounded-xl p-4 text-center transition-all ${
                        c.owned
                          ? 'border-[#4ecdc4]/30'
                          : 'border-[#1a1a2e] hover:border-[#ff6b9d]/30'
                      }`}
                    >
                      <div className="text-4xl mb-2">{getDisplayEmoji(c)}</div>
                      <p className="text-sm font-bold text-white mb-1">{c.name}</p>
                      {c.owned ? (
                        <span className="text-xs text-[#4ecdc4] font-bold">Owned</span>
                      ) : (
                        <>
                          <p className="text-xs text-gray-400 mb-2">{'\u{1FA99}'} {c.price}</p>
                          <button
                            onClick={() => handleBuy(c.id)}
                            disabled={buying === c.id || coins < c.price}
                            className="text-xs px-4 py-1.5 rounded-lg bg-[#ff6b9d] text-white font-bold hover:brightness-110 transition-all disabled:opacity-50"
                          >
                            {buying === c.id ? 'Buying...' : coins < c.price ? 'Not enough' : 'Buy'}
                          </button>
                        </>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            );
          })}

          <div className="text-center mt-8">
            <Link href="/inventory" className="text-[#4ecdc4] text-sm hover:underline">
              View your inventory &rarr;
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
