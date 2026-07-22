'use client';

import React, { useRef, useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Sparkles,
  Code,
  Lightbulb,
  BookOpen,
  Brain,
  CheckSquare,
  Clock,
  Gauge,
  Terminal,
  ShieldCheck,
  Zap,
  ArrowRight,
  TrendingUp,
} from 'lucide-react';
import MessageBubble from './MessageBubble';
import InputArea from './InputArea';
import { useChatStore } from '@/store/chat-store';
import { useUIStore } from '@/store/ui-store';
import { useMemoryStore } from '@/store/memory-store';

export default function ChatArea() {
  const { messages, isStreaming, editMessage, regenerateLastResponse, sendMessage } = useChatStore();
  const { user } = useUIStore();
  const { memories, loadMemories } = useMemoryStore();

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const prevMsgCount = useRef(0);

  const [greeting, setGreeting] = useState('Hello');

  useEffect(() => {
    const hour = new Date().getHours();
    if (hour < 12) setGreeting('Good Morning');
    else if (hour < 18) setGreeting('Good Afternoon');
    else setGreeting('Good Evening');
  }, []);

  // Fetch memories once on welcome screen load
  useEffect(() => {
    if (messages.length === 0) {
      loadMemories().catch(() => {});
    }
  }, [messages.length, loadMemories]);

  // Auto-scroll to bottom when new messages arrive.
  useEffect(() => {
    const el = messagesEndRef.current;
    if (!el) return;
    const isNewMessage = messages.length > prevMsgCount.current;
    prevMsgCount.current = messages.length;
    el.scrollIntoView({ behavior: isStreaming ? 'auto' : (isNewMessage ? 'smooth' : 'auto') });
  }, [messages, isStreaming]);

  const isEmpty = messages.length === 0;

  const userName = user?.name ? user.name : user?.email ? user.email.split('@')[0] : 'Guest';

  const suggestions = [
    {
      icon: <Code size={18} />,
      title: 'Write code',
      prompt: 'Write a TypeScript function to validate email addresses with regex',
      color: '#6C63FF',
    },
    {
      icon: <Lightbulb size={18} />,
      title: 'Brainstorm ideas',
      prompt: 'Give me 10 creative project ideas for learning machine learning',
      color: '#00E5FF',
    },
    {
      icon: <BookOpen size={18} />,
      title: 'Explain a concept',
      prompt: 'Explain how transformers work in AI, with simple analogies',
      color: '#22C55E',
    },
    {
      icon: <Sparkles size={18} />,
      title: 'Creative writing',
      prompt: 'Write a short sci-fi story about an AI that discovers music',
      color: '#E53E3E',
    },
  ];

  // Hardcoded mock goals for home Bento card to look rich and dynamic
  const homeGoals = [
    { id: 'g1', title: 'Launch AUI 3.0 Platform', completed: true },
    { id: 'g2', title: 'Configure voice synthesis channels', completed: true },
    { id: 'g3', title: 'Connect local vector agent memory', completed: false },
  ];

  return (
    <div
      style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        overflow: 'hidden',
      }}
    >
      {/* Messages area */}
      <div
        ref={chatContainerRef}
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: '0 24px',
        }}
      >
        {isEmpty ? (
          /* Premium Bento Grid Home Page */
          <div
            style={{
              padding: '24px 0 40px 0',
              maxWidth: '68rem',
              margin: '0 auto',
              width: '100%',
            }}
          >
            {/* Hero Greeting Section with AI Orb */}
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                textAlign: 'center',
                marginTop: '2rem',
                marginBottom: '2.5rem',
                gap: '16px',
              }}
            >
              {/* Dynamic Breathing AI Orb */}
              <div style={{ marginBottom: '8px' }}>
                <div className={`ai-orb ${isStreaming ? 'ai-orb-thinking' : ''}`} />
              </div>

              <motion.h1
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                className="gradient-text"
                style={{
                  fontSize: '2.5rem',
                  fontWeight: 800,
                  letterSpacing: '-0.03em',
                  margin: 0,
                }}
              >
                {greeting}, {userName} 👋
              </motion.h1>
              <motion.p
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.1 }}
                style={{
                  color: 'var(--text-secondary)',
                  fontSize: '1rem',
                  maxWidth: '30rem',
                  margin: 0,
                }}
              >
                AUI 3.0 Unified Operational OS. Choose an assistant agent or ask anything to begin execution.
              </motion.p>
            </div>

            {/* Clean Quick Suggestion Cards */}
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
                gap: '12px',
                width: '100%',
                maxWidth: '44rem',
                margin: '0 auto',
              }}
            >
              {suggestions.map((s) => (
                <button
                  key={s.title}
                  onClick={() => sendMessage(s.prompt)}
                  className="glass-card border-glow hover-lift"
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '8px',
                    padding: '16px 18px',
                    borderRadius: 'var(--radius-lg)',
                    cursor: 'pointer',
                    textAlign: 'left',
                    background: 'var(--glass)',
                    border: '1px solid var(--glass-border)',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ color: s.color }}>{s.icon}</span>
                    <span style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                      {s.title}
                    </span>
                  </div>
                  <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', lineHeight: 1.4 }}>
                    {s.prompt}
                  </span>
                </button>
              ))}
            </motion.div>
          </div>
        ) : (
          /* Message list */
          <div style={{ paddingTop: '20px', paddingBottom: '20px' }}>
            {messages.map((msg, index) => (
              <MessageBubble
                key={msg.id}
                message={msg}
                onEdit={editMessage}
                onRegenerate={regenerateLastResponse}
                isLast={index === messages.length - 1}
              />
            ))}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* Input area */}
      <InputArea />
    </div>
  );
}
