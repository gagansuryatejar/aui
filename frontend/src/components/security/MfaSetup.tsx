'use client';

import React, { useState } from 'react';
import { Shield, Check, Copy, Download, QrCode } from 'lucide-react';
import { apiPost } from '@/lib/api';

export default function MfaSetup({ onCompleted }: { onCompleted: () => void }) {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [setupData, setSetupData] = useState<{ secret: string; otpauthUri: string } | null>(null);
  const [code, setCode] = useState('');
  const [backupCodes, setBackupCodes] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copiedSecret, setCopiedSecret] = useState(false);

  const startSetup = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await apiPost<{ secret: string; otpauthUri: string }>('/api/security/mfa/setup');
      setSetupData(res);
      setStep(2);
    } catch (err: any) {
      setError(err.message || 'Failed to start MFA setup');
    } finally {
      setLoading(false);
    }
  };

  const verifySetup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!code) return;
    setLoading(true);
    setError(null);
    try {
      const res = await apiPost<{ backupCodes: string[] }>('/api/security/mfa/verify', { code });
      setBackupCodes(res.backupCodes);
      setStep(3);
    } catch (err: any) {
      setError(err.message || 'Invalid verification code');
    } finally {
      setLoading(false);
    }
  };

  const handleCopySecret = () => {
    if (!setupData) return;
    navigator.clipboard.writeText(setupData.secret);
    setCopiedSecret(true);
    setTimeout(() => setCopiedSecret(false), 2000);
  };

  const handleDownloadBackupCodes = () => {
    const text = `AUI MFA Recovery Backup Codes\nGenerated at: ${new Date().toLocaleString()}\n\n` + backupCodes.join('\n');
    const blob = new Blob([text], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'aui-backup-codes.txt';
    a.click();
  };

  return (
    <div style={{ padding: '12px 0' }}>
      {step === 1 && (
        <div style={{ textAlign: 'center', padding: '16px' }}>
          <div style={{ display: 'inline-flex', padding: '12px', borderRadius: '50%', background: 'rgba(99, 102, 241, 0.1)', color: 'var(--brand-primary)', marginBottom: '16px' }}>
            <Shield size={32} />
          </div>
          <div style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '8px' }}>
            Enable Multi-Factor Authentication
          </div>
          <div style={{ fontSize: '0.8125rem', color: 'var(--text-tertiary)', marginBottom: '20px', lineHeight: 1.5 }}>
            Secure your user account with standard TOTP (Time-based One-time Passwords). You will need Google Authenticator, Authy, or Microsoft Authenticator.
          </div>
          <button
            onClick={startSetup}
            disabled={loading}
            style={{
              padding: '10px 24px',
              borderRadius: 'var(--radius-sm)',
              border: 'none',
              background: 'var(--brand-primary)',
              color: 'white',
              fontSize: '0.875rem',
              fontWeight: 500,
              cursor: 'pointer',
            }}
          >
            {loading ? 'Starting Setup…' : 'Start MFA Setup'}
          </button>
        </div>
      )}

      {step === 2 && setupData && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
            1. Enter this secret key manually in your authenticator app, or scan the URI:
          </div>

          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '10px 14px',
              borderRadius: 'var(--radius-sm)',
              background: 'var(--bg-secondary)',
              border: '1px solid var(--border-primary)',
            }}
          >
            <code style={{ fontFamily: 'monospace', fontSize: '0.9375rem', fontWeight: 600, color: 'var(--text-primary)', letterSpacing: '0.05em' }}>
              {setupData.secret}
            </code>
            <button
              onClick={handleCopySecret}
              style={{
                padding: '6px',
                borderRadius: '4px',
                background: 'var(--bg-primary)',
                border: '1px solid var(--border-primary)',
                color: copiedSecret ? '#22c55e' : 'var(--text-secondary)',
                cursor: 'pointer',
              }}
            >
              {copiedSecret ? <Check size={14} /> : <Copy size={14} />}
            </button>
          </div>

          <div style={{ textAlign: 'center', padding: '12px', background: 'var(--bg-secondary)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-primary)' }}>
            <div style={{ color: 'var(--brand-primary)', marginBottom: '8px', display: 'flex', justifyContent: 'center' }}>
              <QrCode size={64} />
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>
              Scan setup using otpauth scanner
            </div>
          </div>

          <form onSubmit={verifySetup} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
              2. Enter the 6-digit code shown in your authenticator app:
            </div>
            <input
              type="text"
              placeholder="000000"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              maxLength={6}
              style={{
                padding: '10px',
                borderRadius: 'var(--radius-sm)',
                border: '1px solid var(--border-primary)',
                background: 'var(--bg-input)',
                color: 'var(--text-primary)',
                fontSize: '1rem',
                fontWeight: 600,
                textAlign: 'center',
                letterSpacing: '0.2em',
                outline: 'none',
              }}
            />
            {error && (
              <div style={{ fontSize: '0.75rem', color: '#ef4444', textAlign: 'center' }}>
                {error}
              </div>
            )}
            <button
              type="submit"
              disabled={loading}
              style={{
                padding: '10px',
                borderRadius: 'var(--radius-sm)',
                border: 'none',
                background: 'var(--brand-primary)',
                color: 'white',
                fontSize: '0.875rem',
                fontWeight: 500,
                cursor: 'pointer',
              }}
            >
              {loading ? 'Verifying…' : 'Verify & Enable'}
            </button>
          </form>
        </div>
      )}

      {step === 3 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', textAlign: 'center' }}>
          <div style={{ display: 'inline-flex', alignSelf: 'center', padding: '12px', borderRadius: '50%', background: 'rgba(34, 197, 94, 0.1)', color: '#22c55e', marginBottom: '8px' }}>
            <Check size={32} />
          </div>
          <div style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text-primary)' }}>
            MFA Successfully Enabled!
          </div>
          <div style={{ fontSize: '0.8125rem', color: 'var(--text-tertiary)', lineHeight: 1.4 }}>
            Download your recovery backup codes. If you lose your authenticator device, you can use these codes to log in. Each code can be used once.
          </div>

          <div
            style={{
              padding: '12px',
              borderRadius: 'var(--radius-md)',
              background: 'var(--bg-secondary)',
              border: '1px solid var(--border-primary)',
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: '8px',
              fontFamily: 'monospace',
              fontSize: '0.8125rem',
              color: 'var(--text-primary)',
            }}
          >
            {backupCodes.map((code) => (
              <div key={code}>{code}</div>
            ))}
          </div>

          <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
            <button
              onClick={handleDownloadBackupCodes}
              style={{
                flex: 1,
                padding: '10px',
                borderRadius: 'var(--radius-sm)',
                border: '1px solid var(--border-primary)',
                background: 'transparent',
                color: 'var(--text-primary)',
                fontSize: '0.8125rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px',
              }}
            >
              <Download size={14} /> Download Codes
            </button>
            <button
              onClick={onCompleted}
              style={{
                flex: 1,
                padding: '10px',
                borderRadius: 'var(--radius-sm)',
                border: 'none',
                background: 'var(--brand-primary)',
                color: 'white',
                fontSize: '0.8125rem',
                fontWeight: 500,
                cursor: 'pointer',
              }}
            >
              Done
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
