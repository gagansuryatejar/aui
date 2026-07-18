'use client';

import React, { useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  MapPin,
  Heart,
  Sparkles,
  Code,
  Target,
  Lightbulb,
  Star,
  Calendar,
} from 'lucide-react';
import { useMemoryStore } from '@/store/memory-store';

const CATEGORY_ICONS: Record<string, React.ReactNode> = {
  fact: <MapPin size={12} />,
  preference: <Heart size={12} />,
  personality: <Sparkles size={12} />,
  skill: <Code size={12} />,
  goal: <Target size={12} />,
  context: <Lightbulb size={12} />,
};

const CATEGORY_COLORS: Record<string, string> = {
  fact: '#3b82f6',
  preference: '#ec4899',
  personality: '#8b5cf6',
  skill: '#10b981',
  goal: '#f59e0b',
  context: '#6366f1',
};

export default function MemoryTimeline() {
  const { timeline, loadTimeline } = useMemoryStore();

  useEffect(() => {
    loadTimeline();
  }, [loadTimeline]);

  if (timeline.length === 0) {
    return (
      <div
        style={{
          textAlign: 'center',
          padding: '3rem 1rem',
          color: 'var(--text-tertiary)',
        }}
      >
        <Calendar size={40} style={{ margin: '0 auto 16px', opacity: 0.3 }} />
        <div style={{ fontSize: '0.9375rem', fontWeight: 500, marginBottom: '8px' }}>
          No timeline data yet
        </div>
        <div style={{ fontSize: '0.8125rem' }}>
          Your memory timeline will grow as AUI learns about you.
        </div>
      </div>
    );
  }

  return (
    <div style={{ paddingTop: '12px' }}>
      {timeline.map((entry, entryIndex) => {
        const date = new Date(entry.date);
        const isToday = new Date().toISOString().split('T')[0] === entry.date;
        const isYesterday = (() => {
          const yesterday = new Date();
          yesterday.setDate(yesterday.getDate() - 1);
          return yesterday.toISOString().split('T')[0] === entry.date;
        })();

        const dateLabel = isToday
          ? 'Today'
          : isYesterday
            ? 'Yesterday'
            : date.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });

        return (
          <div key={entry.date} style={{ marginBottom: '24px' }}>
            {/* Date header */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                marginBottom: '12px',
              }}
            >
              <div
                style={{
                  width: 10,
                  height: 10,
                  borderRadius: '50%',
                  background: isToday
                    ? 'var(--brand-primary)'
                    : 'var(--text-tertiary)',
                  boxShadow: isToday ? '0 0 8px rgba(99, 102, 241, 0.4)' : 'none',
                  flexShrink: 0,
                }}
              />
              <div
                style={{
                  fontSize: '0.8125rem',
                  fontWeight: 600,
                  color: isToday ? 'var(--brand-primary)' : 'var(--text-secondary)',
                }}
              >
                {dateLabel}
              </div>
              <div
                style={{
                  flex: 1,
                  height: '1px',
                  background: 'var(--border-primary)',
                }}
              />
              <div style={{ fontSize: '0.6875rem', color: 'var(--text-tertiary)' }}>
                {entry.memories.length} memor{entry.memories.length === 1 ? 'y' : 'ies'}
              </div>
            </div>

            {/* Memory items with timeline connector */}
            <div
              style={{
                marginLeft: '4px',
                borderLeft: '2px solid var(--border-primary)',
                paddingLeft: '20px',
              }}
            >
              {entry.memories.map((memory, i) => {
                const color = CATEGORY_COLORS[memory.category] || 'var(--text-secondary)';
                const icon = CATEGORY_ICONS[memory.category] || <Star size={12} />;

                return (
                  <motion.div
                    key={memory.id}
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: entryIndex * 0.1 + i * 0.04 }}
                    style={{
                      position: 'relative',
                      padding: '8px 12px',
                      marginBottom: '8px',
                      borderRadius: 'var(--radius-sm)',
                      background: 'var(--bg-secondary)',
                      border: '1px solid var(--border-primary)',
                    }}
                  >
                    {/* Timeline dot */}
                    <div
                      style={{
                        position: 'absolute',
                        left: '-27px',
                        top: '14px',
                        width: 8,
                        height: 8,
                        borderRadius: '50%',
                        background: color,
                        border: '2px solid var(--bg-primary)',
                      }}
                    />

                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '2px' }}>
                      <span style={{ color, display: 'flex' }}>{icon}</span>
                      <span
                        style={{
                          fontSize: '0.6875rem',
                          fontWeight: 500,
                          color,
                          textTransform: 'capitalize',
                        }}
                      >
                        {memory.category}
                      </span>
                      <span style={{ fontSize: '0.6875rem', color: 'var(--text-tertiary)' }}>
                        · {memory.key.replace(/_/g, ' ')}
                      </span>
                      {memory.importance >= 4 && (
                        <Star size={10} fill="#f59e0b" style={{ color: '#f59e0b' }} />
                      )}
                    </div>
                    <div
                      style={{
                        fontSize: '0.8125rem',
                        color: 'var(--text-primary)',
                        lineHeight: 1.5,
                      }}
                    >
                      {memory.content}
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
