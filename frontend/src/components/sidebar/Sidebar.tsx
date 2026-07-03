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
  FolderOpen,
  Settings,
  LogOut,
  X,
  Menu,
  LogIn,
} from 'lucide-react';
import { useChatStore } from '@/store/chat-store';
import { useUIStore } from '@/store/ui-store';
import { truncate, formatDate } from '@/lib/utils';
import type { ConversationListItem } from '@/types';

export default function Sidebar() {
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
  const weekAgo = new Date(today);
  weekAgo.setDate(weekAgo.getDate() - 7);

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
            padding: '10px 12px',
            borderRadius: 'var(--radius-sm)',
            border: 'none',
            background: isActive ? 'var(--bg-hover)' : 'transparent',
            color: isActive ? 'var(--text-primary)' : 'var(--text-secondary)',
            cursor: 'pointer',
            textAlign: 'left',
            fontSize: '0.875rem',
            transition: 'all var(--transition-fast)',
            gap: '8px',
          }}
          onMouseEnter={(e) => {
            if (!isActive) e.currentTarget.style.background = 'var(--bg-hover)';
          }}
          onMouseLeave={(e) => {
            if (!isActive) e.currentTarget.style.background = 'transparent';
          }}
        >
          {conv.pinned && (
            <Pin size={12} style={{ color: 'var(--brand-primary)', flexShrink: 0 }} />
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
                background: 'var(--bg-input)',
                border: '1px solid var(--border-focus)',
                borderRadius: '4px',
                padding: '2px 6px',
                color: 'var(--text-primary)',
                fontSize: '0.875rem',
                outline: 'none',
              }}
              onClick={(e) => e.stopPropagation()}
            />
          ) : (
            <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {truncate(conv.title, 30)}
            </span>
          )}

          {/* Action buttons – visible on hover */}
          {!isEditing && (
            <div
              style={{
                display: 'flex',
                gap: '2px',
                opacity: 0,
                transition: 'opacity var(--transition-fast)',
              }}
              className="sidebar-item-actions"
            >
              <ActionBtn
                icon={<Pencil size={13} />}
                onClick={(e) => {
                  e.stopPropagation();
                  setEditingId(conv.id);
                  setEditTitle(conv.title);
                }}
              />
              <ActionBtn
                icon={<Pin size={13} />}
                onClick={(e) => {
                  e.stopPropagation();
                  pinConversation(conv.id, !conv.pinned);
                }}
              />
              <ActionBtn
                icon={<Trash2 size={13} />}
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
    return (
      <button
        onClick={() => toggleSection(sectionKey)}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          padding: '6px 12px',
          width: '100%',
          border: 'none',
          background: 'transparent',
          color: 'var(--text-tertiary)',
          fontSize: '0.75rem',
          fontWeight: 600,
          textTransform: 'uppercase',
          letterSpacing: '0.05em',
          cursor: 'pointer',
        }}
      >
        {expandedSections[sectionKey] ? (
          <ChevronDown size={12} />
        ) : (
          <ChevronRight size={12} />
        )}
        {label}
        <span style={{ marginLeft: 'auto', opacity: 0.6 }}>{count}</span>
      </button>
    );
  };

  return (
    <>
      {/* Mobile overlay */}
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
            }}
          />
        )}
      </AnimatePresence>

      <motion.aside
        initial={false}
        animate={{
          width: sidebarOpen ? 260 : 0,
          opacity: sidebarOpen ? 1 : 0,
        }}
        transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] }}
        style={{
          position: isMobile ? 'fixed' : 'relative',
          left: 0,
          top: 0,
          bottom: 0,
          zIndex: isMobile ? 50 : 'auto',
          background: 'var(--bg-sidebar)',
          borderRight: '1px solid var(--border-primary)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          flexShrink: 0,
        }}
      >
        {/* Header */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '12px',
            borderBottom: '1px solid var(--border-primary)',
          }}
        >
          <button
            onClick={() => { newChat(); if (isMobile) toggleSidebar(); }}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '8px 14px',
              borderRadius: 'var(--radius-sm)',
              border: '1px solid var(--border-primary)',
              background: 'transparent',
              color: 'var(--text-primary)',
              cursor: 'pointer',
              fontSize: '0.875rem',
              fontWeight: 500,
              transition: 'all var(--transition-fast)',
              flex: 1,
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'var(--bg-hover)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'transparent';
            }}
          >
            <MessageSquarePlus size={16} />
            New Chat
          </button>

          {isMobile && (
            <button
              onClick={toggleSidebar}
              style={{
                padding: '6px',
                background: 'transparent',
                border: 'none',
                borderRadius: 'var(--radius-sm)',
                color: 'var(--text-secondary)',
                cursor: 'pointer',
                marginLeft: '8px',
              }}
            >
              <X size={18} />
            </button>
          )}
        </div>

        {/* Search */}
        <div style={{ padding: '8px 12px' }}>
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
              placeholder="Search chats…"
              value={sidebarSearchQuery}
              onChange={(e) => setSidebarSearch(e.target.value)}
              style={{
                flex: 1,
                border: 'none',
                background: 'transparent',
                color: 'var(--text-primary)',
                fontSize: '0.8125rem',
                outline: 'none',
              }}
            />
            {sidebarSearchQuery && (
              <button
                onClick={() => setSidebarSearch('')}
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

        {/* Conversation list */}
        <div
          style={{
            flex: 1,
            overflowY: 'auto',
            padding: '4px 8px',
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
                fontSize: '0.875rem',
              }}
            >
              {sidebarSearchQuery ? 'No matching chats' : 'No conversations yet'}
            </div>
          )}
        </div>

        {/* Footer */}
        <div
          style={{
            padding: '12px',
            borderTop: '1px solid var(--border-primary)',
            display: 'flex',
            flexDirection: 'column',
            gap: '4px',
          }}
        >
          <button
            onClick={() => setSettingsOpen(true)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              padding: '10px 12px',
              borderRadius: 'var(--radius-sm)',
              border: 'none',
              background: 'transparent',
              color: 'var(--text-secondary)',
              cursor: 'pointer',
              fontSize: '0.875rem',
              width: '100%',
              textAlign: 'left',
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
            <Settings size={16} />
            Settings
          </button>

          {user ? (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                padding: '10px 12px',
              }}
            >
              <div
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: 'var(--radius-full)',
                  background: 'linear-gradient(135deg, var(--brand-primary), var(--brand-secondary))',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'white',
                  fontSize: '0.8125rem',
                  fontWeight: 600,
                  flexShrink: 0,
                }}
              >
                {user.name.charAt(0).toUpperCase()}
              </div>
              <div style={{ flex: 1, overflow: 'hidden' }}>
                <div
                  style={{
                    fontSize: '0.875rem',
                    fontWeight: 500,
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
                    fontSize: '0.75rem',
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
                  padding: '4px',
                  background: 'transparent',
                  border: 'none',
                  color: 'var(--text-tertiary)',
                  cursor: 'pointer',
                  borderRadius: 'var(--radius-sm)',
                }}
              >
                <LogOut size={14} />
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
                borderRadius: 'var(--radius-sm)',
                border: '1px solid var(--border-primary)',
                background: 'var(--bg-tertiary)',
                color: 'var(--text-primary)',
                cursor: 'pointer',
                fontSize: '0.875rem',
                fontWeight: 500,
                width: '100%',
                transition: 'all var(--transition-fast)',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'var(--bg-hover)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'var(--bg-tertiary)';
              }}
            >
              <LogIn size={16} style={{ color: 'var(--brand-primary)' }} />
              Sign In / Sign Up
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
        transition: 'all var(--transition-fast)',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.background = danger
          ? 'rgba(239, 68, 68, 0.1)'
          : 'var(--bg-hover)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = 'transparent';
      }}
    >
      {icon}
    </button>
  );
}
