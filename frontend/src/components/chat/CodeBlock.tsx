'use client';

import React, { useState, useCallback } from 'react';
import { Check, Copy, Download } from 'lucide-react';

interface CodeBlockProps {
  children: React.ReactNode;
  codeText?: string;
  language?: string;
}

export default function CodeBlock({ children, codeText, language }: CodeBlockProps) {
  const [copied, setCopied] = useState(false);

  const getRawText = useCallback((): string => {
    if (codeText !== undefined) return codeText;
    if (typeof children === 'string') return children;
    // Fallback text extractor
    const extract = (node: React.ReactNode): string => {
      if (!node) return '';
      if (typeof node === 'string' || typeof node === 'number') return String(node);
      if (Array.isArray(node)) return node.map(extract).join('');
      if (React.isValidElement(node) && node.props && (node.props as any).children) {
        return extract((node.props as any).children);
      }
      return '';
    };
    return extract(children);
  }, [codeText, children]);

  const handleCopy = useCallback(async () => {
    const raw = getRawText();
    try {
      await navigator.clipboard.writeText(raw);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      const el = document.createElement('textarea');
      el.value = raw;
      document.body.appendChild(el);
      el.select();
      document.execCommand('copy');
      document.body.removeChild(el);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }, [getRawText]);

  const handleDownload = useCallback(() => {
    const raw = getRawText();
    const ext = getExtension(language);
    const blob = new Blob([raw], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `code.${ext}`;
    a.click();
    URL.revokeObjectURL(url);
  }, [getRawText, language]);

  return (
    <div
      style={{
        position: 'relative',
        borderRadius: 'var(--radius-md)',
        overflow: 'hidden',
        margin: '0.75rem 0',
        border: '1px solid var(--border-primary)',
      }}
    >
      {/* Header bar */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '8px 16px',
          background: 'var(--bg-tertiary)',
          borderBottom: '1px solid var(--border-primary)',
          fontSize: '0.75rem',
          color: 'var(--text-tertiary)',
          fontFamily: 'monospace',
        }}
      >
        <span style={{ textTransform: 'lowercase' }}>{language || 'text'}</span>
        <div style={{ display: 'flex', gap: '4px' }}>
          <ToolbarBtn
            icon={copied ? <Check size={13} /> : <Copy size={13} />}
            label={copied ? 'Copied!' : 'Copy'}
            onClick={handleCopy}
            active={copied}
          />
          <ToolbarBtn
            icon={<Download size={13} />}
            label="Download"
            onClick={handleDownload}
          />
        </div>
      </div>

      {/* Code content */}
      <pre style={{ margin: 0, border: 'none', borderRadius: 0 }}>
        <code className={language ? `hljs language-${language}` : 'hljs'}>
          {children}
        </code>
      </pre>
    </div>
  );
}

function ToolbarBtn({
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
        borderRadius: '4px',
        border: 'none',
        background: active ? 'rgba(34,197,94,0.15)' : 'transparent',
        color: active ? '#22c55e' : 'var(--text-tertiary)',
        cursor: 'pointer',
        fontSize: '0.75rem',
        transition: 'all var(--transition-fast)',
      }}
      onMouseEnter={(e) => {
        if (!active) e.currentTarget.style.background = 'var(--bg-hover)';
      }}
      onMouseLeave={(e) => {
        if (!active) e.currentTarget.style.background = 'transparent';
      }}
    >
      {icon}
      <span>{label}</span>
    </button>
  );
}

function getExtension(lang?: string): string {
  const map: Record<string, string> = {
    javascript: 'js',
    typescript: 'ts',
    python: 'py',
    rust: 'rs',
    java: 'java',
    cpp: 'cpp',
    c: 'c',
    go: 'go',
    ruby: 'rb',
    php: 'php',
    swift: 'swift',
    kotlin: 'kt',
    html: 'html',
    css: 'css',
    json: 'json',
    yaml: 'yaml',
    sql: 'sql',
    bash: 'sh',
    shell: 'sh',
    markdown: 'md',
  };
  return map[lang || ''] || 'txt';
}
