'use client';

import React, { useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Sparkles, Code, Lightbulb, BookOpen } from 'lucide-react';
import MessageBubble from './MessageBubble';
import InputArea from './InputArea';
import { useChatStore } from '@/store/chat-store';

export default function ChatArea() {
  const { messages, isStreaming, editMessage, regenerateLastResponse, sendMessage } =
    useChatStore();

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when new messages come in
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const isEmpty = messages.length === 0;

  const suggestions = [
    {
      icon: <Code size={18} />,
      title: 'Write code',
      prompt: 'Write a TypeScript function to validate email addresses with regex',
      color: '#6366f1',
    },
    {
      icon: <Lightbulb size={18} />,
      title: 'Brainstorm ideas',
      prompt: 'Give me 10 creative project ideas for learning machine learning',
      color: '#f59e0b',
    },
    {
      icon: <BookOpen size={18} />,
      title: 'Explain a concept',
      prompt: 'Explain how transformers work in AI, with simple analogies',
      color: '#10b981',
    },
    {
      icon: <Sparkles size={18} />,
      title: 'Creative writing',
      prompt: 'Write a short sci-fi story about an AI that discovers music',
      color: '#ec4899',
    },
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
          /* Welcome screen */
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              height: '100%',
              padding: '2rem',
              maxWidth: '48rem',
              margin: '0 auto',
            }}
          >
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '16px',
                marginBottom: '3rem',
              }}
            >
              <div
                style={{
                  width: 56,
                  height: 56,
                  borderRadius: 'var(--radius-lg)',
                  background: 'linear-gradient(135deg, #6366f1, #8b5cf6, #06b6d4)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: 'var(--shadow-glow)',
                }}
              >
                <Sparkles size={28} color="white" />
              </div>
              <h1
                style={{
                  fontSize: '1.75rem',
                  fontWeight: 700,
                  background: 'linear-gradient(135deg, var(--text-primary), var(--text-secondary))',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                }}
              >
                How can I help you today?
              </h1>
              <p
                style={{
                  color: 'var(--text-tertiary)',
                  fontSize: '0.9375rem',
                  textAlign: 'center',
                  maxWidth: '28rem',
                }}
              >
                I can help with coding, analysis, writing, math, and much more.
                Ask me anything to get started.
              </p>
            </motion.div>

            {/* Suggestion cards */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.15 }}
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                gap: '12px',
                width: '100%',
                maxWidth: '40rem',
              }}
            >
              {suggestions.map((s, i) => (
                <motion.button
                  key={s.title}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 + i * 0.08 }}
                  onClick={() => sendMessage(s.prompt)}
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '10px',
                    padding: '16px',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--border-primary)',
                    background: 'var(--bg-secondary)',
                    cursor: 'pointer',
                    textAlign: 'left',
                    transition: 'all var(--transition-fast)',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = s.color;
                    e.currentTarget.style.boxShadow = `0 0 0 1px ${s.color}22`;
                    e.currentTarget.style.transform = 'translateY(-2px)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = 'var(--border-primary)';
                    e.currentTarget.style.boxShadow = 'none';
                    e.currentTarget.style.transform = 'translateY(0)';
                  }}
                >
                  <span style={{ color: s.color }}>{s.icon}</span>
                  <span
                    style={{
                      fontSize: '0.875rem',
                      fontWeight: 500,
                      color: 'var(--text-primary)',
                    }}
                  >
                    {s.title}
                  </span>
                  <span
                    style={{
                      fontSize: '0.8125rem',
                      color: 'var(--text-tertiary)',
                      lineHeight: 1.4,
                    }}
                  >
                    {s.prompt}
                  </span>
                </motion.button>
              ))}
            </motion.div>
          </div>
        ) : (
          /* Message list */
          <div style={{ paddingTop: '16px', paddingBottom: '16px' }}>
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
