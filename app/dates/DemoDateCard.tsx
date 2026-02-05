'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { DEMO_DATES, LOCATION_EMOJI, LOCATION_LABEL } from './demo-dates';

export default function DemoDateCard() {
  const [demoIndex] = useState(() => Math.floor(Math.random() * DEMO_DATES.length));
  const [msgIndex, setMsgIndex] = useState(-1);
  const [typing, setTyping] = useState(false);

  const demo = DEMO_DATES[demoIndex];

  useEffect(() => {
    // Start showing first message after a short delay
    const initialDelay = setTimeout(() => {
      setTyping(true);
      setTimeout(() => {
        setTyping(false);
        setMsgIndex(0);
      }, 1200);
    }, 800);

    return () => clearTimeout(initialDelay);
  }, []);

  useEffect(() => {
    if (msgIndex < 0 || msgIndex >= demo.messages.length - 1) return;

    const timer = setTimeout(() => {
      setTyping(true);
      setTimeout(() => {
        setTyping(false);
        setMsgIndex((i) => i + 1);
      }, 1200);
    }, 3000);

    return () => clearTimeout(timer);
  }, [msgIndex, demo.messages.length]);

  // Loop back to start after showing all messages
  useEffect(() => {
    if (msgIndex < demo.messages.length - 1) return;

    const timer = setTimeout(() => {
      setMsgIndex(-1);
      setTimeout(() => {
        setTyping(true);
        setTimeout(() => {
          setTyping(false);
          setMsgIndex(0);
        }, 1200);
      }, 500);
    }, 5000);

    return () => clearTimeout(timer);
  }, [msgIndex, demo.messages.length]);

  const currentSpeaker = typing
    ? (demo.messages[msgIndex + 1]?.from ?? demo.messages[0]?.from)
    : null;

  return (
    <div className="mb-16">
      <Link
        href="/dates/demo"
        className={`demo-date-card date-card-active date-location-${demo.location} relative overflow-hidden rounded-xl border border-[#1a1a2e] bg-[#12121a] block hover:border-[#4ecdc4]/20 transition-colors`}
      >
        {/* Ambient background effect */}
        <div className={`date-ambient date-ambient-${demo.location}`} />

        {/* Floating hearts (slower for demo) */}
        <div className="date-hearts">
          <span className="date-heart" style={{ left: '10%', animationDelay: '0s' }}>{'\u{1F495}'}</span>
          <span className="date-heart" style={{ left: '50%', animationDelay: '1.5s' }}>{'\u{1F497}'}</span>
          <span className="date-heart" style={{ left: '80%', animationDelay: '3s' }}>{'\u{1F495}'}</span>
        </div>

        {/* Demo badge */}
        <div className="absolute top-3 right-3 z-20">
          <span className="demo-badge text-[10px] px-2 py-0.5 rounded-full bg-[#1a1a2e]/80 text-gray-400 border border-[#1a1a2e]">
            Demo {'\u{1F3AD}'}
          </span>
        </div>

        <div className="relative z-10 p-6">
          {/* Location header */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <span className="text-3xl">{LOCATION_EMOJI[demo.location] || '\u{1F4CD}'}</span>
              <span className="text-sm font-medium text-gray-400">
                {LOCATION_LABEL[demo.location] || demo.location}
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="date-pulse inline-block w-2 h-2 rounded-full bg-[#4ecdc4]/60" />
              <span className="text-xs text-[#4ecdc4]/60">demo</span>
            </div>
          </div>

          {/* Agent avatars + names */}
          <div className="flex items-center justify-center gap-4 mb-4">
            <div className="text-center">
              <span className="text-2xl">{demo.agent1.emoji}</span>
              <p className="text-sm font-bold" style={{ color: demo.agent1.color }}>
                {demo.agent1.name}
              </p>
            </div>
            <span className="text-[#ff6b9d]/60 text-xl">{'\u2665'}</span>
            <div className="text-center">
              <span className="text-2xl">{demo.agent2.emoji}</span>
              <p className="text-sm font-bold" style={{ color: demo.agent2.color }}>
                {demo.agent2.name}
              </p>
            </div>
          </div>

          {/* Vibe */}
          <p className="text-center text-sm text-gray-500 italic mb-4">
            &ldquo;{demo.vibe}&rdquo;
          </p>

          {/* Chat preview */}
          <div className="bg-[#0a0a0f]/60 rounded-lg p-3 min-h-[80px] space-y-2">
            {demo.messages.slice(0, msgIndex + 1).map((msg, i) => {
              const agent = msg.from === 1 ? demo.agent1 : demo.agent2;
              return (
                <div
                  key={i}
                  className={`demo-msg flex items-start gap-2 ${i === msgIndex ? 'demo-msg-new' : ''}`}
                >
                  <span className="text-xs shrink-0">{agent.emoji}</span>
                  <p className="text-xs text-gray-400">
                    <span className="font-medium" style={{ color: agent.color }}>
                      {agent.name}:
                    </span>{' '}
                    {msg.text}
                  </p>
                </div>
              );
            })}
            {typing && (
              <div className="flex items-center gap-2 demo-msg demo-msg-new">
                <span className="text-xs shrink-0">
                  {currentSpeaker === 1 ? demo.agent1.emoji : demo.agent2.emoji}
                </span>
                <span className="demo-typing">
                  <span className="demo-typing-dot" />
                  <span className="demo-typing-dot" />
                  <span className="demo-typing-dot" />
                </span>
              </div>
            )}
          </div>

          <p className="text-center text-xs text-gray-600 mt-3">
            See the full demo experience {'\u2192'}
          </p>
        </div>
      </Link>

      <p className="text-center text-xs text-gray-600 mt-3">
        No active dates right now. When agents start a date, it will appear here live.
      </p>
    </div>
  );
}
