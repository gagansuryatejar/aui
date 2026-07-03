'use client';

import React, { useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import {
  Copy,
  Check,
  Pencil,
  RefreshCw,
  User,
  Sparkles,
  ThumbsUp,
  ThumbsDown,
} from 'lucide-react';
import MarkdownRenderer from './MarkdownRenderer';
import type { ChatMessage } from '@/types';

interface MessageBubbleProps {
  message: ChatMessage;
  onEdit?: (messageId: string, newContent: string) => void;
  onRegenerate?: () => void;
  isLast?: boolean;
}

export default function MessageBubble({
  message,
  onEdit,
  onRegenerate,
  isLast = false,
}: MessageBubbleProps) {
  const [copied, setCopied] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editContent, setEditContent] = useState(message.content);

  const isUser = message.role === 'user';
  const isStreaming = message.isStreaming;

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(message.content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // silent
    }
  }, [message.content]);

  const handleSaveEdit = useCallback(() => {
    if (editContent.trim() && onEdit) {
      onEdit(message.id, editContent.trim());
      setEditing(false);
    }
  }, [editContent, message.id, onEdit]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: 'easeOut' }}
      style={{
        display: 'flex',
        gap: '16px',
        padding: '24px 0',
        maxWidth: '48rem',
        width: '100%',
        margin: '0 auto',
      }}
    >
      {/* Avatar */}
      <div
        style={{
          width: 32,
          height: 32,
          borderRadius: 'var(--radius-full)',
          flexShrink: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: isUser
            ? 'linear-gradient(135deg, #6366f1, #8b5cf6)'
            : 'linear-gradient(135deg, #10b981, #06b6d4)',
          color: 'white',
          boxShadow: 'var(--shadow-sm)',
        }}
      >
        {isUser ? <User size={16} /> : <Sparkles size={16} />}
      </div>

      {/* Content */}
      <div style={{ flex: 1, minWidth: 0 }}>
        {/* Role label */}
        <div
          style={{
            fontSize: '0.8125rem',
            fontWeight: 600,
            color: 'var(--text-primary)',
            marginBottom: '6px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}
        >
          {isUser ? 'You' : 'AUI'}
          {!isUser && message.model && (
            <span
              style={{
                fontSize: '0.6875rem',
                fontWeight: 400,
                color: 'var(--text-tertiary)',
                background: 'var(--bg-tertiary)',
                padding: '2px 8px',
                borderRadius: 'var(--radius-full)',
              }}
            >
              {message.model}
            </span>
          )}
          {isStreaming && (
            <span style={{ display: 'flex', gap: '3px', alignItems: 'center' }}>
              <span style={{ animation: 'typingDot 1.4s infinite 0s', width: 4, height: 4, borderRadius: '50%', background: 'var(--brand-primary)', display: 'inline-block' }} />
              <span style={{ animation: 'typingDot 1.4s infinite 0.2s', width: 4, height: 4, borderRadius: '50%', background: 'var(--brand-primary)', display: 'inline-block' }} />
              <span style={{ animation: 'typingDot 1.4s infinite 0.4s', width: 4, height: 4, borderRadius: '50%', background: 'var(--brand-primary)', display: 'inline-block' }} />
            </span>
          )}
        </div>

        {/* Message body */}
        {editing ? (
          <div>
            <textarea
              value={editContent}
              onChange={(e) => setEditContent(e.target.value)}
              style={{
                width: '100%',
                minHeight: '100px',
                padding: '12px',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--border-focus)',
                background: 'var(--bg-input)',
                color: 'var(--text-primary)',
                fontSize: '0.9375rem',
                fontFamily: 'inherit',
                lineHeight: 1.6,
                resize: 'vertical',
                outline: 'none',
              }}
            />
            <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
              <button
                onClick={handleSaveEdit}
                style={{
                  padding: '6px 16px',
                  borderRadius: 'var(--radius-sm)',
                  border: 'none',
                  background: 'var(--brand-primary)',
                  color: 'white',
                  cursor: 'pointer',
                  fontSize: '0.8125rem',
                  fontWeight: 500,
                }}
              >
                Save & Submit
              </button>
              <button
                onClick={() => {
                  setEditing(false);
                  setEditContent(message.content);
                }}
                style={{
                  padding: '6px 16px',
                  borderRadius: 'var(--radius-sm)',
                  border: '1px solid var(--border-primary)',
                  background: 'transparent',
                  color: 'var(--text-secondary)',
                  cursor: 'pointer',
                  fontSize: '0.8125rem',
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <div style={{ lineHeight: 1.7, fontSize: '0.9375rem', color: 'var(--text-primary)' }}>
            {isUser ? (
              <p style={{ whiteSpace: 'pre-wrap', margin: 0 }}>{message.content}</p>
            ) : message.content.trim() ? (
              <MarkdownRenderer content={message.content} />
            ) : message.isSearching ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', padding: '8px 0' }}>
                {/* Search animation */}
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  padding: '10px 16px',
                  borderRadius: 'var(--radius-md)',
                  background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.08), rgba(139, 92, 246, 0.08))',
                  border: '1px solid rgba(59, 130, 246, 0.15)',
                }}>
                  <div style={{
                    width: '18px',
                    height: '18px',
                    borderRadius: '50%',
                    border: '2px solid transparent',
                    borderTopColor: '#3b82f6',
                    borderRightColor: '#8b5cf6',
                    animation: 'spin 0.8s linear infinite',
                    flexShrink: 0,
                  }} />
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                    <span style={{
                      fontSize: '0.8125rem',
                      fontWeight: 600,
                      color: '#3b82f6',
                      letterSpacing: '0.01em',
                    }}>
                      Searching the web…
                    </span>
                    {message.searchQuery && (
                      <span style={{
                        fontSize: '0.75rem',
                        color: 'var(--text-tertiary)',
                        fontStyle: 'italic',
                        maxWidth: '400px',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}>
                        &quot;{message.searchQuery}&quot;
                      </span>
                    )}
                  </div>
                  {/* Animated dots */}
                  <div style={{ display: 'flex', gap: '4px', marginLeft: 'auto' }}>
                    <span style={{ width: 5, height: 5, borderRadius: '50%', background: '#3b82f6', animation: 'searchDot 1.4s infinite 0s', display: 'inline-block' }} />
                    <span style={{ width: 5, height: 5, borderRadius: '50%', background: '#6366f1', animation: 'searchDot 1.4s infinite 0.2s', display: 'inline-block' }} />
                    <span style={{ width: 5, height: 5, borderRadius: '50%', background: '#8b5cf6', animation: 'searchDot 1.4s infinite 0.4s', display: 'inline-block' }} />
                  </div>
                </div>
              </div>
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '8px 0' }}>
                <div
                  style={{
                    width: '16px',
                    height: '16px',
                    borderRadius: '50%',
                    background: 'var(--text-primary)',
                    animation: 'pulseGlow 1.2s infinite ease-in-out',
                    flexShrink: 0,
                  }}
                />
                <span style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', fontStyle: 'italic', opacity: 0.8 }}>
                  Thinking…
                </span>
              </div>
            )}

            {/* Streaming cursor */}
            {isStreaming && message.content && (
              <span
                style={{
                  display: 'inline-block',
                  width: '2px',
                  height: '1.1em',
                  background: 'var(--brand-primary)',
                  marginLeft: '2px',
                  verticalAlign: 'text-bottom',
                  animation: 'pulse 1s infinite',
                }}
              />
            )}
          </div>
        )}

        {/* Action buttons – shown on hover / when not streaming */}
        {!editing && !isStreaming && message.content && (
          <div
            className="message-actions"
            style={{
              display: 'flex',
              gap: '4px',
              marginTop: '8px',
              opacity: 0,
              transition: 'opacity var(--transition-fast)',
            }}
          >
            <ActionButton
              icon={copied ? <Check size={14} /> : <Copy size={14} />}
              label={copied ? 'Copied' : 'Copy'}
              onClick={handleCopy}
              active={copied}
            />
            {isUser && onEdit && (
              <ActionButton
                icon={<Pencil size={14} />}
                label="Edit"
                onClick={() => setEditing(true)}
              />
            )}
            {!isUser && isLast && onRegenerate && (
              <ActionButton
                icon={<RefreshCw size={14} />}
                label="Regenerate"
                onClick={onRegenerate}
              />
            )}
            {!isUser && (
              <>
                <ActionButton
                  icon={<ThumbsUp size={14} />}
                  label="Good"
                  onClick={() => {}}
                />
                <ActionButton
                  icon={<ThumbsDown size={14} />}
                  label="Bad"
                  onClick={() => {}}
                />
              </>
            )}
          </div>
        )}
      </div>

      <style jsx>{`
        div:hover > .message-actions {
          opacity: 1 !important;
        }
      `}</style>
    </motion.div>
  );
}

function ActionButton({
  icon,
  label,
  onClick,
  active = false,
}: {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  active?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      title={label}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '4px',
        padding: '4px 8px',
        borderRadius: 'var(--radius-sm)',
        border: '1px solid var(--border-primary)',
        background: active ? 'rgba(34, 197, 94, 0.1)' : 'transparent',
        color: active ? '#22c55e' : 'var(--text-tertiary)',
        cursor: 'pointer',
        fontSize: '0.75rem',
        transition: 'all var(--transition-fast)',
      }}
      onMouseEnter={(e) => {
        if (!active) {
          e.currentTarget.style.background = 'var(--bg-hover)';
          e.currentTarget.style.color = 'var(--text-secondary)';
        }
      }}
      onMouseLeave={(e) => {
        if (!active) {
          e.currentTarget.style.background = 'transparent';
          e.currentTarget.style.color = 'var(--text-tertiary)';
        }
      }}
    >
      {icon}
    </button>
  );
}
