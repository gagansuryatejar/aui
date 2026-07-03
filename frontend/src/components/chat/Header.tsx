'use client';

import React from 'react';
import { Menu, Sparkles } from 'lucide-react';
import { useUIStore } from '@/store/ui-store';
import { useChatStore } from '@/store/chat-store';
import ThemeToggle from '../common/ThemeToggle';

export default function Header() {
  const { toggleSidebar, sidebarOpen } = useUIStore();
  const { activeProvider, activeModel } = useChatStore();

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
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
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

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div
            style={{
              width: 24,
              height: 24,
              borderRadius: 'var(--radius-sm)',
              background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Sparkles size={14} color="white" />
          </div>
          <span
            style={{
              fontWeight: 600,
              fontSize: '0.9375rem',
              color: 'var(--text-primary)',
            }}
          >
            AUI
          </span>
        </div>

        {activeModel && (
          <span
            style={{
              fontSize: '0.75rem',
              color: 'var(--text-tertiary)',
              background: 'var(--bg-tertiary)',
              padding: '3px 10px',
              borderRadius: 'var(--radius-full)',
              border: '1px solid var(--border-primary)',
            }}
          >
            {activeModel}
          </span>
        )}
      </div>

      {/* Right */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <ThemeToggle />
      </div>
    </header>
  );
}
