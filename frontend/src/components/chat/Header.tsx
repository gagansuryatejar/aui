'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Menu, Sparkles, Settings, ChevronDown, Check, Cpu, Brain } from 'lucide-react';
import { useUIStore } from '@/store/ui-store';
import { useChatStore } from '@/store/chat-store';
import { useMemoryStore } from '@/store/memory-store';
import ThemeToggle from '../common/ThemeToggle';
import PersonaSelector from './PersonaSelector';
import { parseWebCode } from './SandboxPreview';
import { Play } from 'lucide-react';

export const MODELS = [
  { id: 'auto', name: 'Smart Router (Auto)', provider: 'system', icon: '🧠' },
  { id: 'consensus', name: 'Consensus (Best Answer)', provider: 'system', icon: '🏆' },
  
  // Google
  { id: 'google/gemini-2.5-flash', name: 'Gemini 2.5 Flash', provider: 'Google', icon: '⚡' },
  { id: 'google/gemini-2.5-pro', name: 'Gemini 2.5 Pro', provider: 'Google', icon: '💎' },
  
  // Groq
  { id: 'groq/llama-3.3-70b-versatile', name: 'Llama 3.3 70B (Groq)', provider: 'Groq', icon: '🚀' },
  
  // Nvidia
  { id: 'nvidia/nvidia/llama-3.1-nemotron-70b-instruct', name: 'Nemotron 70B', provider: 'Nvidia', icon: '🟢' },
  { id: 'nvidia/meta/llama-4-maverick-17b-128e-instruct', name: 'Llama 4 Maverick', provider: 'Nvidia', icon: '🐎' },
  { id: 'nvidia/deepseek-ai/deepseek-v4-pro', name: 'DeepSeek V4 Pro', provider: 'Nvidia', icon: '🧩' },
  { id: 'nvidia/google/gemma-3-12b-it', name: 'Gemma 3 12B', provider: 'Nvidia', icon: '🔸' },
  
  // OpenRouter (Free)
  { id: 'openrouter/qwen/qwen-2.5-coder-32b-instruct:free', name: 'Qwen 2.5 Coder (OR)', provider: 'OpenRouter', icon: '💻' },
  { id: 'openrouter/deepseek/deepseek-r2:free', name: 'DeepSeek R2 (OR)', provider: 'OpenRouter', icon: '🔮' },
  { id: 'openrouter/mistralai/mistral-nemo:free', name: 'Mistral Nemo (OR)', provider: 'OpenRouter', icon: '🌌' },
  { id: 'openrouter/meta-llama/llama-3.3-70b-instruct:free', name: 'Llama 3.3 70B (OR)', provider: 'OpenRouter', icon: '🔥' },
  
  // Cerebras
  { id: 'cerebras/llama-3.3-70b', name: 'Llama 3.3 70B (Cerebras)', provider: 'Cerebras', icon: '🦓' },
  { id: 'cerebras/llama3.1-8b', name: 'Llama 3.1 8B (Cerebras)', provider: 'Cerebras', icon: '🌪️' },

  // GitHub Models
  { id: 'github/gpt-4o', name: 'GPT-4o (GitHub)', provider: 'GitHub', icon: '🐱' },
  { id: 'github/gpt-4o-mini', name: 'GPT-4o Mini (GitHub)', provider: 'GitHub', icon: '🐭' },
  { id: 'github/meta-llama-3.1-405b-instruct', name: 'Llama 3.1 405B (GitHub)', provider: 'GitHub', icon: '🦕' },

  // Cloudflare
  { id: 'cloudflare/@cf/meta/llama-3.1-8b-instruct', name: 'Llama 3.1 8B (CF)', provider: 'Cloudflare', icon: '☁️' },
  { id: 'cloudflare/@cf/qwen/qwen1.5-14b-chat', name: 'Qwen 1.5 14B (CF)', provider: 'Cloudflare', icon: '🪐' },

  // Cohere
  { id: 'cohere/command-r-plus', name: 'Command R+ (Cohere)', provider: 'Cohere', icon: '🏰' },
  { id: 'cohere/command-r', name: 'Command R (Cohere)', provider: 'Cohere', icon: '🛡️' },

  // Mistral
  { id: 'mistral/mistral-small-latest', name: 'Mistral Small', provider: 'Mistral', icon: '🍃' },
  { id: 'mistral/codestral-latest', name: 'Codestral', provider: 'Mistral', icon: '🎯' }
];

export default function Header() {
  const { toggleSidebar, sidebarOpen, setSettingsOpen, previewOpen, setPreviewOpen, isMobile } = useUIStore();
  const {
    activeModel,
    selectedModelId,
    setSelectedModelId,
    activePersona,
    setActivePersona,
    messages,
  } = useChatStore();

  const webCode = parseWebCode(messages);

  const [modelDropdownOpen, setModelDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setModelDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const getShortModelName = (modelId: string) => {
    const parts = modelId.split('/');
    const name = parts[parts.length - 1] || modelId;
    return name.replace(':free', '').trim();
  };

  const selectedModel = MODELS.find((m) => m.id === selectedModelId) || MODELS[0];

  return (
    <header
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 16px',
        height: 'var(--header-height)',
        borderBottom: '1px solid var(--border-primary)',
        background: 'var(--bg-primary)',
        flexShrink: 0,
        zIndex: 30,
      }}
    >
      {/* Left */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0, flex: 1 }}>
        <button
          onClick={toggleSidebar}
          title={sidebarOpen ? 'Close sidebar' : 'Open sidebar'}
          style={{
            padding: '8px',
            borderRadius: 'var(--radius-sm)',
            border: 'none',
            background: 'transparent',
            color: 'var(--text-secondary)',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            transition: 'all var(--transition-fast)',
            flexShrink: 0,
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
          <Menu size={20} />
        </button>

        <div style={{ display: 'none', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
          <div
            style={{
              width: 22,
              height: 22,
              borderRadius: 'var(--radius-sm)',
              background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Sparkles size={12} color="white" />
          </div>
          <span
            style={{
              fontWeight: 600,
              fontSize: '0.9rem',
              color: 'var(--text-primary)',
            }}
          >
            AUI
          </span>
        </div>

        {/* Model dropdown selector */}
        <div ref={dropdownRef} style={{ position: 'relative' }}>
          <button
            onClick={() => setModelDropdownOpen((v) => !v)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: isMobile ? '6px 8px' : '6px 12px',
              borderRadius: 'var(--radius-full)',
              border: '1px solid var(--border-primary)',
              background: 'var(--bg-secondary)',
              color: 'var(--text-primary)',
              fontSize: '0.8125rem',
              fontWeight: 500,
              cursor: 'pointer',
              transition: 'all var(--transition-fast)',
              boxShadow: 'var(--shadow-sm)',
            }}
          >
            <span style={{ fontSize: '0.9rem' }}>{selectedModel.icon}</span>
            {!isMobile && <span>{selectedModel.name}</span>}
            <ChevronDown size={14} style={{ color: 'var(--text-tertiary)' }} />
          </button>

          {modelDropdownOpen && (
            <div
              style={{
                position: 'absolute',
                top: 'calc(100% + 6px)',
                left: 0,
                width: 260,
                maxHeight: 380,
                overflowY: 'auto',
                background: 'var(--bg-secondary)',
                border: '1px solid var(--border-primary)',
                borderRadius: 'var(--radius-md)',
                boxShadow: 'var(--shadow-lg)',
                padding: '6px 0',
                zIndex: 40,
              }}
            >
              {MODELS.map((m) => {
                const isSelected = selectedModelId === m.id;
                return (
                  <button
                    key={m.id}
                    onClick={() => {
                      setSelectedModelId(m.id);
                      setModelDropdownOpen(false);
                    }}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      width: '100%',
                      padding: '8px 14px',
                      border: 'none',
                      background: isSelected ? 'var(--bg-hover)' : 'transparent',
                      color: 'var(--text-primary)',
                      fontSize: '0.8125rem',
                      textAlign: 'left',
                      cursor: 'pointer',
                    }}
                    onMouseEnter={(e) => {
                      if (!isSelected) e.currentTarget.style.background = 'var(--bg-hover)';
                    }}
                    onMouseLeave={(e) => {
                      if (!isSelected) e.currentTarget.style.background = 'transparent';
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ fontSize: '0.95rem' }}>{m.icon}</span>
                      <div>
                        <div style={{ fontWeight: isSelected ? 600 : 400 }}>{m.name}</div>
                        <div style={{ fontSize: '0.6875rem', color: 'var(--text-tertiary)' }}>
                          {m.provider}
                        </div>
                      </div>
                    </div>
                    {isSelected && <Check size={14} style={{ color: 'var(--brand-primary)' }} />}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Active model label during streaming or from router decision */}
        {activeModel && activeModel !== selectedModelId && (
          <span
            title={`Currently executing model: ${activeModel}`}
            style={{
              fontSize: '0.72rem',
              color: 'var(--text-tertiary)',
              background: 'var(--bg-tertiary)',
              padding: '3px 10px',
              borderRadius: 'var(--radius-full)',
              border: '1px solid var(--border-primary)',
              maxWidth: '130px',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              display: 'inline-block',
              flexShrink: 1,
            }}
          >
            ⚡ {getShortModelName(activeModel)}
          </span>
        )}
      </div>

      {/* Right */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexShrink: 0 }}>
        {/* Persona Selector Dropdown */}
        {/* Live Preview Button */}
        {webCode.hasCode && (
          <button
            onClick={() => setPreviewOpen(!previewOpen)}
            title="Toggle Live Sandbox Preview"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: isMobile ? '8px' : '6px 14px',
              borderRadius: 'var(--radius-full)',
              border: '1px solid var(--border-primary)',
              background: previewOpen ? 'rgba(99, 102, 241, 0.15)' : 'var(--bg-secondary)',
              color: previewOpen ? 'var(--brand-primary)' : 'var(--text-primary)',
              fontSize: '0.8125rem',
              fontWeight: 500,
              cursor: 'pointer',
              transition: 'all var(--transition-fast)',
              boxShadow: previewOpen ? '0 0 12px rgba(99, 102, 241, 0.3)' : 'var(--shadow-sm)',
            }}
          >
            <Play size={13} style={{ fill: previewOpen ? 'currentColor' : 'none' }} />
            {!isMobile && <span>Live Preview</span>}
          </button>
        )}

        <PersonaSelector selectedPersona={activePersona} onSelect={setActivePersona} />

        {/* Memory button */}
        <button
          onClick={() => useMemoryStore.getState().setPanelOpen(true)}
          title="Memory"
          style={{
            padding: '8px',
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
            e.currentTarget.style.background = 'var(--bg-hover)';
            e.currentTarget.style.color = 'var(--text-primary)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'transparent';
            e.currentTarget.style.color = 'var(--text-secondary)';
          }}
        >
          <Brain size={18} />
        </button>

        <ThemeToggle />

        <button
          onClick={() => setSettingsOpen(true)}
          title="Settings"
          style={{
            padding: '8px',
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
            e.currentTarget.style.background = 'var(--bg-hover)';
            e.currentTarget.style.color = 'var(--text-primary)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'transparent';
            e.currentTarget.style.color = 'var(--text-secondary)';
          }}
        >
          <Settings size={18} />
        </button>
      </div>
    </header>
  );
}
