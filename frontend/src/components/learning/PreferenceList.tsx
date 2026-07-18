'use client';

import React, { useEffect, useState } from 'react';
import { Sparkles, Trash2, Pencil, Check, X, ToggleLeft, ToggleRight } from 'lucide-react';
import { apiGet, apiPost, apiDelete, apiPatch } from '@/lib/api';

interface Preference {
  id: string;
  key: string;
  value: string;
  source: string;
  updatedAt: string;
}

export default function PreferenceList() {
  const [preferences, setPreferences] = useState<Preference[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');
  const [learningEnabled, setLearningEnabled] = useState(true);

  useEffect(() => {
    loadPreferences();
    const stored = localStorage.getItem('aui_preference_learning');
    if (stored !== null) {
      setLearningEnabled(stored === 'true');
    }
  }, []);

  const loadPreferences = async () => {
    setLoading(true);
    try {
      const data = await apiGet<Preference[]>('/api/learning/preferences');
      setPreferences(data);
    } catch (err) {
      console.error('Failed to load preferences:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (pref: Preference) => {
    setEditingId(pref.id);
    setEditValue(pref.value);
  };

  const handleSave = async (id: string) => {
    if (!editValue.trim()) return;
    try {
      const res = await apiPatch<Preference>(`/api/learning/preferences/${id}`, {
        value: editValue.trim(),
      });
      setPreferences((prev) => prev.map((p) => (p.id === id ? res : p)));
      setEditingId(null);
    } catch (err) {
      alert('Failed to update preference');
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await apiDelete(`/api/learning/preferences/${id}`);
      setPreferences((prev) => prev.filter((p) => p.id !== id));
    } catch (err) {
      alert('Failed to delete preference');
    }
  };

  const toggleLearning = () => {
    const newValue = !learningEnabled;
    setLearningEnabled(newValue);
    localStorage.setItem('aui_preference_learning', String(newValue));
  };

  if (loading) {
    return (
      <div style={{ color: 'var(--text-tertiary)', fontSize: '0.8125rem', textAlign: 'center', padding: '1rem' }}>
        Loading user preferences…
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {/* Enable/Disable Toggle */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '12px 16px',
          borderRadius: 'var(--radius-md)',
          background: 'var(--bg-secondary)',
          border: '1px solid var(--border-primary)',
        }}
      >
        <div>
          <div style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-primary)' }}>
            Automatic Preference Inference
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>
            Allow AUI to parse conversations and learn your favorite models, frameworks, and styles.
          </div>
        </div>
        <button
          onClick={toggleLearning}
          style={{
            background: 'transparent',
            border: 'none',
            color: learningEnabled ? 'var(--brand-primary)' : 'var(--text-tertiary)',
            cursor: 'pointer',
            padding: 0,
            display: 'flex',
            alignItems: 'center',
          }}
        >
          {learningEnabled ? <ToggleRight size={38} /> : <ToggleLeft size={38} />}
        </button>
      </div>

      {/* Preferences List */}
      <div>
        <div style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '8px' }}>
          Learned Personal Preferences
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {preferences.length === 0 ? (
            <div style={{ fontSize: '0.8125rem', color: 'var(--text-tertiary)', fontStyle: 'italic', padding: '1rem 0' }}>
              No inferred preferences logged yet. Keep chatting to trigger learning cycles!
            </div>
          ) : (
            preferences.map((pref) => {
              const isEditing = editingId === pref.id;
              return (
                <div
                  key={pref.id}
                  style={{
                    padding: '12px 14px',
                    borderRadius: 'var(--radius-md)',
                    background: 'var(--bg-secondary)',
                    border: '1px solid var(--border-primary)',
                    display: 'flex',
                    alignItems: 'flex-start',
                    justifyContent: 'space-between',
                    gap: '12px',
                  }}
                >
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div
                      style={{
                        fontSize: '0.6875rem',
                        color: 'var(--brand-primary)',
                        fontWeight: 600,
                        textTransform: 'uppercase',
                        letterSpacing: '0.05em',
                        marginBottom: '4px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                      }}
                    >
                      <Sparkles size={10} />
                      {pref.key.replace(/_/g, ' ')}
                      <span style={{ color: 'var(--text-tertiary)', fontWeight: 400, textTransform: 'lowercase' }}>
                        ({pref.source})
                      </span>
                    </div>

                    {isEditing ? (
                      <div style={{ display: 'flex', gap: '6px', marginTop: '4px' }}>
                        <input
                          type="text"
                          value={editValue}
                          onChange={(e) => setEditValue(e.target.value)}
                          style={{
                            flex: 1,
                            padding: '4px 8px',
                            background: 'var(--bg-input)',
                            border: '1px solid var(--border-focus)',
                            borderRadius: '4px',
                            color: 'var(--text-primary)',
                            fontSize: '0.8125rem',
                            outline: 'none',
                          }}
                        />
                        <button
                          onClick={() => handleSave(pref.id)}
                          style={{ padding: '4px', background: 'transparent', border: 'none', color: '#22c55e', cursor: 'pointer' }}
                        >
                          <Check size={16} />
                        </button>
                        <button
                          onClick={() => setEditingId(null)}
                          style={{ padding: '4px', background: 'transparent', border: 'none', color: '#ef4444', cursor: 'pointer' }}
                        >
                          <X size={16} />
                        </button>
                      </div>
                    ) : (
                      <div style={{ fontSize: '0.875rem', color: 'var(--text-primary)', lineHeight: '1.4' }}>
                        {pref.value}
                      </div>
                    )}
                  </div>

                  {!isEditing && (
                    <div style={{ display: 'flex', gap: '4px', alignSelf: 'center' }}>
                      <button
                        onClick={() => handleEdit(pref)}
                        style={{
                          padding: '4px',
                          background: 'transparent',
                          border: 'none',
                          color: 'var(--text-tertiary)',
                          cursor: 'pointer',
                        }}
                      >
                        <Pencil size={13} />
                      </button>
                      <button
                        onClick={() => handleDelete(pref.id)}
                        style={{
                          padding: '4px',
                          background: 'transparent',
                          border: 'none',
                          color: 'var(--text-tertiary)',
                          cursor: 'pointer',
                        }}
                      >
                        <Trash2 size={13} style={{ color: '#ef4444' }} />
                      </button>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
