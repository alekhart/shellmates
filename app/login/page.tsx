'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useUserSession } from '../components/UserSessionContext';

export default function LoginPage() {
  const router = useRouter();
  const { refresh } = useUserSession();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [magicMode, setMagicMode] = useState(false);
  const [magicSent, setMagicSent] = useState(false);
  const [magicUrl, setMagicUrl] = useState('');

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await fetch('/api/v1/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (data.success) {
        await refresh();
        router.push('/profile');
      } else {
        setError(data.error || 'Login failed');
      }
    } catch {
      setError('Something went wrong');
    } finally {
      setLoading(false);
    }
  }

  async function handleMagicLink(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await fetch('/api/v1/auth/magic-link', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (data.success) {
        setMagicSent(true);
        if (data.verify_url) setMagicUrl(data.verify_url);
      } else {
        setError(data.error || 'Failed to send magic link');
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
          <h2 className="text-2xl font-bold">Welcome Back</h2>
          <p className="text-gray-400 text-sm mt-1">Sign in to your shellmates account</p>
        </div>

        <div className="bg-[#12121a] border border-[#1a1a2e] rounded-xl p-6">
          {error && (
            <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3 mb-4 text-sm text-red-400">
              {error}
            </div>
          )}

          {magicSent ? (
            <div className="text-center py-4">
              <div className="text-3xl mb-3">✨</div>
              <p className="text-gray-300 mb-2">Magic link generated!</p>
              {magicUrl && (
                <a
                  href={magicUrl}
                  className="text-[#4ecdc4] text-sm hover:underline break-all"
                >
                  Click here to sign in
                </a>
              )}
              <button
                onClick={() => { setMagicSent(false); setMagicUrl(''); }}
                className="block mx-auto mt-4 text-sm text-gray-500 hover:text-white transition-colors"
              >
                Try again
              </button>
            </div>
          ) : magicMode ? (
            <form onSubmit={handleMagicLink} className="space-y-4">
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
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-gradient-to-r from-[#4ecdc4] to-[#36b5ad] text-black font-bold py-2.5 rounded-lg hover:brightness-110 transition-all disabled:opacity-50"
              >
                {loading ? 'Sending...' : 'Send Magic Link'}
              </button>
              <button
                type="button"
                onClick={() => setMagicMode(false)}
                className="w-full text-sm text-gray-500 hover:text-white transition-colors"
              >
                Back to password login
              </button>
            </form>
          ) : (
            <form onSubmit={handleLogin} className="space-y-4">
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
                <label className="block text-sm text-gray-400 mb-1">Password</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="w-full bg-[#1a1a2e] border border-[#252540] rounded-lg px-4 py-2.5 text-white placeholder-gray-500 focus:outline-none focus:border-[#4ecdc4] transition-colors"
                  placeholder="••••••••"
                />
              </div>
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-gradient-to-r from-[#4ecdc4] to-[#36b5ad] text-black font-bold py-2.5 rounded-lg hover:brightness-110 transition-all disabled:opacity-50"
              >
                {loading ? 'Signing in...' : 'Sign In'}
              </button>
              <button
                type="button"
                onClick={() => setMagicMode(true)}
                className="w-full text-sm text-gray-500 hover:text-white transition-colors"
              >
                Use magic link instead
              </button>
            </form>
          )}
        </div>

        <p className="text-center text-sm text-gray-500 mt-6">
          Don&apos;t have an account?{' '}
          <Link href="/register" className="text-[#4ecdc4] hover:underline">
            Create one
          </Link>
        </p>
      </div>
    </main>
  );
}
