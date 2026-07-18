'use client';

import React, { useState } from 'react';
import { Download, Trash2, ShieldAlert, ToggleLeft, ToggleRight } from 'lucide-react';
import { apiGet, apiDelete } from '@/lib/api';

export default function PrivacyDashboard() {
  const [downloading, setDownloading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [analyticsOptOut, setAnalyticsOptOut] = useState(() => {
    if (typeof window === 'undefined') return false;
    return localStorage.getItem('aui_analytics_optout') === 'true';
  });

  const handleDownloadData = async () => {
    setDownloading(true);
    try {
      const token = localStorage.getItem('aui_token');
      const url = `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000'}/api/memory/export`;
      
      const res = await fetch(url, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });

      if (!res.ok) throw new Error('Export failed');
      const blob = await res.blob();
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = `aui-gdpr-export-${new Date().toISOString().split('T')[0]}.json`;
      a.click();
    } catch (err) {
      alert('Failed to export account data');
    } finally {
      setDownloading(false);
    }
  };

  const handleDeleteAllData = async () => {
    const confirm1 = window.confirm(
      'WARNING: This will permanently delete your AI memory profiles, conversation summaries, and custom templates. This cannot be undone. Proceed?',
    );
    if (!confirm1) return;

    const confirm2 = window.prompt(
      'Type "DELETE" to confirm permanent account data deletion:',
    );
    if (confirm2 !== 'DELETE') return;

    setDeleting(true);
    try {
      await apiDelete('/api/memory'); // deletes memories and profile
      alert('All AI memory and profile metadata cleared successfully.');
    } catch (err) {
      alert('Failed to delete data');
    } finally {
      setDeleting(false);
    }
  };

  const handleToggleAnalytics = () => {
    const newValue = !analyticsOptOut;
    setAnalyticsOptOut(newValue);
    localStorage.setItem('aui_analytics_optout', String(newValue));
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* GDPR Data Download */}
      <div
        style={{
          padding: '16px',
          borderRadius: 'var(--radius-md)',
          border: '1px solid var(--border-primary)',
          background: 'var(--bg-secondary)',
        }}
      >
        <div style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '4px' }}>
          Download Account Data (GDPR Export)
        </div>
        <div style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', marginBottom: '16px', lineHeight: 1.4 }}>
          Download a complete portable archive containing your conversation history, learned semantic memories, user profile metrics, and evaluations in JSON format.
        </div>
        <button
          onClick={handleDownloadData}
          disabled={downloading}
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
            gap: '6px',
          }}
        >
          <Download size={14} /> {downloading ? 'Exporting…' : 'Download JSON Archive'}
        </button>
      </div>

      {/* Analytics Opt-Out */}
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
            Restrict Telemetry &amp; Analytics
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>
            Disable sending performance metrics and response evaluation logs to backend storage.
          </div>
        </div>
        <button
          onClick={handleToggleAnalytics}
          style={{
            background: 'transparent',
            border: 'none',
            color: analyticsOptOut ? 'var(--brand-primary)' : 'var(--text-tertiary)',
            cursor: 'pointer',
            padding: 0,
            display: 'flex',
            alignItems: 'center',
          }}
        >
          {analyticsOptOut ? <ToggleRight size={38} /> : <ToggleLeft size={38} />}
        </button>
      </div>

      {/* Right to be Forgotten (Account Purge) */}
      <div
        style={{
          padding: '16px',
          borderRadius: 'var(--radius-md)',
          border: '1px solid rgba(239, 68, 68, 0.2)',
          background: 'rgba(239, 68, 68, 0.04)',
        }}
      >
        <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
          <ShieldAlert size={20} style={{ color: '#ef4444', flexShrink: 0, marginTop: '2px' }} />
          <div>
            <div style={{ fontSize: '0.875rem', fontWeight: 600, color: '#ef4444' }}>
              Purge Memory &amp; Profile (Forget Me)
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', margin: '4px 0 12px', lineHeight: 1.4 }}>
              Request immediate deletion of all learned memories, conversation summaries, and inferred style parameters. Your conversations will be kept unless deleted manually.
            </div>
            <button
              onClick={handleDeleteAllData}
              disabled={deleting}
              style={{
                padding: '8px 16px',
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
              <Trash2 size={14} /> Purge AI Profile Data
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
