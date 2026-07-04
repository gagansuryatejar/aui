'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  Palette,
  Keyboard,
  User,
  Shield,
  Bell,
  Info,
  Moon,
  Sun,
  Monitor,
  Sparkles,
  Sliders,
} from 'lucide-react';
import { useUIStore } from '@/store/ui-store';
import type { Theme } from '@/types';
import { apiGet, apiPost } from '@/lib/api';

type Tab = 'general' | 'appearance' | 'shortcuts' | 'account' | 'about' | 'admin';

export default function SettingsModal() {
  const { settingsOpen, setSettingsOpen, theme, setTheme, user } = useUIStore();
  const [activeTab, setActiveTab] = useState<Tab>('general');
  const [models, setModels] = useState<any[]>([]);
  const [loadingModels, setLoadingModels] = useState(false);
  const [errorModels, setErrorModels] = useState<string | null>(null);

  if (!settingsOpen) return null;

  const tabs: Array<{ id: Tab; label: string; icon: React.ReactNode }> = [
    { id: 'general', label: 'General', icon: <Shield size={16} /> },
    { id: 'appearance', label: 'Appearance', icon: <Palette size={16} /> },
    { id: 'shortcuts', label: 'Shortcuts', icon: <Keyboard size={16} /> },
    { id: 'account', label: 'Account', icon: <User size={16} /> },
    { id: 'about', label: 'About', icon: <Info size={16} /> },
  ];

  if (user?.role === 'admin') {
    tabs.push({ id: 'admin', label: 'Admin Panel', icon: <Sliders size={16} /> });
  }

  const shortcuts = [
    { keys: ['Ctrl', 'N'], action: 'New chat' },
    { keys: ['Ctrl', 'B'], action: 'Toggle sidebar' },
    { keys: ['Ctrl', 'K'], action: 'Search chats' },
    { keys: ['Ctrl', 'D'], action: 'Toggle dark mode' },
    { keys: ['Ctrl', ','], action: 'Open settings' },
    { keys: ['Enter'], action: 'Send message' },
    { keys: ['Shift', 'Enter'], action: 'New line' },
    { keys: ['Escape'], action: 'Stop generating / Close modal' },
  ];

  React.useEffect(() => {
    if (activeTab === 'admin' && settingsOpen) {
      const loadModels = async () => {
        setLoadingModels(true);
        setErrorModels(null);
        try {
          const data = await apiGet<any[]>('/api/admin/models');
          setModels(data);
        } catch (err: any) {
          setErrorModels(err.message || 'Failed to load models');
        } finally {
          setLoadingModels(false);
        }
      };
      loadModels();
    }
  }, [activeTab, settingsOpen]);

  const handleToggleModel = async (modelId: string, currentEnabled: boolean) => {
    setModels((prev) =>
      prev.map((m) => (m.id === modelId ? { ...m, enabled: !currentEnabled } : m))
    );

    try {
      await apiPost('/api/admin/models/toggle', { modelId, enabled: !currentEnabled });
    } catch (err: any) {
      setModels((prev) =>
        prev.map((m) => (m.id === modelId ? { ...m, enabled: currentEnabled } : m))
      );
      alert(err.message || 'Failed to toggle model');
    }
  };

  const groupedModels = models.reduce((acc: Record<string, any[]>, model) => {
    const key = model.providerDisplayName || model.provider;
    if (!acc[key]) acc[key] = [];
    acc[key].push(model);
    return acc;
  }, {});

  return (
    <AnimatePresence>
      {settingsOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'var(--bg-overlay)',
            zIndex: 100,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '24px',
          }}
          onClick={() => setSettingsOpen(false)}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: 'spring', stiffness: 400, damping: 30 }}
            onClick={(e) => e.stopPropagation()}
            style={{
              background: 'var(--bg-primary)',
              borderRadius: 'var(--radius-lg)',
              border: '1px solid var(--border-primary)',
              boxShadow: 'var(--shadow-lg)',
              width: '100%',
              maxWidth: '640px',
              maxHeight: '80vh',
              overflow: 'hidden',
              display: 'flex',
              flexDirection: 'column',
            }}
          >
            {/* Header */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '20px 24px',
                borderBottom: '1px solid var(--border-primary)',
              }}
            >
              <h2
                style={{
                  fontSize: '1.125rem',
                  fontWeight: 600,
                  color: 'var(--text-primary)',
                }}
              >
                Settings
              </h2>
              <button
                onClick={() => setSettingsOpen(false)}
                style={{
                  padding: '6px',
                  borderRadius: 'var(--radius-sm)',
                  border: 'none',
                  background: 'transparent',
                  color: 'var(--text-tertiary)',
                  cursor: 'pointer',
                  display: 'flex',
                }}
              >
                <X size={18} />
              </button>
            </div>

            <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
              {/* Tab navigation */}
              <div
                style={{
                  width: '180px',
                  borderRight: '1px solid var(--border-primary)',
                  padding: '12px 8px',
                  overflowY: 'auto',
                  flexShrink: 0,
                }}
              >
                {tabs.map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '10px',
                      width: '100%',
                      padding: '10px 12px',
                      borderRadius: 'var(--radius-sm)',
                      border: 'none',
                      background:
                        activeTab === tab.id
                          ? 'var(--bg-hover)'
                          : 'transparent',
                      color:
                        activeTab === tab.id
                          ? 'var(--text-primary)'
                          : 'var(--text-secondary)',
                      cursor: 'pointer',
                      fontSize: '0.875rem',
                      textAlign: 'left',
                      transition: 'all var(--transition-fast)',
                      fontWeight: activeTab === tab.id ? 500 : 400,
                    }}
                  >
                    {tab.icon}
                    {tab.label}
                  </button>
                ))}
              </div>

              {/* Tab content */}
              <div
                style={{
                  flex: 1,
                  padding: '24px',
                  overflowY: 'auto',
                }}
              >
                {activeTab === 'general' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                    <SettingRow
                      label="Send on Enter"
                      description="Press Enter to send, Shift+Enter for new line"
                    >
                      <ToggleSwitch defaultChecked />
                    </SettingRow>
                    <SettingRow
                      label="Stream responses"
                      description="Show responses as they're generated"
                    >
                      <ToggleSwitch defaultChecked />
                    </SettingRow>
                    <SettingRow
                      label="Notifications"
                      description="Get notified when a response completes"
                    >
                      <ToggleSwitch />
                    </SettingRow>
                  </div>
                )}

                {activeTab === 'appearance' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                    <div>
                      <label
                        style={{
                          fontSize: '0.875rem',
                          fontWeight: 500,
                          color: 'var(--text-primary)',
                          marginBottom: '12px',
                          display: 'block',
                        }}
                      >
                        Theme
                      </label>
                      <div style={{ display: 'flex', gap: '12px' }}>
                        {[
                          { value: 'light' as Theme, icon: <Sun size={20} />, label: 'Light' },
                          { value: 'dark' as Theme, icon: <Moon size={20} />, label: 'Dark' },
                          { value: 'system' as Theme, icon: <Monitor size={20} />, label: 'System' },
                        ].map((t) => (
                          <button
                            key={t.value}
                            onClick={() => setTheme(t.value)}
                            style={{
                              flex: 1,
                              padding: '16px',
                              borderRadius: 'var(--radius-md)',
                              border:
                                theme === t.value
                                  ? '2px solid var(--brand-primary)'
                                  : '1px solid var(--border-primary)',
                              background:
                                theme === t.value
                                  ? 'rgba(99, 102, 241, 0.05)'
                                  : 'var(--bg-secondary)',
                              cursor: 'pointer',
                              display: 'flex',
                              flexDirection: 'column',
                              alignItems: 'center',
                              gap: '8px',
                              color:
                                theme === t.value
                                  ? 'var(--brand-primary)'
                                  : 'var(--text-secondary)',
                              transition: 'all var(--transition-fast)',
                            }}
                          >
                            {t.icon}
                            <span style={{ fontSize: '0.8125rem', fontWeight: 500 }}>
                              {t.label}
                            </span>
                          </button>
                        ))}
                      </div>
                    </div>

                    <SettingRow label="Font size" description="Adjust the chat text size">
                      <select
                        defaultValue="14"
                        style={{
                          padding: '6px 12px',
                          borderRadius: 'var(--radius-sm)',
                          border: '1px solid var(--border-primary)',
                          background: 'var(--bg-input)',
                          color: 'var(--text-primary)',
                          fontSize: '0.8125rem',
                          outline: 'none',
                        }}
                      >
                        <option value="12">Small</option>
                        <option value="14">Medium</option>
                        <option value="16">Large</option>
                        <option value="18">Extra Large</option>
                      </select>
                    </SettingRow>
                  </div>
                )}

                {activeTab === 'shortcuts' && (
                  <div>
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                      <thead>
                        <tr>
                          <th
                            style={{
                              textAlign: 'left',
                              padding: '8px 0',
                              borderBottom: '1px solid var(--border-primary)',
                              fontSize: '0.8125rem',
                              color: 'var(--text-tertiary)',
                              fontWeight: 500,
                            }}
                          >
                            Action
                          </th>
                          <th
                            style={{
                              textAlign: 'right',
                              padding: '8px 0',
                              borderBottom: '1px solid var(--border-primary)',
                              fontSize: '0.8125rem',
                              color: 'var(--text-tertiary)',
                              fontWeight: 500,
                            }}
                          >
                            Shortcut
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {shortcuts.map((s) => (
                          <tr key={s.action}>
                            <td
                              style={{
                                padding: '12px 0',
                                borderBottom: '1px solid var(--border-primary)',
                                fontSize: '0.875rem',
                                color: 'var(--text-primary)',
                              }}
                            >
                              {s.action}
                            </td>
                            <td
                              style={{
                                padding: '12px 0',
                                borderBottom: '1px solid var(--border-primary)',
                                textAlign: 'right',
                              }}
                            >
                              <div
                                style={{
                                  display: 'flex',
                                  gap: '4px',
                                  justifyContent: 'flex-end',
                                }}
                              >
                                {s.keys.map((key) => (
                                  <kbd
                                    key={key}
                                    style={{
                                      padding: '3px 8px',
                                      borderRadius: '4px',
                                      border: '1px solid var(--border-secondary)',
                                      background: 'var(--bg-tertiary)',
                                      fontSize: '0.75rem',
                                      fontFamily: 'inherit',
                                      color: 'var(--text-secondary)',
                                      boxShadow: '0 1px 0 var(--border-primary)',
                                    }}
                                  >
                                    {key}
                                  </kbd>
                                ))}
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                {activeTab === 'account' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                    {user ? (
                      <>
                        <div
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '16px',
                            padding: '16px',
                            borderRadius: 'var(--radius-md)',
                            background: 'var(--bg-secondary)',
                            border: '1px solid var(--border-primary)',
                          }}
                        >
                          <div
                            style={{
                              width: 48,
                              height: 48,
                              borderRadius: 'var(--radius-full)',
                              background:
                                'linear-gradient(135deg, var(--brand-primary), var(--brand-secondary))',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              color: 'white',
                              fontSize: '1.25rem',
                              fontWeight: 600,
                            }}
                          >
                            {user.name.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <div
                              style={{
                                fontSize: '1rem',
                                fontWeight: 600,
                                color: 'var(--text-primary)',
                              }}
                            >
                              {user.name}
                            </div>
                            <div
                              style={{
                                fontSize: '0.8125rem',
                                color: 'var(--text-tertiary)',
                              }}
                            >
                              {user.email}
                            </div>
                          </div>
                        </div>
                        <SettingRow
                          label="Delete all conversations"
                          description="This action cannot be undone"
                        >
                          <button
                            style={{
                              padding: '6px 16px',
                              borderRadius: 'var(--radius-sm)',
                              border: '1px solid #ef4444',
                              background: 'transparent',
                              color: '#ef4444',
                              cursor: 'pointer',
                              fontSize: '0.8125rem',
                            }}
                          >
                            Delete All
                          </button>
                        </SettingRow>
                      </>
                    ) : (
                      <div
                        style={{
                          textAlign: 'center',
                          padding: '2rem',
                          color: 'var(--text-tertiary)',
                        }}
                      >
                        Not logged in. Log in to sync your conversations.
                      </div>
                    )}
                  </div>
                )}

                {activeTab === 'about' && (
                  <div
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: '16px',
                      padding: '2rem',
                      textAlign: 'center',
                    }}
                  >
                    <div
                      style={{
                        width: 56,
                        height: 56,
                        borderRadius: 'var(--radius-lg)',
                        background:
                          'linear-gradient(135deg, #6366f1, #8b5cf6, #06b6d4)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        boxShadow: 'var(--shadow-glow)',
                      }}
                    >
                      <Sparkles size={28} color="white" />
                    </div>
                    <div>
                      <h3
                        style={{
                          fontSize: '1.125rem',
                          fontWeight: 600,
                          color: 'var(--text-primary)',
                        }}
                      >
                        AUI Chat
                      </h3>
                      <p
                        style={{
                          fontSize: '0.8125rem',
                          color: 'var(--text-tertiary)',
                          marginTop: '4px',
                        }}
                      >
                        Version 1.0.0
                      </p>
                    </div>
                    <p
                      style={{
                        fontSize: '0.875rem',
                        color: 'var(--text-secondary)',
                        maxWidth: '20rem',
                        lineHeight: 1.6,
                      }}
                    >
                      An intelligent AI chat platform with multi-provider
                      support, automatic model routing, and seamless fallbacks.
                    </p>
                  </div>
                )}

                {activeTab === 'admin' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                    <div style={{ borderBottom: '1px solid var(--border-primary)', paddingBottom: '12px' }}>
                      <h3 style={{ fontSize: '0.9375rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                        Model Toggles
                      </h3>
                      <p style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', marginTop: '2px' }}>
                        Enable or disable AI models globally in the application selection dropdown and routing list.
                      </p>
                    </div>

                    {loadingModels && (
                      <div style={{ padding: '20px', textAlign: 'center', color: 'var(--text-secondary)' }}>
                        Loading models...
                      </div>
                    )}

                    {errorModels && (
                      <div style={{ padding: '12px', background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', borderRadius: 'var(--radius-sm)', fontSize: '0.8125rem' }}>
                        {errorModels}
                      </div>
                    )}

                    {!loadingModels && !errorModels && Object.entries(groupedModels).map(([providerName, providerModels]) => (
                      <div key={providerName} style={{ display: 'flex', flexDirection: 'column', gap: '12px', paddingBottom: '8px' }}>
                        <h4 style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--brand-primary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                          {providerName}
                        </h4>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', background: 'var(--bg-secondary)', padding: '12px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-primary)' }}>
                          {(providerModels as any[]).map((model) => (
                            <div key={model.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                              <div>
                                <div style={{ fontSize: '0.875rem', fontWeight: 500, color: 'var(--text-primary)' }}>
                                  {model.name}
                                </div>
                                <div style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', fontFamily: 'monospace' }}>
                                  {model.id}
                                </div>
                              </div>
                              <button
                                onClick={() => handleToggleModel(model.id, model.enabled)}
                                style={{
                                  position: 'relative',
                                  width: 44,
                                  height: 24,
                                  borderRadius: 'var(--radius-full)',
                                  border: 'none',
                                  background: model.enabled ? 'var(--brand-primary)' : 'var(--bg-hover)',
                                  cursor: 'pointer',
                                  transition: 'background var(--transition-fast)',
                                  flexShrink: 0,
                                }}
                              >
                                <motion.div
                                  animate={{ x: model.enabled ? 20 : 0 }}
                                  transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                                  style={{
                                    position: 'absolute',
                                    top: 2,
                                    left: 2,
                                    width: 20,
                                    height: 20,
                                    borderRadius: 'var(--radius-full)',
                                    background: 'white',
                                    boxShadow: 'var(--shadow-sm)',
                                  }}
                                />
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function SettingRow({
  label,
  description,
  children,
}: {
  label: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '16px',
      }}
    >
      <div>
        <div
          style={{
            fontSize: '0.875rem',
            fontWeight: 500,
            color: 'var(--text-primary)',
          }}
        >
          {label}
        </div>
        {description && (
          <div
            style={{
              fontSize: '0.8125rem',
              color: 'var(--text-tertiary)',
              marginTop: '2px',
            }}
          >
            {description}
          </div>
        )}
      </div>
      {children}
    </div>
  );
}

function ToggleSwitch({ defaultChecked = false }: { defaultChecked?: boolean }) {
  const [checked, setChecked] = useState(defaultChecked);

  return (
    <button
      onClick={() => setChecked(!checked)}
      style={{
        position: 'relative',
        width: 44,
        height: 24,
        borderRadius: 'var(--radius-full)',
        border: 'none',
        background: checked ? 'var(--brand-primary)' : 'var(--bg-hover)',
        cursor: 'pointer',
        transition: 'background var(--transition-fast)',
        flexShrink: 0,
      }}
    >
      <motion.div
        animate={{ x: checked ? 20 : 0 }}
        transition={{ type: 'spring', stiffness: 500, damping: 30 }}
        style={{
          position: 'absolute',
          top: 2,
          left: 2,
          width: 20,
          height: 20,
          borderRadius: 'var(--radius-full)',
          background: 'white',
          boxShadow: 'var(--shadow-sm)',
        }}
      />
    </button>
  );
}
