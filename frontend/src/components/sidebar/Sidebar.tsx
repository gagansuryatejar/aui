'use client';

import React, { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  MessageSquarePlus,
  Search,
  Pin,
  Trash2,
  Pencil,
  ChevronDown,
  ChevronRight,
  Settings,
  LogOut,
  X,
  LogIn,
  Home,
  LayoutDashboard,
  Brain,
  Compass,
  FolderGit2,
  Database,
  Cpu,
} from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useChatStore } from '@/store/chat-store';
import { useUIStore } from '@/store/ui-store';
import { useMemoryStore } from '@/store/memory-store';
import { truncate } from '@/lib/utils';
import type { ConversationListItem } from '@/types';

export default function Sidebar() {
  const pathname = usePathname();
  const {
    conversations,
    activeConversationId,
    newChat,
    loadConversation,
    deleteConversation,
    renameConversation,
    pinConversation,
  } = useChatStore();

  const {
    sidebarOpen,
    sidebarSearchQuery,
    toggleSidebar,
    setSidebarSearch,
    setSettingsOpen,
    logout,
    user,
    isMobile,
    setAuthModalOpen,
  } = useUIStore();

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    pinned: true,
    today: true,
    previous: true,
  });

  const filteredConversations = conversations.filter((c) =>
    c.title.toLowerCase().includes(sidebarSearchQuery.toLowerCase()),
  );

  const pinnedConversations = filteredConversations.filter((c) => c.pinned);
  const unpinnedConversations = filteredConversations.filter((c) => !c.pinned);

  // Group by date
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  const todayChats = unpinnedConversations.filter(
    (c) => new Date(c.updatedAt) >= today,
  );
  const yesterdayChats = unpinnedConversations.filter((c) => {
    const d = new Date(c.updatedAt);
    return d >= yesterday && d < today;
  });
  const olderChats = unpinnedConversations.filter(
    (c) => new Date(c.updatedAt) < yesterday,
  );

  const toggleSection = (key: string) => {
    setExpandedSections((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const handleRename = useCallback(
    async (id: string) => {
      if (editTitle.trim()) {
        await renameConversation(id, editTitle.trim());
      }
      setEditingId(null);
    },
    [editTitle, renameConversation],
  );

  // Primary OS Tools
  const primaryTools = [
    { name: 'Workspace', icon: <Home size={16} />, href: '/', active: pathname === '/' },
    { name: 'Dashboard', icon: <LayoutDashboard size={16} />, href: '/dashboard', active: pathname === '/dashboard' },
  ];

  const ConversationItem = ({ conv }: { conv: ConversationListItem }) => {
    const isActive = conv.id === activeConversationId;
    const isEditing = editingId === conv.id;

    return (
      <motion.div
        layout
        initial={{ opacity: 0, x: -10 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: -10 }}
        className="group relative"
      >
        <button
          onClick={() => !isEditing && loadConversation(conv.id)}
          style={{
            display: 'flex',
            alignItems: 'center',
            width: '100%',
            padding: '8px 10px',
            borderRadius: 'var(--radius-md)',
            border: 'none',
            background: isActive ? 'var(--glass-hover)' : 'transparent',
            color: isActive ? 'var(--text-primary)' : 'var(--text-secondary)',
            cursor: 'pointer',
            textAlign: 'left',
            fontSize: '0.8125rem',
            transition: 'all 0.2s var(--ease-smooth)',
            gap: '8px',
          }}
          onMouseEnter={(e) => {
            if (!isActive) e.currentTarget.style.background = 'var(--glass)';
          }}
          onMouseLeave={(e) => {
            if (!isActive) e.currentTarget.style.background = 'transparent';
          }}
        >
          {conv.pinned && (
            <Pin size={11} style={{ color: 'var(--brand)', flexShrink: 0 }} />
          )}

          {isEditing ? (
            <input
              autoFocus
              value={editTitle}
              onChange={(e) => setEditTitle(e.target.value)}
              onBlur={() => handleRename(conv.id)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleRename(conv.id);
                if (e.key === 'Escape') setEditingId(null);
              }}
              style={{
                flex: 1,
                background: 'var(--bg-elevated)',
                border: '1px solid var(--brand)',
                borderRadius: '4px',
                padding: '2px 6px',
                color: 'var(--text-primary)',
                fontSize: '0.8125rem',
                outline: 'none',
              }}
              onClick={(e) => e.stopPropagation()}
            />
          ) : (
            <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {truncate(conv.title, 30)}
            </span>
          )}

          {/* Actions */}
          {!isEditing && (
            <div
              style={{
                display: 'flex',
                gap: '2px',
                opacity: 0,
                transition: 'opacity 0.2s var(--ease-smooth)',
              }}
              className="sidebar-item-actions"
            >
              <ActionBtn
                icon={<Pencil size={11} />}
                onClick={(e) => {
                  e.stopPropagation();
                  setEditingId(conv.id);
                  setEditTitle(conv.title);
                }}
              />
              <ActionBtn
                icon={<Pin size={11} />}
                onClick={(e) => {
                  e.stopPropagation();
                  pinConversation(conv.id, !conv.pinned);
                }}
              />
              <ActionBtn
                icon={<Trash2 size={11} />}
                onClick={(e) => {
                  e.stopPropagation();
                  deleteConversation(conv.id);
                }}
                danger
              />
            </div>
          )}
        </button>

        <style jsx>{`
          .group:hover .sidebar-item-actions {
            opacity: 1 !important;
          }
        `}</style>
      </motion.div>
    );
  };

  const SectionHeader = ({
    label,
    sectionKey,
    count,
  }: {
    label: string;
    sectionKey: string;
    count: number;
  }) => {
    if (count === 0) return null;
    const expanded = expandedSections[sectionKey] !== false;

    return (
      <div
        onClick={() => toggleSection(sectionKey)}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '6px 8px',
          color: 'var(--text-tertiary)',
          cursor: 'pointer',
          userSelect: 'none',
          marginTop: '8px',
        }}
      >
        <span style={{ fontSize: '0.65rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          {label} ({count})
        </span>
        {expanded ? <ChevronDown size={10} /> : <ChevronRight size={10} />}
      </div>
    );
  };

  return (
    <>
      {/* Mobile backdrop */}
      <AnimatePresence>
        {isMobile && sidebarOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={toggleSidebar}
            style={{
              position: 'fixed',
              inset: 0,
              background: 'var(--bg-overlay)',
              zIndex: 40,
              backdropFilter: 'blur(4px)',
            }}
          />
        )}
      </AnimatePresence>

      <motion.aside
        initial={false}
        animate={{
          width: sidebarOpen ? 280 : 0,
          opacity: sidebarOpen ? 1 : 0,
        }}
        transition={{ duration: 0.3, ease: 'easeInOut' }}
        className="glass-sidebar"
        style={{
          position: isMobile ? 'fixed' : 'relative',
          left: 0,
          top: 0,
          bottom: 0,
          margin: isMobile ? 0 : '8px 0 8px 8px',
          zIndex: isMobile ? 50 : 'auto',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          flexShrink: 0,
        }}
      >
        {/* Workspace Brand Header */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '16px',
            borderBottom: '1px solid var(--glass-border)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div
              style={{
                width: 26,
                height: 26,
                borderRadius: '6px',
                background: 'linear-gradient(135deg, var(--brand), var(--accent))',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Cpu size={12} color="white" />
            </div>
            <span style={{ fontWeight: 700, fontSize: '0.85rem', color: 'var(--text-primary)', letterSpacing: '-0.01em' }}>
              AUI Agent OS
            </span>
          </div>

          {isMobile && (
            <button
              onClick={toggleSidebar}
              style={{
                padding: '4px',
                background: 'transparent',
                border: 'none',
                color: 'var(--text-secondary)',
                cursor: 'pointer',
              }}
            >
              <X size={16} />
            </button>
          )}
        </div>

        {/* Primary Navigation OS Tools */}
        <div style={{ padding: '12px 16px 6px 16px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
          {primaryTools.map((t) => (
            <Link key={t.name} href={t.href} passHref legacyBehavior>
              <a
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  padding: '10px 12px',
                  borderRadius: 'var(--radius-md)',
                  background: t.active ? 'var(--brand-muted)' : 'transparent',
                  color: t.active ? 'var(--brand)' : 'var(--text-secondary)',
                  fontSize: '0.85rem',
                  fontWeight: t.active ? 600 : 500,
                  cursor: 'pointer',
                  transition: 'all 0.2s var(--ease-smooth)',
                }}
                onMouseEnter={(e) => {
                  if (!t.active) {
                    e.currentTarget.style.background = 'var(--glass)';
                    e.currentTarget.style.color = 'var(--text-primary)';
                  }
                }}
                onMouseLeave={(e) => {
                  if (!t.active) {
                    e.currentTarget.style.background = 'transparent';
                    e.currentTarget.style.color = 'var(--text-secondary)';
                  }
                }}
              >
                {t.icon}
                <span>{t.name}</span>
              </a>
            </Link>
          ))}
        </div>

        {/* Action Button: New Chat */}
        <div style={{ padding: '6px 16px 10px 16px' }}>
          <button
            onClick={() => {
              newChat();
              if (isMobile) toggleSidebar();
            }}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              padding: '10px',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--glass-border)',
              background: 'var(--glass)',
              color: 'var(--text-primary)',
              cursor: 'pointer',
              fontSize: '0.85rem',
              fontWeight: 600,
              width: '100%',
              transition: 'all 0.2s var(--ease-smooth)',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'var(--glass-hover)';
              e.currentTarget.style.borderColor = 'var(--glass-border-hover)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'var(--glass)';
              e.currentTarget.style.borderColor = 'var(--glass-border)';
            }}
          >
            <MessageSquarePlus size={15} />
            <span>New Session</span>
          </button>
        </div>

        {/* Search */}
        <div style={{ padding: '0 16px 8px 16px' }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '6px 12px',
              borderRadius: 'var(--radius-md)',
              background: 'rgba(255, 255, 255, 0.02)',
              border: '1px solid var(--glass-border)',
            }}
          >
            <Search size={12} style={{ color: 'var(--text-tertiary)', flexShrink: 0 }} />
            <input
              type="text"
              placeholder="Filter sessions…"
              value={sidebarSearchQuery}
              onChange={(e) => setSidebarSearch(e.target.value)}
              style={{
                flex: 1,
                border: 'none',
                background: 'transparent',
                color: 'var(--text-primary)',
                fontSize: '0.78rem',
                outline: 'none',
              }}
            />
            {sidebarSearchQuery && (
              <button
                onClick={() => setSidebarSearch('')}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: 'var(--text-secondary)',
                  cursor: 'pointer',
                  padding: '2px',
                }}
              >
                <X size={10} />
              </button>
            )}
          </div>
        </div>

        {/* Conversation list */}
        <div
          style={{
            flex: 1,
            overflowY: 'auto',
            padding: '4px 16px',
            borderTop: '1px solid var(--glass-border)',
          }}
        >
          {/* Pinned */}
          {pinnedConversations.length > 0 && (
            <div style={{ marginBottom: '8px' }}>
              <SectionHeader label="Pinned" sectionKey="pinned" count={pinnedConversations.length} />
              <AnimatePresence>
                {expandedSections.pinned &&
                  pinnedConversations.map((c) => (
                    <ConversationItem key={c.id} conv={c} />
                  ))}
              </AnimatePresence>
            </div>
          )}

          {/* Today */}
          {todayChats.length > 0 && (
            <div style={{ marginBottom: '8px' }}>
              <SectionHeader label="Today" sectionKey="today" count={todayChats.length} />
              <AnimatePresence>
                {expandedSections.today &&
                  todayChats.map((c) => <ConversationItem key={c.id} conv={c} />)}
              </AnimatePresence>
            </div>
          )}

          {/* Yesterday */}
          {yesterdayChats.length > 0 && (
            <div style={{ marginBottom: '8px' }}>
              <SectionHeader label="Yesterday" sectionKey="yesterday" count={yesterdayChats.length} />
              <AnimatePresence>
                {expandedSections.yesterday !== false &&
                  yesterdayChats.map((c) => <ConversationItem key={c.id} conv={c} />)}
              </AnimatePresence>
            </div>
          )}

          {/* Older */}
          {olderChats.length > 0 && (
            <div style={{ marginBottom: '8px' }}>
              <SectionHeader label="Previous" sectionKey="previous" count={olderChats.length} />
              <AnimatePresence>
                {expandedSections.previous &&
                  olderChats.map((c) => <ConversationItem key={c.id} conv={c} />)}
              </AnimatePresence>
            </div>
          )}

          {filteredConversations.length === 0 && (
            <div
              style={{
                textAlign: 'center',
                padding: '2rem 1rem',
                color: 'var(--text-tertiary)',
                fontSize: '0.78rem',
              }}
            >
              {sidebarSearchQuery ? 'No matching chats' : 'No conversations yet'}
            </div>
          )}
        </div>

        {/* Footer */}
        <div
          style={{
            padding: '12px 16px',
            borderTop: '1px solid var(--glass-border)',
            display: 'flex',
            flexDirection: 'column',
            gap: '6px',
          }}
        >
          {user ? (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
              }}
            >
              <div
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: '50%',
                  background: 'linear-gradient(135deg, var(--brand), var(--accent))',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'white',
                  fontSize: '0.8125rem',
                  fontWeight: 600,
                  flexShrink: 0,
                  boxShadow: 'var(--shadow-sm)',
                }}
              >
                {user.name.charAt(0).toUpperCase()}
              </div>
              <div style={{ flex: 1, overflow: 'hidden' }}>
                <div
                  style={{
                    fontSize: '0.8125rem',
                    fontWeight: 600,
                    color: 'var(--text-primary)',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {user.name}
                </div>
                <div
                  style={{
                    fontSize: '0.6875rem',
                    color: 'var(--text-tertiary)',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {user.email}
                </div>
              </div>
              <button
                onClick={logout}
                title="Log out"
                style={{
                  padding: '6px',
                  background: 'transparent',
                  border: 'none',
                  color: 'var(--text-tertiary)',
                  cursor: 'pointer',
                  borderRadius: 'var(--radius-sm)',
                  display: 'flex',
                  alignItems: 'center',
                }}
                onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--danger)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--text-tertiary)'; }}
              >
                <LogOut size={13} />
              </button>
            </div>
          ) : (
            <button
              onClick={() => setAuthModalOpen(true)}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                padding: '10px 12px',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--glass-border)',
                background: 'var(--glass)',
                color: 'var(--text-primary)',
                cursor: 'pointer',
                fontSize: '0.8125rem',
                fontWeight: 600,
                width: '100%',
                transition: 'all 0.2s var(--ease-smooth)',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'var(--glass-hover)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'var(--glass)';
              }}
            >
              <LogIn size={15} style={{ color: 'var(--brand)' }} />
              <span>Sign In / Sign Up</span>
            </button>
          )}
        </div>
      </motion.aside>
    </>
  );
}

function ActionBtn({
  icon,
  onClick,
  danger = false,
}: {
  icon: React.ReactNode;
  onClick: (e: React.MouseEvent) => void;
  danger?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      style={{
        padding: '4px',
        borderRadius: '4px',
        border: 'none',
        background: 'transparent',
        color: danger ? '#ef4444' : 'var(--text-tertiary)',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        transition: 'all 0.2s var(--ease-smooth)',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.background = danger
          ? 'rgba(239, 68, 68, 0.12)'
          : 'var(--glass)';
        if (!danger) e.currentTarget.style.color = 'var(--text-primary)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = 'transparent';
        e.currentTarget.style.color = danger ? '#ef4444' : 'var(--text-tertiary)';
      }}
    >
      {icon}
    </button>
  );
}
