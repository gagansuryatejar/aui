'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Bot, ChevronDown, X, Search } from 'lucide-react';
import { useUIStore } from '@/store/ui-store';

interface Persona {
  id: string;
  name: string;
  description: string;
  color: string;
  emoji: string;
  vibe?: string;
  category: string;
}

interface PersonaSelectorProps {
  selectedPersona: Persona | null;
  onSelect: (persona: Persona | null) => void;
}

const COLOR_MAP: Record<string, string> = {
  green: '#10b981',
  blue: '#3b82f6',
  purple: '#8b5cf6',
  red: '#ef4444',
  orange: '#f59e0b',
  pink: '#ec4899',
  yellow: '#eab308',
  teal: '#14b8a6',
  indigo: '#6366f1',
  gray: '#6b7280',
};

function getColor(name: string): string {
  return COLOR_MAP[name] || '#6366f1';
}

function formatCategory(cat: string): string {
  return cat
    .split('-')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'https://aui-backend.onrender.com';

export default function PersonaSelector({ selectedPersona, onSelect }: PersonaSelectorProps) {
  const { isMobile } = useUIStore();
  const [open, setOpen] = useState(false);
  const [personas, setPersonas] = useState<Persona[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open && personas.length === 0) {
      setLoading(true);
      fetch(`${API_BASE}/api/personas`)
        .then((r) => r.json())
        .then((data) => {
          if (data.success) setPersonas(data.data.personas || []);
        })
        .catch(() => {})
        .finally(() => setLoading(false));
    }
  }, [open, personas.length]);

  // Close on outside click
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const filtered = personas.filter(
    (p) =>
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.description.toLowerCase().includes(search.toLowerCase()) ||
      p.category.toLowerCase().includes(search.toLowerCase()),
  );

  // Group by category
  const grouped = filtered.reduce<Record<string, Persona[]>>((acc, p) => {
    if (!acc[p.category]) acc[p.category] = [];
    acc[p.category].push(p);
    return acc;
  }, {});

  return (
    <div ref={ref} style={{ position: 'relative', zIndex: 50 }}>
      {/* Trigger button */}
      <button
        id="persona-selector-btn"
        onClick={() => setOpen((v) => !v)}
        title={selectedPersona ? `Active: ${selectedPersona.name}` : 'Select a specialist persona'}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          padding: isMobile ? '5px 6px' : '5px 10px',
          borderRadius: 'var(--radius-full)',
          border: selectedPersona
            ? `1px solid ${getColor(selectedPersona.color)}55`
            : '1px solid var(--border-primary)',
          background: selectedPersona
            ? `${getColor(selectedPersona.color)}12`
            : 'transparent',
          color: selectedPersona ? getColor(selectedPersona.color) : 'var(--text-secondary)',
          cursor: 'pointer',
          fontSize: '0.78rem',
          fontWeight: 500,
          transition: 'all 0.15s ease',
          whiteSpace: 'nowrap',
        }}
      >
        {selectedPersona ? (
          <>
            <span style={{ fontSize: '0.85rem' }}>{selectedPersona.emoji}</span>
            {!isMobile && (
              <span style={{ maxWidth: 80, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {selectedPersona.name}
              </span>
            )}
          </>
        ) : (
          <>
            <Bot size={13} />
            {!isMobile && <span>Persona</span>}
          </>
        )}
        <ChevronDown
          size={12}
          style={{
            transform: open ? 'rotate(180deg)' : 'rotate(0)',
            transition: 'transform 0.15s ease',
          }}
        />
      </button>

      {/* Dropdown panel */}
      {open && (
        <div
          style={{
            position: 'absolute',
            top: 'calc(100% + 8px)',
            right: 0,
            width: 320,
            maxHeight: 420,
            background: 'var(--bg-secondary)',
            border: '1px solid var(--border-primary)',
            borderRadius: 'var(--radius-lg)',
            boxShadow: 'var(--shadow-xl, 0 8px 32px rgba(0,0,0,0.3))',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
          }}
        >
          {/* Header */}
          <div
            style={{
              padding: '10px 12px',
              borderBottom: '1px solid var(--border-primary)',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
            }}
          >
            <Search size={14} style={{ color: 'var(--text-tertiary)', flexShrink: 0 }} />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search personas..."
              autoFocus
              style={{
                flex: 1,
                background: 'transparent',
                border: 'none',
                outline: 'none',
                fontSize: '0.8rem',
                color: 'var(--text-primary)',
              }}
            />
            {selectedPersona && (
              <button
                onClick={() => { onSelect(null); setOpen(false); }}
                title="Clear persona"
                style={{
                  padding: '2px 6px',
                  borderRadius: 'var(--radius-sm)',
                  border: 'none',
                  background: 'var(--bg-hover)',
                  color: 'var(--text-secondary)',
                  cursor: 'pointer',
                  fontSize: '0.7rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '3px',
                }}
              >
                <X size={10} />
                Clear
              </button>
            )}
          </div>

          {/* List */}
          <div style={{ overflowY: 'auto', flex: 1 }}>
            {loading ? (
              <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-tertiary)', fontSize: '0.85rem' }}>
                Loading personas...
              </div>
            ) : filtered.length === 0 ? (
              <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-tertiary)', fontSize: '0.85rem' }}>
                No personas found
              </div>
            ) : (
              Object.entries(grouped).map(([category, items]) => (
                <div key={category}>
                  <div
                    style={{
                      padding: '6px 12px 2px',
                      fontSize: '0.65rem',
                      fontWeight: 600,
                      letterSpacing: '0.08em',
                      textTransform: 'uppercase',
                      color: 'var(--text-tertiary)',
                    }}
                  >
                    {formatCategory(category)}
                  </div>
                  {items.map((p) => {
                    const accent = getColor(p.color);
                    const isActive = selectedPersona?.id === p.id;
                    return (
                      <button
                        key={p.id}
                        onClick={() => { onSelect(p); setOpen(false); setSearch(''); }}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '10px',
                          width: '100%',
                          padding: '8px 12px',
                          border: 'none',
                          background: isActive ? `${accent}15` : 'transparent',
                          cursor: 'pointer',
                          textAlign: 'left',
                          transition: 'background 0.1s',
                          borderLeft: isActive ? `2px solid ${accent}` : '2px solid transparent',
                        }}
                        onMouseEnter={(e) => {
                          if (!isActive) e.currentTarget.style.background = 'var(--bg-hover)';
                        }}
                        onMouseLeave={(e) => {
                          if (!isActive) e.currentTarget.style.background = 'transparent';
                        }}
                      >
                        <span
                          style={{
                            width: 30,
                            height: 30,
                            borderRadius: '50%',
                            background: `${accent}20`,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '1rem',
                            flexShrink: 0,
                          }}
                        >
                          {p.emoji}
                        </span>
                        <div style={{ minWidth: 0 }}>
                          <div style={{ fontSize: '0.82rem', fontWeight: 500, color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {p.name}
                          </div>
                          <div style={{ fontSize: '0.7rem', color: 'var(--text-tertiary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {p.vibe || p.description.slice(0, 60)}
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
