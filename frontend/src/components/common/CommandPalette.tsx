'use client';

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Command, ArrowRight, CornerDownLeft, Sparkles, MessageSquare, Terminal } from 'lucide-react';
import { useUIStore } from '@/store/ui-store';
import { useChatStore } from '@/store/chat-store';
import { MODELS } from '../chat/Header';
import { useRouter } from 'next/navigation';

export default function CommandPalette() {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);

  const { conversations, loadConversation, setSelectedModelId, newChat } = useChatStore();
  const { setSettingsOpen, toggleSidebar } = useUIStore();

  const inputRef = useRef<HTMLInputElement>(null);

  // Toggle on Ctrl+K / Cmd+K
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setIsOpen((prev) => !prev);
      } else if (e.key === 'Escape') {
        setIsOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Reset indices on query change or open
  useEffect(() => {
    setSelectedIndex(0);
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 50);
    } else {
      setQuery('');
    }
  }, [query, isOpen]);

  if (!isOpen) return null;

  // Build commands list
  const systemCommands = [
    { id: 'new-chat', title: 'New Chat Session', category: 'General', icon: <MessageSquare size={14} />, action: () => { newChat(); setIsOpen(false); } },
    { id: 'go-dashboard', title: 'Open Operational Dashboard', category: 'Navigation', icon: <Terminal size={14} />, action: () => { router.push('/dashboard'); setIsOpen(false); } },
    { id: 'go-workspace', title: 'Open Chat Workspace', category: 'Navigation', icon: <Sparkles size={14} />, action: () => { router.push('/'); setIsOpen(false); } },
    { id: 'open-settings', title: 'Configure System Settings', category: 'General', icon: <SettingsIcon />, action: () => { setSettingsOpen(true); setIsOpen(false); } },
  ];

  // Model selection commands
  const modelCommands = MODELS.map((m) => ({
    id: `model-${m.id}`,
    title: `Switch to ${m.name} (${m.provider})`,
    category: 'Intelligence Routing',
    icon: <span>{m.icon}</span>,
    action: () => {
      setSelectedModelId(m.id);
      setIsOpen(false);
    },
  }));

  // Chat conversation list commands
  const chatCommands = conversations.slice(0, 5).map((c) => ({
    id: `chat-${c.id}`,
    title: `Open Chat: "${c.title}"`,
    category: 'Recent Chats',
    icon: <MessageSquare size={14} style={{ opacity: 0.6 }} />,
    action: () => {
      loadConversation(c.id);
      router.push('/');
      setIsOpen(false);
    },
  }));

  const allItems = [...systemCommands, ...modelCommands, ...chatCommands];

  const filtered = allItems.filter((item) =>
    item.title.toLowerCase().includes(query.toLowerCase()) ||
    item.category.toLowerCase().includes(query.toLowerCase())
  );

  const handleSelect = (index: number) => {
    const item = filtered[index];
    if (item) {
      item.action();
    }
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev + 1) % filtered.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev - 1 + filtered.length) % filtered.length);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      handleSelect(selectedIndex);
    }
  };

  return (
    <AnimatePresence>
      <div
        style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(5, 7, 13, 0.7)',
          backdropFilter: 'blur(8px)',
          zIndex: 1000,
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'center',
          paddingTop: '10vh',
        }}
        onClick={() => setIsOpen(false)}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.97, y: -10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.97, y: -10 }}
          transition={{ duration: 0.2, ease: 'easeOut' }}
          className="glass-card"
          style={{
            width: '100%',
            maxWidth: '560px',
            boxShadow: '0 24px 64px rgba(0,0,0,0.8), var(--shadow-glow)',
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column',
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header Input */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              padding: '14px 18px',
              borderBottom: '1px solid var(--glass-border)',
              gap: '12px',
            }}
          >
            <Search size={18} style={{ color: 'var(--text-secondary)' }} />
            <input
              ref={inputRef}
              type="text"
              placeholder="Search chats, models, commands…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={onKeyDown}
              style={{
                flex: 1,
                border: 'none',
                background: 'transparent',
                color: 'var(--text-primary)',
                fontSize: '0.9rem',
                outline: 'none',
              }}
            />
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                padding: '2px 6px',
                borderRadius: '4px',
                background: 'var(--glass)',
                border: '1px solid var(--glass-border)',
                color: 'var(--text-tertiary)',
                fontSize: '0.65rem',
              }}
            >
              <Command size={10} />
              <span>K</span>
            </div>
          </div>

          {/* Results List */}
          <div style={{ maxHeight: '350px', overflowY: 'auto', padding: '6px' }}>
            {filtered.length > 0 ? (
              filtered.map((item, index) => {
                const isSelected = index === selectedIndex;
                return (
                  <div
                    key={item.id}
                    onClick={() => handleSelect(index)}
                    onMouseEnter={() => setSelectedIndex(index)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '10px 14px',
                      borderRadius: 'var(--radius-md)',
                      background: isSelected ? 'var(--glass-hover)' : 'transparent',
                      cursor: 'pointer',
                      transition: 'all 0.15s var(--ease-smooth)',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <div style={{ display: 'flex', color: isSelected ? 'var(--brand)' : 'var(--text-secondary)' }}>
                        {item.icon}
                      </div>
                      <span style={{ fontSize: '0.85rem', fontWeight: isSelected ? 600 : 500, color: 'var(--text-primary)' }}>
                        {item.title}
                      </span>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ fontSize: '0.65rem', color: 'var(--text-tertiary)', background: 'var(--glass)', padding: '2px 6px', borderRadius: '4px', border: '1px solid var(--glass-border)' }}>
                        {item.category}
                      </span>
                      {isSelected && (
                        <CornerDownLeft size={12} style={{ color: 'var(--brand)' }} />
                      )}
                    </div>
                  </div>
                );
              })
            ) : (
              <div style={{ padding: '32px 16px', textAlign: 'center', color: 'var(--text-tertiary)', fontSize: '0.85rem' }}>
                No commands or items found matching query
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}

function SettingsIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.1a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"></path><circle cx="12" cy="12" r="3"></circle></svg>
  );
}
