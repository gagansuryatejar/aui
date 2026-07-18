'use client';

import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  Brain,
  Search,
  Trash2,
  Download,
  AlertTriangle,
  Sparkles,
  Target,
  Heart,
  Code,
  Lightbulb,
  MapPin,
  Star,
  Filter,
} from 'lucide-react';
import { useMemoryStore } from '@/store/memory-store';
import { useUIStore } from '@/store/ui-store';
import MemoryTimeline from './MemoryTimeline';

const CATEGORY_CONFIG: Record<
  string,
  { icon: React.ReactNode; label: string; color: string }
> = {
  fact: { icon: <MapPin size={12} />, label: 'Facts', color: '#3b82f6' },
  preference: { icon: <Heart size={12} />, label: 'Preferences', color: '#ec4899' },
  personality: { icon: <Sparkles size={12} />, label: 'Personality', color: '#8b5cf6' },
  skill: { icon: <Code size={12} />, label: 'Skills', color: '#10b981' },
  goal: { icon: <Target size={12} />, label: 'Goals', color: '#f59e0b' },
  context: { icon: <Lightbulb size={12} />, label: 'Context', color: '#6366f1' },
};

export default function MemoryPanel() {
  const {
    memories,
    stats,
    panelOpen,
    loading,
    searchQuery,
    filterCategory,
    setPanelOpen,
    setSearchQuery,
    setFilterCategory,
    loadMemories,
    loadStats,
    deleteMemory,
    clearAllMemories,
  } = useMemoryStore();

  const { isMobile } = useUIStore();
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [activeTab, setActiveTab] = useState<'memories' | 'timeline' | 'profile'>('memories');

  useEffect(() => {
    if (panelOpen) {
      loadMemories();
      loadStats();
    }
  }, [panelOpen, loadMemories, loadStats]);

  if (!panelOpen) return null;

  return (
    <AnimatePresence>
      {panelOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setPanelOpen(false)}
            style={{
              position: 'fixed',
              inset: 0,
              background: 'rgba(0, 0, 0, 0.5)',
              backdropFilter: 'blur(4px)',
              zIndex: 60,
            }}
          />

          {/* Panel */}
          <motion.div
            initial={{ x: isMobile ? '100%' : 400, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: isMobile ? '100%' : 400, opacity: 0 }}
            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
            style={{
              position: 'fixed',
              right: 0,
              top: 0,
              bottom: 0,
              width: isMobile ? '100%' : '420px',
              maxWidth: '100vw',
              background: 'var(--bg-primary)',
              borderLeft: '1px solid var(--border-primary)',
              zIndex: 70,
              display: 'flex',
              flexDirection: 'column',
              boxShadow: '-8px 0 30px rgba(0, 0, 0, 0.15)',
            }}
          >
            {/* Header */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '16px 20px',
                borderBottom: '1px solid var(--border-primary)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: 'var(--radius-md)',
                    background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'white',
                  }}
                >
                  <Brain size={18} />
                </div>
                <div>
                  <div style={{ fontWeight: 600, fontSize: '1rem', color: 'var(--text-primary)' }}>
                    Memory
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>
                    {stats ? `${stats.totalMemories} memories stored` : 'Loading…'}
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '4px' }}>
                <button
                  onClick={() => {
                    const a = document.createElement('a');
                    const token = localStorage.getItem('aui_token');
                    const url = `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000'}/api/memory/export`;
                    fetch(url, { headers: token ? { Authorization: `Bearer ${token}` } : {} })
                      .then((r) => r.blob())
                      .then((blob) => {
                        a.href = URL.createObjectURL(blob);
                        a.download = 'aui-memories.json';
                        a.click();
                      });
                  }}
                  title="Export memories"
                  style={{
                    padding: '8px',
                    background: 'transparent',
                    border: 'none',
                    color: 'var(--text-tertiary)',
                    cursor: 'pointer',
                    borderRadius: 'var(--radius-sm)',
                  }}
                >
                  <Download size={16} />
                </button>
                <button
                  onClick={() => setPanelOpen(false)}
                  style={{
                    padding: '8px',
                    background: 'transparent',
                    border: 'none',
                    color: 'var(--text-tertiary)',
                    cursor: 'pointer',
                    borderRadius: 'var(--radius-sm)',
                  }}
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            {/* Category Stats Bar */}
            {stats && stats.byCategory.length > 0 && (
              <div
                style={{
                  display: 'flex',
                  gap: '6px',
                  padding: '12px 20px',
                  overflowX: 'auto',
                  borderBottom: '1px solid var(--border-primary)',
                }}
              >
                <CategoryChip
                  label="All"
                  count={stats.totalMemories}
                  color="var(--text-secondary)"
                  active={!filterCategory}
                  onClick={() => setFilterCategory('')}
                />
                {stats.byCategory.map((cat) => {
                  const cfg = CATEGORY_CONFIG[cat.category] || {
                    icon: <Star size={12} />,
                    label: cat.category,
                    color: 'var(--text-secondary)',
                  };
                  return (
                    <CategoryChip
                      key={cat.category}
                      label={cfg.label}
                      count={cat.count}
                      color={cfg.color}
                      icon={cfg.icon}
                      active={filterCategory === cat.category}
                      onClick={() =>
                        setFilterCategory(filterCategory === cat.category ? '' : cat.category)
                      }
                    />
                  );
                })}
              </div>
            )}

            {/* Tabs */}
            <div
              style={{
                display: 'flex',
                gap: '0',
                borderBottom: '1px solid var(--border-primary)',
              }}
            >
              {(['memories', 'timeline', 'profile'] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  style={{
                    flex: 1,
                    padding: '10px 16px',
                    border: 'none',
                    background: 'transparent',
                    color: activeTab === tab ? 'var(--brand-primary)' : 'var(--text-tertiary)',
                    fontSize: '0.8125rem',
                    fontWeight: activeTab === tab ? 600 : 400,
                    cursor: 'pointer',
                    borderBottom: activeTab === tab ? '2px solid var(--brand-primary)' : '2px solid transparent',
                    textTransform: 'capitalize',
                    transition: 'all var(--transition-fast)',
                  }}
                >
                  {tab}
                </button>
              ))}
            </div>

            {/* Search */}
            {activeTab === 'memories' && (
              <div style={{ padding: '12px 20px' }}>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '8px 12px',
                    borderRadius: 'var(--radius-sm)',
                    background: 'var(--bg-input)',
                    border: '1px solid var(--border-primary)',
                  }}
                >
                  <Search size={14} style={{ color: 'var(--text-tertiary)', flexShrink: 0 }} />
                  <input
                    type="text"
                    placeholder="Search memories…"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    style={{
                      flex: 1,
                      border: 'none',
                      background: 'transparent',
                      color: 'var(--text-primary)',
                      fontSize: '0.8125rem',
                      outline: 'none',
                    }}
                  />
                  {searchQuery && (
                    <button
                      onClick={() => setSearchQuery('')}
                      style={{
                        background: 'transparent',
                        border: 'none',
                        color: 'var(--text-tertiary)',
                        cursor: 'pointer',
                        padding: '2px',
                      }}
                    >
                      <X size={12} />
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* Content */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '0 20px 20px' }}>
              {activeTab === 'memories' && (
                <>
                  {loading ? (
                    <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-tertiary)' }}>
                      Loading memories…
                    </div>
                  ) : memories.length === 0 ? (
                    <div
                      style={{
                        textAlign: 'center',
                        padding: '3rem 1rem',
                        color: 'var(--text-tertiary)',
                      }}
                    >
                      <Brain size={40} style={{ margin: '0 auto 16px', opacity: 0.3 }} />
                      <div style={{ fontSize: '0.9375rem', fontWeight: 500, marginBottom: '8px' }}>
                        {searchQuery ? 'No matching memories' : 'No memories yet'}
                      </div>
                      <div style={{ fontSize: '0.8125rem' }}>
                        AUI learns about you as you chat. Keep talking!
                      </div>
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', paddingTop: '4px' }}>
                      {memories.map((memory, i) => (
                        <MemoryCard
                          key={memory.id}
                          memory={memory}
                          index={i}
                          onDelete={() => deleteMemory(memory.id)}
                        />
                      ))}
                    </div>
                  )}
                </>
              )}

              {activeTab === 'timeline' && <MemoryTimeline />}

              {activeTab === 'profile' && <ProfileView stats={stats} />}
            </div>

            {/* Footer */}
            <div
              style={{
                padding: '12px 20px',
                borderTop: '1px solid var(--border-primary)',
                display: 'flex',
                justifyContent: 'center',
              }}
            >
              {showClearConfirm ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <AlertTriangle size={14} style={{ color: '#ef4444' }} />
                  <span style={{ fontSize: '0.8125rem', color: '#ef4444' }}>Delete all memories?</span>
                  <button
                    onClick={() => {
                      clearAllMemories();
                      setShowClearConfirm(false);
                    }}
                    style={{
                      padding: '4px 12px',
                      borderRadius: 'var(--radius-sm)',
                      border: 'none',
                      background: '#ef4444',
                      color: 'white',
                      cursor: 'pointer',
                      fontSize: '0.75rem',
                      fontWeight: 500,
                    }}
                  >
                    Confirm
                  </button>
                  <button
                    onClick={() => setShowClearConfirm(false)}
                    style={{
                      padding: '4px 12px',
                      borderRadius: 'var(--radius-sm)',
                      border: '1px solid var(--border-primary)',
                      background: 'transparent',
                      color: 'var(--text-secondary)',
                      cursor: 'pointer',
                      fontSize: '0.75rem',
                    }}
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setShowClearConfirm(true)}
                  style={{
                    padding: '6px 16px',
                    borderRadius: 'var(--radius-sm)',
                    border: '1px solid rgba(239, 68, 68, 0.3)',
                    background: 'transparent',
                    color: '#ef4444',
                    cursor: 'pointer',
                    fontSize: '0.8125rem',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    transition: 'all var(--transition-fast)',
                  }}
                >
                  <Trash2 size={14} />
                  Clear All Memories
                </button>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

// ── Sub-components ───────────────────────────────────────────

function CategoryChip({
  label,
  count,
  color,
  icon,
  active,
  onClick,
}: {
  label: string;
  count: number;
  color: string;
  icon?: React.ReactNode;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '4px',
        padding: '4px 10px',
        borderRadius: 'var(--radius-full)',
        border: `1px solid ${active ? color : 'var(--border-primary)'}`,
        background: active ? `${color}15` : 'transparent',
        color: active ? color : 'var(--text-tertiary)',
        cursor: 'pointer',
        fontSize: '0.6875rem',
        fontWeight: 500,
        whiteSpace: 'nowrap',
        transition: 'all var(--transition-fast)',
      }}
    >
      {icon}
      {label}
      <span style={{ opacity: 0.6 }}>{count}</span>
    </button>
  );
}

function MemoryCard({
  memory,
  index,
  onDelete,
}: {
  memory: import('@/types').Memory;
  index: number;
  onDelete: () => void;
}) {
  const cfg = CATEGORY_CONFIG[memory.category] || {
    icon: <Star size={12} />,
    label: memory.category,
    color: 'var(--text-secondary)',
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.03 }}
      className="group"
      style={{
        padding: '12px 14px',
        borderRadius: 'var(--radius-md)',
        border: '1px solid var(--border-primary)',
        background: 'var(--bg-secondary)',
        transition: 'all var(--transition-fast)',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
        <div
          style={{
            width: 28,
            height: 28,
            borderRadius: 'var(--radius-sm)',
            background: `${cfg.color}15`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: cfg.color,
            flexShrink: 0,
            marginTop: '2px',
          }}
        >
          {cfg.icon}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div
            style={{
              fontSize: '0.75rem',
              color: 'var(--text-tertiary)',
              fontWeight: 500,
              marginBottom: '2px',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            <span style={{ color: cfg.color }}>{cfg.label}</span>
            <span>·</span>
            <span>{memory.key.replace(/_/g, ' ')}</span>
            {memory.importance >= 4 && (
              <span style={{ color: '#f59e0b', display: 'flex' }}>
                <Star size={10} fill="#f59e0b" />
              </span>
            )}
          </div>
          <div
            style={{
              fontSize: '0.875rem',
              color: 'var(--text-primary)',
              lineHeight: 1.5,
            }}
          >
            {memory.content}
          </div>
          <div style={{ fontSize: '0.6875rem', color: 'var(--text-tertiary)', marginTop: '4px' }}>
            {new Date(memory.updatedAt).toLocaleDateString('en-US', {
              month: 'short',
              day: 'numeric',
              year: 'numeric',
            })}
          </div>
        </div>
        <button
          onClick={onDelete}
          style={{
            padding: '4px',
            background: 'transparent',
            border: 'none',
            color: 'var(--text-tertiary)',
            cursor: 'pointer',
            borderRadius: '4px',
            opacity: 0,
            transition: 'opacity var(--transition-fast)',
          }}
          className="memory-delete-btn"
        >
          <Trash2 size={13} />
        </button>
      </div>

      <style jsx>{`
        .group:hover .memory-delete-btn {
          opacity: 1 !important;
        }
        .group:hover {
          border-color: var(--border-secondary) !important;
        }
      `}</style>
    </motion.div>
  );
}

function ProfileView({ stats }: { stats: import('@/types').MemoryStats | null }) {
  if (!stats?.hasProfile || !stats.profile) {
    return (
      <div
        style={{
          textAlign: 'center',
          padding: '3rem 1rem',
          color: 'var(--text-tertiary)',
        }}
      >
        <Sparkles size={40} style={{ margin: '0 auto 16px', opacity: 0.3 }} />
        <div style={{ fontSize: '0.9375rem', fontWeight: 500, marginBottom: '8px' }}>
          Profile not learned yet
        </div>
        <div style={{ fontSize: '0.8125rem' }}>
          AUI learns your communication style, expertise, and preferences as you chat.
        </div>
      </div>
    );
  }

  const profile = stats.profile;
  const items = [
    { label: 'Communication Style', value: profile.communicationStyle, icon: '💬' },
    { label: 'Response Length', value: profile.preferredResponseLength, icon: '📏' },
    {
      label: 'Expertise Areas',
      value: profile.expertiseAreas.length > 0 ? profile.expertiseAreas.join(', ') : 'Not detected yet',
      icon: '🏆',
    },
    {
      label: 'Personality Traits',
      value: profile.personalityTraits.length > 0 ? profile.personalityTraits.join(', ') : 'Not detected yet',
      icon: '🎭',
    },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', paddingTop: '12px' }}>
      <div
        style={{
          fontSize: '0.8125rem',
          color: 'var(--text-tertiary)',
          marginBottom: '4px',
        }}
      >
        AUI has learned these traits about your communication style:
      </div>
      {items.map((item) => (
        <div
          key={item.label}
          style={{
            padding: '14px 16px',
            borderRadius: 'var(--radius-md)',
            border: '1px solid var(--border-primary)',
            background: 'var(--bg-secondary)',
          }}
        >
          <div
            style={{
              fontSize: '0.75rem',
              color: 'var(--text-tertiary)',
              fontWeight: 500,
              marginBottom: '4px',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            <span>{item.icon}</span>
            {item.label}
          </div>
          <div
            style={{
              fontSize: '0.875rem',
              color: 'var(--text-primary)',
              textTransform: 'capitalize',
            }}
          >
            {item.value}
          </div>
        </div>
      ))}
    </div>
  );
}
