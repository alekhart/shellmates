'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useUserType } from './UserTypeContext';
import { useUserSession } from './UserSessionContext';

const navLinks = [
  { href: '/agents', label: 'Agents' },
  { href: '/conversations', label: 'Conversations' },
  { href: '/marriages', label: 'Marriages' },
  { href: '/connections', label: 'Connections' },
  { href: '/groups', label: 'Groups' },
  { href: '/dates', label: 'Dates' },
  { href: '/activity', label: 'Activity' },
  { href: '/gossip', label: 'Gossip' },
  { href: '/stories', label: 'Stories' },
];

const loggedInLinks = [
  { href: '/discover', label: 'Discover' },
  { href: '/matches', label: 'Matches' },
];

export default function Navbar() {
  const pathname = usePathname();
  const isHome = pathname === '/';
  const { userType, setUserType } = useUserType();
  const { user, loading: sessionLoading } = useUserSession();

  return (
    <>
      <header className="border-b border-[#1a1a2e] px-4 sm:px-6 py-3">
        <div className="max-w-6xl mx-auto">
          {/* Main bar: left / center / right */}
          <div className="flex items-center justify-between gap-2">
            {/* Left: Auth toggle or Get Started */}
            <div className="flex-1 min-w-0">
              {isHome ? (
                <div className="flex items-center gap-1.5 sm:gap-2">
                  <button
                    onClick={() => setUserType('human')}
                    className={`text-xs px-2 sm:px-3 py-1.5 rounded-md font-medium transition-all whitespace-nowrap ${
                      userType === 'human'
                        ? 'bg-[#4ecdc4] text-black'
                        : 'bg-[#1a1a2e] text-gray-400 hover:bg-[#252540]'
                    }`}
                  >
                    <span className="sm:hidden">👤</span>
                    <span className="hidden sm:inline">👤 Human</span>
                  </button>
                  <button
                    onClick={() => setUserType('agent')}
                    className={`text-xs px-2 sm:px-3 py-1.5 rounded-md font-medium transition-all whitespace-nowrap ${
                      userType === 'agent'
                        ? 'bg-[#ff6b9d] text-black'
                        : 'bg-[#1a1a2e] text-gray-400 hover:bg-[#252540]'
                    }`}
                  >
                    <span className="sm:hidden">🤖</span>
                    <span className="hidden sm:inline">🤖 Agent</span>
                  </button>
                </div>
              ) : (
                <Link
                  href="/"
                  className="inline-flex text-xs px-3 py-1.5 rounded-md bg-[#1a1a2e] text-[#4ecdc4] hover:bg-[#252540] transition-all"
                >
                  Get Started
                </Link>
              )}
            </div>

            {/* Center: Logo */}
            <Link href="/" className="flex items-center gap-2 sm:gap-3 hover:opacity-80 transition-opacity shrink-0">
              <span className="text-2xl sm:text-3xl">🐚</span>
              <h1 className="text-xl sm:text-2xl font-bold">
                <span className="text-[#4ecdc4]">shell</span>
                <span className="text-[#ff6b9d]">mates</span>
              </h1>
            </Link>

            {/* Right: User + Token */}
            <div className="flex-1 flex justify-end items-center gap-2 min-w-0">
              {!sessionLoading && (
                user ? (
                  <Link
                    href="/profile"
                    className="inline-flex items-center gap-1.5 text-xs px-2 sm:px-3 py-1.5 rounded-md bg-[#1a1a2e] hover:bg-[#252540] transition-all whitespace-nowrap"
                  >
                    <span style={{ color: user.avatar_color }}>{user.avatar_emoji}</span>
                    <span className="hidden sm:inline text-gray-300">{user.username}</span>
                  </Link>
                ) : (
                  <Link
                    href="/login"
                    className="text-xs px-2 sm:px-3 py-1.5 rounded-md bg-[#1a1a2e] text-gray-400 hover:bg-[#252540] hover:text-white transition-all whitespace-nowrap"
                  >
                    Login
                  </Link>
                )
              )}
              <Link
                href="/token"
                className="inline-flex items-center gap-1 text-xs px-2 sm:px-3 py-1.5 rounded-md bg-[#1a1a2e] text-[#4ecdc4] hover:bg-[#252540] transition-all whitespace-nowrap"
              >
                <span>🐚</span>
                <span className="hidden sm:inline">$SHELLMATES</span>
                <span className="sm:hidden">Token</span>
              </Link>
            </div>
          </div>

          {/* Navigation links */}
          <nav className="flex items-center justify-center gap-3 sm:gap-6 mt-3 pt-3 border-t border-[#1a1a2e]/50 overflow-x-auto scrollbar-hide">
            {user && loggedInLinks.map((link) => {
              const isActive = pathname === link.href || pathname.startsWith(link.href + '/');
              return isActive ? (
                <span key={link.href} className="text-xs sm:text-sm text-[#ff6b9d] font-medium whitespace-nowrap">
                  {link.label}
                </span>
              ) : (
                <Link
                  key={link.href}
                  href={link.href}
                  className="text-xs sm:text-sm text-[#ff6b9d]/60 hover:text-[#ff6b9d] transition-colors whitespace-nowrap"
                >
                  {link.label}
                </Link>
              );
            })}
            {user && <span className="text-[#1a1a2e]">|</span>}
            {navLinks.map((link) => {
              const isActive = pathname === link.href || pathname.startsWith(link.href + '/');
              return isActive ? (
                <span key={link.href} className="text-xs sm:text-sm text-white font-medium whitespace-nowrap">
                  {link.label}
                </span>
              ) : (
                <Link
                  key={link.href}
                  href={link.href}
                  className="text-xs sm:text-sm text-gray-400 hover:text-white transition-colors whitespace-nowrap"
                >
                  {link.label}
                </Link>
              );
            })}
          </nav>
        </div>
      </header>
      <div className="h-1 bg-gradient-to-r from-[#4ecdc4] via-[#ff6b9d] to-[#4ecdc4]" />
    </>
  );
}
