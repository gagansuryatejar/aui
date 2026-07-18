'use client';

import React, { useEffect, useState } from 'react';
import {
  Shield,
  Smartphone,
  Key,
  ListTodo,
  AlertOctagon,
  Copy,
  Check,
  Globe,
  Trash2,
  Lock,
  RefreshCw,
  Plus,
} from 'lucide-react';
import { apiGet, apiPost, apiDelete } from '@/lib/api';

interface Session {
  id: string;
  device: string;
  ipAddress: string;
  country: string;
  lastActive: string;
}

interface AuditLog {
  id: string;
  action: string;
  status: string;
  ipAddress: string;
  details: string;
  createdAt: string;
}

interface ApiKey {
  id: string;
  name: string;
  scopes: string[];
  createdAt: string;
  expiresAt: string | null;
  lastUsed: string | null;
}

export default function SecurityDashboard() {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [apiKeys, setApiKeys] = useState<ApiKey[]>([]);
  const [loading, setLoading] = useState(true);
  const [newKeyName, setNewKeyName] = useState('');
  const [generatedKey, setGeneratedKey] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [locking, setLocking] = useState(false);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    setLoading(true);
    try {
      const [sessData, logsData, keysData] = await Promise.all([
        apiGet<Session[]>('/api/security/sessions'),
        apiGet<AuditLog[]>('/api/security/audit-logs'),
        apiGet<ApiKey[]>('/api/security/keys'),
      ]);
      setSessions(sessData);
      setAuditLogs(logsData);
      setApiKeys(keysData);
    } catch (err) {
      console.error('Failed to load security parameters:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleRevokeSession = async (id: string) => {
    try {
      await apiDelete(`/api/security/sessions/${id}`);
      setSessions((prev) => prev.filter((s) => s.id !== id));
    } catch (err) {
      alert('Failed to revoke session');
    }
  };

  const handleGenerateKey = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newKeyName.trim()) return;
    try {
      const res = await apiPost<{ apiKey: string } & ApiKey>('/api/security/keys/generate', {
        name: newKeyName,
        scopes: ['chat:write'],
        expiryDays: 30,
      });
      setGeneratedKey(res.apiKey);
      setNewKeyName('');
      loadDashboardData();
    } catch (err) {
      alert('Failed to generate API Key');
    }
  };

  const handleRevokeKey = async (id: string) => {
    try {
      await apiDelete(`/api/security/keys/${id}`);
      setApiKeys((prev) => prev.filter((k) => k.id !== id));
    } catch (err) {
      alert('Failed to revoke API key');
    }
  };

  const handleEmergencyLock = async () => {
    const confirm = window.confirm(
      'WARNING: This will instantly lock your account, terminate all active sessions, and block all API requests. You will need admin assistance to unlock. Do you want to proceed?',
    );
    if (!confirm) return;

    setLocking(true);
    try {
      await apiPost('/api/security/emergency/lock');
      alert('Account locked successfully. Logging out.');
      // Clear storage
      localStorage.removeItem('aui_token');
      window.location.reload();
    } catch (err) {
      alert('Failed to lock account');
      setLocking(false);
    }
  };

  const handleCopy = () => {
    if (!generatedKey) return;
    navigator.clipboard.writeText(generatedKey);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Calculate dynamic security score (out of 100)
  const calculateSecurityScore = () => {
    let score = 50; // baseline
    if (apiKeys.length > 0) score += 10;
    if (sessions.length === 1) score += 15; // single active device is secure
    const mfaLog = auditLogs.find((l) => l.action.includes('mfa_enabled'));
    if (mfaLog) score += 25; // MFA is highly rated
    return Math.min(100, score);
  };

  if (loading) {
    return (
      <div style={{ color: 'var(--text-tertiary)', textAlign: 'center', padding: '2rem' }}>
        Loading security policies…
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Top Indicators */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
          gap: '16px',
        }}
      >
        {/* Score */}
        <div
          style={{
            padding: '16px',
            borderRadius: 'var(--radius-md)',
            border: '1px solid var(--border-primary)',
            background: 'var(--bg-secondary)',
            display: 'flex',
            alignItems: 'center',
            gap: '16px',
          }}
        >
          <div
            style={{
              width: 42,
              height: 42,
              borderRadius: '50%',
              background: 'rgba(34, 197, 94, 0.1)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#22c55e',
            }}
          >
            <Shield size={20} />
          </div>
          <div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>Security Score</div>
            <div style={{ fontSize: '1.25rem', fontWeight: 600, color: 'var(--text-primary)' }}>
              {calculateSecurityScore()}/100
            </div>
          </div>
        </div>

        {/* Sessions */}
        <div
          style={{
            padding: '16px',
            borderRadius: 'var(--radius-md)',
            border: '1px solid var(--border-primary)',
            background: 'var(--bg-secondary)',
            display: 'flex',
            alignItems: 'center',
            gap: '16px',
          }}
        >
          <div
            style={{
              width: 42,
              height: 42,
              borderRadius: '50%',
              background: 'rgba(99, 102, 241, 0.1)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--brand-primary)',
            }}
          >
            <Smartphone size={20} />
          </div>
          <div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>Active Devices</div>
            <div style={{ fontSize: '1.25rem', fontWeight: 600, color: 'var(--text-primary)' }}>
              {sessions.length} Session{sessions.length === 1 ? '' : 's'}
            </div>
          </div>
        </div>
      </div>

      {/* Active Sessions */}
      <div>
        <div style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '12px' }}>
          Active Sessions
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {sessions.map((s) => (
            <div
              key={s.id}
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
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <Globe size={18} style={{ color: 'var(--text-tertiary)' }} />
                <div>
                  <div style={{ fontSize: '0.875rem', fontWeight: 500, color: 'var(--text-primary)' }}>
                    {s.device}
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>
                    {s.ipAddress} · {s.country}
                  </div>
                </div>
              </div>
              <button
                onClick={() => handleRevokeSession(s.id)}
                style={{
                  padding: '6px 12px',
                  borderRadius: 'var(--radius-sm)',
                  border: '1px solid var(--border-primary)',
                  background: 'transparent',
                  color: '#ef4444',
                  fontSize: '0.75rem',
                  cursor: 'pointer',
                }}
              >
                Revoke
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Programmatic Keys */}
      <div>
        <div style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '12px' }}>
          Programmatic Developer API Keys
        </div>
        <form onSubmit={handleGenerateKey} style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
          <input
            type="text"
            placeholder="Key name (e.g. My Workspace)"
            value={newKeyName}
            onChange={(e) => setNewKeyName(e.target.value)}
            style={{
              flex: 1,
              padding: '8px 12px',
              borderRadius: 'var(--radius-sm)',
              border: '1px solid var(--border-primary)',
              background: 'var(--bg-input)',
              color: 'var(--text-primary)',
              fontSize: '0.8125rem',
              outline: 'none',
            }}
          />
          <button
            type="submit"
            style={{
              padding: '8px 16px',
              borderRadius: 'var(--radius-sm)',
              border: 'none',
              background: 'var(--brand-primary)',
              color: 'white',
              fontSize: '0.8125rem',
              fontWeight: 500,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
            }}
          >
            <Plus size={14} /> Generate
          </button>
        </form>

        {generatedKey && (
          <div
            style={{
              padding: '12px',
              borderRadius: 'var(--radius-sm)',
              background: 'rgba(34, 197, 94, 0.08)',
              border: '1px solid rgba(34, 197, 94, 0.2)',
              marginBottom: '16px',
            }}
          >
            <div style={{ fontSize: '0.75rem', color: '#22c55e', fontWeight: 600, marginBottom: '6px' }}>
              Key generated successfully! Copy it now (it won&apos;t be shown again):
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <code style={{ flex: 1, background: 'var(--bg-secondary)', padding: '6px 8px', borderRadius: '4px', fontSize: '0.8125rem', color: 'var(--text-primary)', overflowX: 'auto' }}>
                {generatedKey}
              </code>
              <button
                onClick={handleCopy}
                style={{
                  padding: '6px',
                  borderRadius: '4px',
                  background: 'var(--bg-secondary)',
                  border: '1px solid var(--border-primary)',
                  color: copied ? '#22c55e' : 'var(--text-secondary)',
                  cursor: 'pointer',
                }}
              >
                {copied ? <Check size={14} /> : <Copy size={14} />}
              </button>
            </div>
          </div>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {apiKeys.length === 0 ? (
            <div style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', fontStyle: 'italic' }}>
              No API keys generated yet.
            </div>
          ) : (
            apiKeys.map((key) => (
              <div
                key={key.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '10px 14px',
                  borderRadius: 'var(--radius-md)',
                  background: 'var(--bg-secondary)',
                  border: '1px solid var(--border-primary)',
                }}
              >
                <div>
                  <div style={{ fontSize: '0.8125rem', fontWeight: 500, color: 'var(--text-primary)' }}>
                    {key.name}
                  </div>
                  <div style={{ fontSize: '0.6875rem', color: 'var(--text-tertiary)', display: 'flex', gap: '8px' }}>
                    <span>Created: {new Date(key.createdAt).toLocaleDateString()}</span>
                    <span>·</span>
                    <span>Scope: {key.scopes.join(', ')}</span>
                  </div>
                </div>
                <button
                  onClick={() => handleRevokeKey(key.id)}
                  style={{
                    padding: '4px',
                    background: 'transparent',
                    border: 'none',
                    color: 'var(--text-tertiary)',
                    cursor: 'pointer',
                  }}
                  title="Revoke key"
                >
                  <Trash2 size={14} style={{ color: '#ef4444' }} />
                </button>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Emergency Lock */}
      <div
        style={{
          marginTop: '8px',
          padding: '16px',
          borderRadius: 'var(--radius-md)',
          border: '1px solid rgba(239, 68, 68, 0.2)',
          background: 'rgba(239, 68, 68, 0.04)',
        }}
      >
        <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
          <AlertOctagon size={20} style={{ color: '#ef4444', flexShrink: 0, marginTop: '2px' }} />
          <div>
            <div style={{ fontSize: '0.875rem', fontWeight: 600, color: '#ef4444' }}>
              Emergency Account Lockout
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', margin: '4px 0 12px' }}>
              If you suspect session hijacking, click below to immediately log out all devices and freeze your account.
            </div>
            <button
              onClick={handleEmergencyLock}
              disabled={locking}
              style={{
                padding: '6px 14px',
                borderRadius: 'var(--radius-sm)',
                border: 'none',
                background: '#ef4444',
                color: 'white',
                fontSize: '0.8125rem',
                fontWeight: 500,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
              }}
            >
              <Lock size={14} /> Lock Account Instantly
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
