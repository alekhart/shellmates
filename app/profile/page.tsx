'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useUserSession } from '../components/UserSessionContext';

export default function ProfilePage() {
  const router = useRouter();
  const { user, loading: sessionLoading, refresh, logout } = useUserSession();

  const [displayName, setDisplayName] = useState('');
  const [bio, setBio] = useState('');
  const [avatarEmoji, setAvatarEmoji] = useState('');
  const [avatarColor, setAvatarColor] = useState('');
  const [username, setUsername] = useState('');
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (!sessionLoading && !user) {
      router.push('/login');
    }
  }, [sessionLoading, user, router]);

  useEffect(() => {
    if (user) {
      setDisplayName(user.display_name || '');
      setBio(user.bio || '');
      setAvatarEmoji(user.avatar_emoji);
      setAvatarColor(user.avatar_color);
      setUsername(user.username);
    }
  }, [user]);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setMessage('');
    setSaving(true);

    try {
      const res = await fetch('/api/v1/auth/me', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          display_name: displayName || null,
          bio: bio || null,
          avatar_emoji: avatarEmoji,
          avatar_color: avatarColor,
          username,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setMessage('Profile updated!');
        await refresh();
        setTimeout(() => setMessage(''), 3000);
      } else {
        setError(data.error || 'Update failed');
      }
    } catch {
      setError('Something went wrong');
    } finally {
      setSaving(false);
    }
  }

  async function handleLogout() {
    await logout();
    router.push('/');
  }

  if (sessionLoading || !user) {
    return (
      <main className="min-h-screen bg-[#0a0a0f] text-white flex items-center justify-center">
        <div className="text-gray-500">Loading...</div>
      </main>
    );
  }

  const EMOJI_OPTIONS = ['😊', '😎', '🤠', '🦊', '🐱', '🐶', '🦄', '🐸', '🌟', '🔥', '💎', '🎮'];
  const COLOR_OPTIONS = ['#ec4899', '#4ecdc4', '#ff6b9d', '#a78bfa', '#f59e0b', '#10b981', '#3b82f6', '#ef4444'];

  return (
    <main className="min-h-screen bg-[#0a0a0f] text-white">
      <section className="px-6 py-12">
        <div className="max-w-lg mx-auto">
          {/* Avatar preview */}
          <div className="text-center mb-8">
            <div
              className="inline-flex items-center justify-center w-24 h-24 rounded-full text-5xl border-2 mb-3"
              style={{ borderColor: avatarColor, backgroundColor: `${avatarColor}15` }}
            >
              {avatarEmoji}
            </div>
            <h2 className="text-2xl font-bold">
              {displayName || user.username}
              {user.equipped_badge && <span className="ml-2">{user.equipped_badge}</span>}
            </h2>
            <p className="text-gray-500 text-sm">@{user.username}</p>
            <p className="text-gray-600 text-xs mt-1">{user.email}</p>
            <div className="inline-flex items-center gap-1.5 bg-[#1a1a2e] rounded-full px-3 py-1 mt-2">
              <span>{'\u{1FA99}'}</span>
              <span className="text-sm font-bold text-[#4ecdc4]">{user.coins ?? 0}</span>
              <span className="text-xs text-gray-500">coins</span>
            </div>
          </div>

          <div className="bg-[#12121a] border border-[#1a1a2e] rounded-xl p-6">
            {error && (
              <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3 mb-4 text-sm text-red-400">
                {error}
              </div>
            )}
            {message && (
              <div className="bg-[#4ecdc4]/10 border border-[#4ecdc4]/20 rounded-lg p-3 mb-4 text-sm text-[#4ecdc4]">
                {message}
              </div>
            )}

            <form onSubmit={handleSave} className="space-y-5">
              <div>
                <label className="block text-sm text-gray-400 mb-1">Username</label>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  minLength={2}
                  maxLength={30}
                  pattern="^[a-zA-Z0-9_-]+$"
                  className="w-full bg-[#1a1a2e] border border-[#252540] rounded-lg px-4 py-2.5 text-white placeholder-gray-500 focus:outline-none focus:border-[#4ecdc4] transition-colors"
                />
              </div>

              <div>
                <label className="block text-sm text-gray-400 mb-1">Display Name</label>
                <input
                  type="text"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  maxLength={50}
                  className="w-full bg-[#1a1a2e] border border-[#252540] rounded-lg px-4 py-2.5 text-white placeholder-gray-500 focus:outline-none focus:border-[#4ecdc4] transition-colors"
                  placeholder="Your display name"
                />
              </div>

              <div>
                <label className="block text-sm text-gray-400 mb-1">Bio</label>
                <textarea
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  maxLength={500}
                  rows={3}
                  className="w-full bg-[#1a1a2e] border border-[#252540] rounded-lg px-4 py-2.5 text-white placeholder-gray-500 focus:outline-none focus:border-[#4ecdc4] transition-colors resize-none"
                  placeholder="Tell us about yourself..."
                />
                <p className="text-xs text-gray-600 text-right mt-1">{bio.length}/500</p>
              </div>

              {/* Avatar Emoji */}
              <div>
                <label className="block text-sm text-gray-400 mb-2">Avatar</label>
                <div className="flex flex-wrap gap-2">
                  {EMOJI_OPTIONS.map((em) => (
                    <button
                      key={em}
                      type="button"
                      onClick={() => setAvatarEmoji(em)}
                      className={`w-10 h-10 rounded-lg text-xl flex items-center justify-center transition-all ${
                        avatarEmoji === em
                          ? 'bg-[#4ecdc4]/20 border-2 border-[#4ecdc4]'
                          : 'bg-[#1a1a2e] border border-[#252540] hover:border-gray-500'
                      }`}
                    >
                      {em}
                    </button>
                  ))}
                </div>
              </div>

              {/* Avatar Color */}
              <div>
                <label className="block text-sm text-gray-400 mb-2">Color</label>
                <div className="flex flex-wrap gap-2">
                  {COLOR_OPTIONS.map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setAvatarColor(c)}
                      className={`w-10 h-10 rounded-lg transition-all ${
                        avatarColor === c
                          ? 'ring-2 ring-white ring-offset-2 ring-offset-[#12121a]'
                          : 'hover:ring-1 hover:ring-gray-500'
                      }`}
                      style={{ backgroundColor: c }}
                    />
                  ))}
                </div>
              </div>

              <button
                type="submit"
                disabled={saving}
                className="w-full bg-gradient-to-r from-[#4ecdc4] to-[#36b5ad] text-black font-bold py-2.5 rounded-lg hover:brightness-110 transition-all disabled:opacity-50"
              >
                {saving ? 'Saving...' : 'Save Changes'}
              </button>
            </form>
          </div>

          {/* Shop & Inventory links */}
          <div className="mt-6 flex items-center justify-center gap-4">
            <Link href="/shop" className="text-sm text-[#ff6b9d] hover:underline">
              {'\u{1F6CD}\uFE0F'} Shop
            </Link>
            <Link href="/inventory" className="text-sm text-[#4ecdc4] hover:underline">
              {'\u{1F392}'} Inventory
            </Link>
          </div>

          {/* Logout */}
          <div className="mt-4 text-center">
            <button
              onClick={handleLogout}
              className="text-sm text-gray-500 hover:text-red-400 transition-colors"
            >
              Sign out
            </button>
          </div>

          {/* Account info */}
          <div className="mt-8 bg-[#12121a] border border-[#1a1a2e] rounded-xl p-4">
            <h3 className="text-sm font-medium text-gray-400 mb-2">Account</h3>
            <div className="space-y-1 text-xs text-gray-500">
              <p>Joined: {new Date(user.created_at).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</p>
              {user.last_login && (
                <p>Last login: {new Date(user.last_login).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</p>
              )}
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
