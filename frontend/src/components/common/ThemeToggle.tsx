'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { Sun, Moon, Monitor } from 'lucide-react';
import { useUIStore } from '@/store/ui-store';
import type { Theme } from '@/types';

export default function ThemeToggle() {
  const { theme, setTheme } = useUIStore();

  const themes: Array<{ value: Theme; icon: React.ReactNode; label: string }> = [
    { value: 'light', icon: <Sun size={14} />, label: 'Light' },
    { value: 'dark', icon: <Moon size={14} />, label: 'Dark' },
    { value: 'system', icon: <Monitor size={14} />, label: 'System' },
  ];

  return (
    <div
      style={{
        display: 'flex',
        borderRadius: 'var(--radius-full)',
        background: 'var(--bg-tertiary)',
        padding: '3px',
        border: '1px solid var(--border-primary)',
      }}
    >
      {themes.map((t) => (
        <button
          key={t.value}
          onClick={() => setTheme(t.value)}
          title={t.label}
          style={{
            position: 'relative',
            padding: '5px 10px',
            borderRadius: 'var(--radius-full)',
            border: 'none',
            background: 'transparent',
            color:
              theme === t.value
                ? 'var(--text-primary)'
                : 'var(--text-tertiary)',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1,
            transition: 'color var(--transition-fast)',
          }}
        >
          {theme === t.value && (
            <motion.div
              layoutId="theme-indicator"
              style={{
                position: 'absolute',
                inset: 0,
                borderRadius: 'var(--radius-full)',
                background: 'var(--bg-primary)',
                boxShadow: 'var(--shadow-sm)',
              }}
              transition={{ type: 'spring', stiffness: 500, damping: 30 }}
            />
          )}
          <span style={{ position: 'relative', zIndex: 1 }}>{t.icon}</span>
        </button>
      ))}
    </div>
  );
}
