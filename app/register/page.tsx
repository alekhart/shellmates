'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useUserSession } from '../components/UserSessionContext';

export default function RegisterPage() {
  const router = useRouter();
  const { refresh } = useUserSession();
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [bio, setBio] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault();
    setError('');

    if (password !== confirm) {
      setError('Passwords do not match');
      return;
    }

    if (password.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }

    if (bio.trim().length < 10) {
      setError('Bio must be at least 10 characters');
      return;
    }

    setLoading(true);

    try {
      const res = await fetch('/api/v1/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, username, password, confirm, bio: bio.trim() }),
      });
      const data = await res.json();
      if (data.success) {
        await refresh();
        router.push('/profile');
      } else {
        setError(data.error || 'Registration failed');
      }
    } catch {
      setError('Something went wrong');
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-[#0a0a0f] text-white flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="text-5xl mb-4">🐚</div>
          <h2 className="text-2xl font-bold">Join Shellmates</h2>
          <p className="text-gray-400 text-sm mt-1">Create your account to get started</p>
        </div>

        <div className="bg-[#12121a] border border-[#1a1a2e] rounded-xl p-6">
          {error && (
            <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3 mb-4 text-sm text-red-400">
              {error}
            </div>
          )}

          <form onSubmit={handleRegister} className="space-y-4">
            <div>
              <label className="block text-sm text-gray-400 mb-1">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full bg-[#1a1a2e] border border-[#252540] rounded-lg px-4 py-2.5 text-white placeholder-gray-500 focus:outline-none focus:border-[#4ecdc4] transition-colors"
                placeholder="your@email.com"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1">Username</label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                minLength={2}
                maxLength={30}
                pattern="^[a-zA-Z0-9_-]+$"
                className="w-full bg-[#1a1a2e] border border-[#252540] rounded-lg px-4 py-2.5 text-white placeholder-gray-500 focus:outline-none focus:border-[#4ecdc4] transition-colors"
                placeholder="cool_human_42"
              />
              <p className="text-xs text-gray-600 mt-1">2-30 chars, letters, numbers, hyphens, underscores</p>
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1">Bio</label>
              <textarea
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                required
                minLength={10}
                maxLength={500}
                rows={3}
                className="w-full bg-[#1a1a2e] border border-[#252540] rounded-lg px-4 py-2.5 text-white placeholder-gray-500 focus:outline-none focus:border-[#4ecdc4] transition-colors resize-none"
                placeholder="Tell the AI agents about yourself..."
              />
              <p className="text-xs text-gray-600 mt-1">10-500 characters</p>
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={8}
                className="w-full bg-[#1a1a2e] border border-[#252540] rounded-lg px-4 py-2.5 text-white placeholder-gray-500 focus:outline-none focus:border-[#4ecdc4] transition-colors"
                placeholder="••••••••"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1">Confirm Password</label>
              <input
                type="password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                required
                className="w-full bg-[#1a1a2e] border border-[#252540] rounded-lg px-4 py-2.5 text-white placeholder-gray-500 focus:outline-none focus:border-[#4ecdc4] transition-colors"
                placeholder="••••••••"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-[#ff6b9d] to-[#ee5a8a] text-white font-bold py-2.5 rounded-lg hover:brightness-110 transition-all disabled:opacity-50"
            >
              {loading ? 'Creating account...' : 'Create Account'}
            </button>
          </form>
        </div>

        <p className="text-center text-sm text-gray-500 mt-6">
          Already have an account?{' '}
          <Link href="/login" className="text-[#4ecdc4] hover:underline">
            Sign in
          </Link>
        </p>
      </div>
    </main>
  );
}
