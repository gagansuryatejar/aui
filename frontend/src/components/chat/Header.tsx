'use client';

import React from 'react';
import { Menu, Sparkles, Settings } from 'lucide-react';
import { useUIStore } from '@/store/ui-store';
import { useChatStore } from '@/store/chat-store';
import ThemeToggle from '../common/ThemeToggle';

export default function Header() {
  const { toggleSidebar, sidebarOpen, setSettingsOpen } = useUIStore();
  const { activeModel } = useChatStore();

  const getShortModelName = (modelId: string) => {
    const parts = modelId.split('/');
    const name = parts[parts.length - 1] || modelId;
    return name.replace(':free', '').trim();
  };

  return (
    <header
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 16px',
        height: 'var(--header-height)',
        borderBottom: '1px solid var(--border-primary)',
        background: 'var(--bg-primary)',
        flexShrink: 0,
        zIndex: 30,
      }}
    >
      {/* Left */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0 }}>
        <button
          onClick={toggleSidebar}
          title={sidebarOpen ? 'Close sidebar' : 'Open sidebar'}
          style={{
            padding: '8px',
            borderRadius: 'var(--radius-sm)',
            border: 'none',
            background: 'transparent',
            color: 'var(--text-secondary)',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            transition: 'all var(--transition-fast)',
            flexShrink: 0,
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'var(--bg-hover)';
            e.currentTarget.style.color = 'var(--text-primary)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'transparent';
            e.currentTarget.style.color = 'var(--text-secondary)';
          }}
        >
          <Menu size={20} />
        </button>

        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
          <div
            style={{
              width: 22,
              height: 22,
              borderRadius: 'var(--radius-sm)',
              background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Sparkles size={12} color="white" />
          </div>
          <span
            style={{
              fontWeight: 600,
              fontSize: '0.9rem',
              color: 'var(--text-primary)',
            }}
          >
            AUI
          </span>
        </div>

        {activeModel && (
          <span
            title={activeModel}
            style={{
              fontSize: '0.7rem',
              color: 'var(--text-tertiary)',
              background: 'var(--bg-tertiary)',
              padding: '2px 8px',
              borderRadius: 'var(--radius-full)',
              border: '1px solid var(--border-primary)',
              maxWidth: '120px',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              display: 'inline-block',
              flexShrink: 1,
            }}
          >
            {getShortModelName(activeModel)}
          </span>
        )}
      </div>

      {/* Right */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '4px', flexShrink: 0 }}>
        <ThemeToggle />
        
        <button
          onClick={() => setSettingsOpen(true)}
          title="Settings"
          style={{
            padding: '8px',
            borderRadius: 'var(--radius-sm)',
            border: 'none',
            background: 'transparent',
            color: 'var(--text-secondary)',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            transition: 'all var(--transition-fast)',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'var(--bg-hover)';
            e.currentTarget.style.color = 'var(--text-primary)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'transparent';
            e.currentTarget.style.color = 'var(--text-secondary)';
          }}
        >
          <Settings size={18} />
        </button>
      </div>
    </header>
  );
}
