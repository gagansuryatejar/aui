'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { RefreshCw, Code2, Terminal, Play, ExternalLink, AlertTriangle, X, Maximize2, Minimize2 } from 'lucide-react';
import { useUIStore } from '@/store/ui-store';
import { useChatStore } from '@/store/chat-store';

interface LogEntry {
  type: 'log' | 'warn' | 'error' | 'runtime_error';
  content: string;
  timestamp: number;
}

interface WebCode {
  html: string;
  css: string;
  js: string;
  hasCode: boolean;
}

export function parseWebCode(messages: any[]): WebCode {
  // Find the last assistant message that contains code blocks
  const lastAssistantMsg = [...messages]
    .reverse()
    .find((m) => m.role === 'assistant' && m.content.includes('```'));

  if (!lastAssistantMsg) {
    return { html: '', css: '', js: '', hasCode: false };
  }

  const content = lastAssistantMsg.content;
  const codeBlockRegex = /```(\w*)\n([\s\S]*?)```/g;
  let match;
  let html = '';
  let css = '';
  let js = '';
  let hasCode = false;

  while ((match = codeBlockRegex.exec(content)) !== null) {
    const lang = match[1].toLowerCase();
    const code = match[2];

    if (lang === 'html') {
      html = code;
      hasCode = true;
    } else if (lang === 'css') {
      css = code;
      hasCode = true;
    } else if (lang === 'javascript' || lang === 'js') {
      js = code;
      hasCode = true;
    }
  }

  // If there's an HTML block or CSS/JS blocks, let's treat it as renderable
  return { html, css, js, hasCode };
}

export function getCombinedHtml(webCode: WebCode): string {
  let doc = webCode.html;
  if (!doc) {
    // Construct page if html block is missing but we have JS/CSS
    if (webCode.css || webCode.js) {
      doc = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>AUI Interactive Sandbox</title>
  <style>
    body { font-family: system-ui, -apple-system, sans-serif; padding: 24px; background-color: #0b0f19; color: #f3f4f6; }
  </style>
</head>
<body>
  <div id="app"></div>
</body>
</html>`;
    } else {
      return '';
    }
  }

  // Inject CSS
  if (webCode.css) {
    if (doc.includes('</head>')) {
      doc = doc.replace('</head>', `<style>${webCode.css}</style></head>`);
    } else {
      doc = `<style>${webCode.css}</style>` + doc;
    }
  }

  // Inject JS & intercept console/errors
  const errorCatcher = `<script>
    (function() {
      // Capture uncaught global errors
      window.addEventListener('error', function(e) {
        window.parent.postMessage({
          type: 'iframe_error',
          message: e.message,
          filename: e.filename,
          lineno: e.lineno
        }, '*');
      });

      // Capture console APIs
      const _log = console.log;
      const _warn = console.warn;
      const _error = console.error;

      console.log = function(...args) {
        _log.apply(console, args);
        window.parent.postMessage({ type: 'iframe_log', log: args.join(' ') }, '*');
      };
      console.warn = function(...args) {
        _warn.apply(console, args);
        window.parent.postMessage({ type: 'iframe_log_warn', log: args.join(' ') }, '*');
      };
      console.error = function(...args) {
        _error.apply(console, args);
        window.parent.postMessage({ type: 'iframe_log_error', log: args.join(' ') }, '*');
      };
    })();
  </script>`;

  // Inject logger script at the absolute beginning of head
  if (doc.includes('<head>')) {
    doc = doc.replace('<head>', `<head>${errorCatcher}`);
  } else if (doc.includes('<html>')) {
    doc = doc.replace('<html>', `<html><head>${errorCatcher}</head>`);
  } else {
    doc = errorCatcher + doc;
  }

  // Inject user custom JS script if it exists
  if (webCode.js) {
    const userScript = `<script>
      try {
        ${webCode.js}
      } catch (e) {
        window.parent.postMessage({ type: 'iframe_error', message: e.message }, '*');
      }
    </script>`;
    if (doc.includes('</body>')) {
      doc = doc.replace('</body>', `${userScript}</body>`);
    } else {
      doc = doc + userScript;
    }
  }

  return doc;
}

export default function SandboxPreview({ onClose }: { onClose: () => void }) {
  const { isMobile } = useUIStore();
  const { messages } = useChatStore();
  const [activeTab, setActiveTab] = useState<'preview' | 'code' | 'console'>('preview');
  const [codeTab, setCodeTab] = useState<'html' | 'css' | 'js'>('html');
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [iframeKey, setIframeKey] = useState(0); // For reloading the iframe
  const iframeRef = useRef<HTMLIFrameElement>(null);

  const webCode = parseWebCode(messages);
  const combinedHtml = getCombinedHtml(webCode);

  // Clear logs when code changes
  useEffect(() => {
    setLogs([]);
  }, [combinedHtml]);

  // Handle messages from the iframe sandbox
  useEffect(() => {
    const handleIframeMessage = (event: MessageEvent) => {
      const data = event.data;
      if (!data || typeof data !== 'object') return;

      if (data.type === 'iframe_log') {
        setLogs((prev) => [...prev, { type: 'log', content: data.log, timestamp: Date.now() }]);
      } else if (data.type === 'iframe_log_warn') {
        setLogs((prev) => [...prev, { type: 'warn', content: data.log, timestamp: Date.now() }]);
      } else if (data.type === 'iframe_log_error') {
        setLogs((prev) => [...prev, { type: 'error', content: data.log, timestamp: Date.now() }]);
      } else if (data.type === 'iframe_error') {
        const errorMsg = data.lineno 
          ? `Runtime Error: ${data.message} (Line ${data.lineno})`
          : `Runtime Error: ${data.message}`;
        setLogs((prev) => [...prev, { type: 'runtime_error', content: errorMsg, timestamp: Date.now() }]);
        // Switch to console tab automatically when error occurs for clear visibility
        setActiveTab('console');
      }
    };

    window.addEventListener('message', handleIframeMessage);
    return () => window.removeEventListener('message', handleIframeMessage);
  }, []);

  const handleRefresh = useCallback(() => {
    setLogs([]);
    setIframeKey((k) => k + 1);
  }, []);

  const handleOpenNewWindow = useCallback(() => {
    const newWindow = window.open();
    if (newWindow) {
      newWindow.document.open();
      newWindow.document.write(combinedHtml);
      newWindow.document.close();
    }
  }, [combinedHtml]);

  const hasErrors = logs.some((l) => l.type === 'error' || l.type === 'runtime_error');

  return (
    <div
      style={{
        width: isMobile ? '100%' : '50%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        borderLeft: '1px solid var(--border-primary)',
        background: '#0b0f19',
        overflow: 'hidden',
        zIndex: 25,
      }}
    >
      {/* Top Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 16px',
          height: 'var(--header-height)',
          background: '#0f172a',
          borderBottom: '1px solid var(--border-primary)',
          flexShrink: 0,
        }}
      >
        {/* Tabs */}
        <div style={{ display: 'flex', gap: '4px' }}>
          <TabButton
            active={activeTab === 'preview'}
            onClick={() => setActiveTab('preview')}
            icon={<Play size={14} />}
            label="Preview"
          />
          <TabButton
            active={activeTab === 'code'}
            onClick={() => setActiveTab('code')}
            icon={<Code2 size={14} />}
            label="Code"
          />
          <TabButton
            active={activeTab === 'console'}
            onClick={() => setActiveTab('console')}
            icon={<Terminal size={14} />}
            label="Console"
            badge={logs.length > 0 ? logs.length : undefined}
            badgeColor={hasErrors ? '#ef4444' : '#6366f1'}
          />
        </div>

        {/* Toolbar Buttons */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <button
            onClick={handleRefresh}
            title="Reload Preview"
            style={{
              padding: '6px',
              borderRadius: 'var(--radius-sm)',
              border: 'none',
              background: 'transparent',
              color: 'var(--text-secondary)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              transition: 'all var(--transition-fast)',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = '#1e293b';
              e.currentTarget.style.color = '#f3f4f6';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'transparent';
              e.currentTarget.style.color = 'var(--text-secondary)';
            }}
          >
            <RefreshCw size={15} />
          </button>

          <button
            onClick={handleOpenNewWindow}
            title="Open in new window"
            style={{
              padding: '6px',
              borderRadius: 'var(--radius-sm)',
              border: 'none',
              background: 'transparent',
              color: 'var(--text-secondary)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              transition: 'all var(--transition-fast)',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = '#1e293b';
              e.currentTarget.style.color = '#f3f4f6';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'transparent';
              e.currentTarget.style.color = 'var(--text-secondary)';
            }}
          >
            <ExternalLink size={15} />
          </button>

          <button
            onClick={onClose}
            title="Close Preview"
            style={{
              padding: '6px',
              borderRadius: 'var(--radius-sm)',
              border: 'none',
              background: 'transparent',
              color: 'var(--text-secondary)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              transition: 'all var(--transition-fast)',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = '#ef444422';
              e.currentTarget.style.color = '#ef4444';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'transparent';
              e.currentTarget.style.color = 'var(--text-secondary)';
            }}
          >
            <X size={15} />
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div style={{ flex: 1, position: 'relative', overflow: 'hidden', background: '#090d16' }}>
        {activeTab === 'preview' && (
          <iframe
            key={iframeKey}
            ref={iframeRef}
            srcDoc={combinedHtml}
            sandbox="allow-scripts allow-same-origin"
            style={{
              width: '100%',
              height: '100%',
              border: 'none',
              background: 'white',
            }}
          />
        )}

        {activeTab === 'code' && (
          <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
            {/* File Tab Selectors */}
            <div
              style={{
                display: 'flex',
                background: '#0f172a',
                padding: '4px 8px',
                gap: '4px',
                borderBottom: '1px solid var(--border-primary)',
              }}
            >
              {webCode.html && (
                <FileTabButton
                  active={codeTab === 'html'}
                  onClick={() => setCodeTab('html')}
                  label="index.html"
                />
              )}
              {webCode.css && (
                <FileTabButton
                  active={codeTab === 'css'}
                  onClick={() => setCodeTab('css')}
                  label="styles.css"
                />
              )}
              {webCode.js && (
                <FileTabButton
                  active={codeTab === 'js'}
                  onClick={() => setCodeTab('js')}
                  label="script.js"
                />
              )}
            </div>

            {/* Code Text Window */}
            <pre
              style={{
                flex: 1,
                margin: 0,
                padding: '16px',
                overflow: 'auto',
                fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
                fontSize: '0.8125rem',
                color: '#94a3b8',
                lineHeight: 1.5,
                background: '#070a13',
              }}
            >
              <code>{codeTab === 'html' ? webCode.html : codeTab === 'css' ? webCode.css : webCode.js}</code>
            </pre>
          </div>
        )}

        {activeTab === 'console' && (
          <div
            style={{
              height: '100%',
              display: 'flex',
              flexDirection: 'column',
              fontFamily: 'monospace',
              fontSize: '0.8125rem',
              background: '#070a13',
              overflow: 'hidden',
            }}
          >
            {/* Logs List */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '12px' }}>
              {logs.length === 0 ? (
                <div style={{ padding: '16px', color: '#64748b', fontStyle: 'italic' }}>
                  No logs captured. Interact with the preview to trigger logs or errors.
                </div>
              ) : (
                logs.map((log, index) => {
                  const isErr = log.type === 'error' || log.type === 'runtime_error';
                  const isWarn = log.type === 'warn';
                  const time = new Date(log.timestamp).toLocaleTimeString();

                  return (
                    <div
                      key={index}
                      style={{
                        padding: '6px 8px',
                        borderBottom: '1px solid #1e293b',
                        color: isErr ? '#ef4444' : isWarn ? '#fbbf24' : '#e2e8f0',
                        background: isErr ? '#ef44440c' : isWarn ? '#fbbf240a' : 'transparent',
                        display: 'flex',
                        alignItems: 'flex-start',
                        gap: '8px',
                      }}
                    >
                      <span style={{ color: '#64748b', fontSize: '0.75rem', flexShrink: 0 }}>[{time}]</span>
                      {isErr && <AlertTriangle size={14} style={{ marginTop: '2px', flexShrink: 0 }} />}
                      <span style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>{log.content}</span>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function TabButton({
  active,
  onClick,
  icon,
  label,
  badge,
  badgeColor = '#6366f1',
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
  badge?: number;
  badgeColor?: string;
}) {
  return (
    <button
      onClick={onClick}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '6px',
        padding: '6px 12px',
        borderRadius: 'var(--radius-sm)',
        border: 'none',
        background: active ? '#1e293b' : 'transparent',
        color: active ? '#f3f4f6' : 'var(--text-secondary)',
        fontSize: '0.8125rem',
        fontWeight: 500,
        cursor: 'pointer',
        transition: 'all var(--transition-fast)',
      }}
      onMouseEnter={(e) => {
        if (!active) e.currentTarget.style.background = '#0f172a';
      }}
      onMouseLeave={(e) => {
        if (!active) e.currentTarget.style.background = 'transparent';
      }}
    >
      {icon}
      <span>{label}</span>
      {badge !== undefined && (
        <span
          style={{
            background: badgeColor,
            color: 'white',
            borderRadius: 'var(--radius-full)',
            padding: '1px 6px',
            fontSize: '0.6875rem',
            fontWeight: 600,
            marginLeft: '4px',
          }}
        >
          {badge}
        </span>
      )}
    </button>
  );
}

function FileTabButton({ active, onClick, label }: { active: boolean; onClick: () => void; label: string }) {
  return (
    <button
      onClick={onClick}
      style={{
        padding: '4px 10px',
        borderRadius: 'var(--radius-sm)',
        border: 'none',
        background: active ? '#1e293b' : 'transparent',
        color: active ? '#f3f4f6' : '#64748b',
        fontSize: '0.75rem',
        fontFamily: 'monospace',
        cursor: 'pointer',
        transition: 'all var(--transition-fast)',
      }}
    >
      {label}
    </button>
  );
}
