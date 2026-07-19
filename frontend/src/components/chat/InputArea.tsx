'use client';

import React, { useState, useRef, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useDropzone } from 'react-dropzone';
import {
  Send,
  Paperclip,
  Mic,
  MicOff,
  Square,
  X,
  Image as ImageIcon,
  FileText,
  ArrowUp,
  Globe,
  ChevronDown,
  Check,
} from 'lucide-react';
import { useChatStore } from '@/store/chat-store';
import { useUIStore } from '@/store/ui-store';
import { MODELS } from './Header';

interface InputAreaProps {
  onSubmit?: () => void;
}

export default function InputArea({ onSubmit }: InputAreaProps) {
  const { sendMessage, isStreaming, stopStreaming, selectedModelId, setSelectedModelId } = useChatStore();
  const { webSearchEnabled, toggleWebSearch } = useUIStore();

  const [input, setInput] = useState('');
  const [files, setFiles] = useState<File[]>([]);
  const [isListening, setIsListening] = useState(false);
  const [modelDropdownOpen, setModelDropdownOpen] = useState(false);
  
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const recognitionRef = useRef<any | null>(null);
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

  const selectedModel = MODELS.find((m) => m.id === selectedModelId) || MODELS[0];

  // Auto-resize textarea
  useEffect(() => {
    const el = textareaRef.current;
    if (el) {
      el.style.height = 'auto';
      el.style.height = `${Math.min(el.scrollHeight, 200)}px`;
    }
  }, [input]);

  // Focus on mount
  useEffect(() => {
    textareaRef.current?.focus();
  }, []);

  const handleSubmit = useCallback(() => {
    if (!input.trim() && files.length === 0) return;
    if (isStreaming) return;

    sendMessage(input.trim(), undefined, webSearchEnabled);
    setInput('');
    setFiles([]);
    onSubmit?.();

    // Reset textarea height
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
  }, [input, files, isStreaming, sendMessage, onSubmit, webSearchEnabled]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        handleSubmit();
      }
    },
    [handleSubmit],
  );

  // Drag and drop
  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop: (accepted) => {
      setFiles((prev) => [...prev, ...accepted]);
    },
    noClick: true,
    accept: {
      'image/*': ['.png', '.jpg', '.jpeg', '.gif', '.webp'],
      'application/pdf': ['.pdf'],
      'text/*': ['.txt', '.md', '.csv', '.json'],
    },
    maxSize: 25 * 1024 * 1024,
  });

  // Voice input
  const toggleVoice = useCallback(() => {
    if (!('webkitSpeechRecognition' in window || 'SpeechRecognition' in window)) {
      alert('Voice input is not supported in this browser');
      return;
    }

    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
      return;
    }

    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-US';

    recognition.onresult = (event: any) => {
      let transcript = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        transcript += event.results[i][0].transcript;
      }
      setInput((prev) => prev + transcript);
    };

    recognition.onerror = () => {
      setIsListening(false);
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    recognitionRef.current = recognition;
    recognition.start();
    setIsListening(true);
  }, [isListening]);

  const removeFile = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  };

  return (
    <div
      style={{
        padding: '0 24px 24px 24px',
        maxWidth: '50rem',
        width: '100%',
        margin: '0 auto',
        position: 'relative',
        zIndex: 20,
      }}
    >
      {/* File previews */}
      <AnimatePresence>
        {files.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            style={{
              display: 'flex',
              gap: '8px',
              flexWrap: 'wrap',
              marginBottom: '10px',
              padding: '6px',
              background: 'var(--glass)',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--glass-border)',
            }}
          >
            {files.map((file, i) => (
              <motion.div
                key={`${file.name}-${i}`}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '6px 12px',
                  borderRadius: 'var(--radius-full)',
                  background: 'var(--bg-surface)',
                  border: '1px solid var(--glass-border)',
                  fontSize: '0.75rem',
                  color: 'var(--text-primary)',
                }}
              >
                {file.type.startsWith('image/') ? (
                  <ImageIcon size={13} style={{ color: 'var(--brand)' }} />
                ) : (
                  <FileText size={13} style={{ color: 'var(--brand)' }} />
                )}
                <span style={{ maxWidth: 120, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontWeight: 500 }}>
                  {file.name}
                </span>
                <button
                  onClick={() => removeFile(i)}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    color: 'var(--text-secondary)',
                    cursor: 'pointer',
                    padding: '2px',
                    display: 'flex',
                  }}
                >
                  <X size={11} />
                </button>
              </motion.div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Model Selector Badges + Controls toolbar */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px', gap: '8px' }}>
        {/* Model dropdown badge */}
        <div style={{ position: 'relative' }} ref={dropdownRef}>
          <button
            type="button"
            onClick={() => setModelDropdownOpen(!modelDropdownOpen)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '4px 12px',
              borderRadius: 'var(--radius-full)',
              border: '1px solid var(--glass-border)',
              background: 'var(--glass)',
              color: 'var(--text-secondary)',
              fontSize: '0.72rem',
              fontWeight: 500,
              cursor: 'pointer',
              transition: 'all 0.2s var(--ease-smooth)',
              backdropFilter: 'blur(12px)',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = 'var(--brand)';
              e.currentTarget.style.color = 'var(--text-primary)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = 'var(--glass-border)';
              e.currentTarget.style.color = 'var(--text-secondary)';
            }}
          >
            <span>{selectedModel.icon}</span>
            <span>{selectedModel.name}</span>
            <ChevronDown size={10} style={{ color: 'var(--text-tertiary)' }} />
          </button>

          {modelDropdownOpen && (
            <div
              className="glass-card"
              style={{
                position: 'absolute',
                bottom: 'calc(100% + 6px)',
                left: 0,
                width: 260,
                maxHeight: 280,
                overflowY: 'auto',
                boxShadow: 'var(--shadow-lg)',
                padding: '6px 0',
                zIndex: 35,
                display: 'flex',
                flexDirection: 'column',
              }}
            >
              <div style={{ padding: '6px 14px', fontSize: '0.65rem', fontWeight: 600, color: 'var(--text-tertiary)', borderBottom: '1px solid var(--glass-border)', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Select Intelligence Layer
              </div>
              {MODELS.map((m) => {
                const isSelected = selectedModelId === m.id;
                return (
                  <button
                    key={m.id}
                    type="button"
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
                      background: isSelected ? 'var(--glass-hover)' : 'transparent',
                      color: 'var(--text-primary)',
                      fontSize: '0.8125rem',
                      textAlign: 'left',
                      cursor: 'pointer',
                      transition: 'all 0.2s var(--ease-smooth)',
                    }}
                    onMouseEnter={(e) => {
                      if (!isSelected) e.currentTarget.style.background = 'var(--glass-hover)';
                    }}
                    onMouseLeave={(e) => {
                      if (!isSelected) e.currentTarget.style.background = 'transparent';
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ fontSize: '0.9rem' }}>{m.icon}</span>
                      <div>
                        <div style={{ fontWeight: isSelected ? 600 : 400, color: isSelected ? 'var(--brand)' : 'var(--text-primary)' }}>{m.name}</div>
                        <div style={{ fontSize: '0.6875rem', color: 'var(--text-tertiary)' }}>{m.provider}</div>
                      </div>
                    </div>
                    {isSelected && <Check size={13} style={{ color: 'var(--brand)' }} />}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Action icons status triggers */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          {/* Web Search Toggle */}
          <button
            onClick={toggleWebSearch}
            title={webSearchEnabled ? 'Web search: Enabled' : 'Web search: Disabled'}
            style={{
              padding: '4px 10px',
              borderRadius: 'var(--radius-full)',
              border: '1px solid',
              borderColor: webSearchEnabled ? 'rgba(0, 229, 255, 0.25)' : 'var(--glass-border)',
              background: webSearchEnabled ? 'var(--accent-muted)' : 'var(--glass)',
              color: webSearchEnabled ? 'var(--accent)' : 'var(--text-secondary)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              fontSize: '0.72rem',
              fontWeight: 500,
              transition: 'all 0.2s var(--ease-smooth)',
            }}
          >
            <Globe size={11} />
            <span>Search</span>
          </button>
        </div>
      </div>

      {/* Input container — Glass Capsule */}
      <div
        {...getRootProps()}
        className="glass-input"
        style={{
          position: 'relative',
          borderRadius: '32px',
          padding: '6px 6px 6px 14px',
          display: 'flex',
          alignItems: 'center',
          boxShadow: 'var(--shadow-md)',
          borderWidth: '1px',
        }}
      >
        <input {...getInputProps()} />

        {/* Left Actions: Attachment */}
        <button
          onClick={() => {
            const input = document.createElement('input');
            input.type = 'file';
            input.multiple = true;
            input.accept = 'image/*,.pdf,.txt,.md,.csv,.json';
            input.onchange = (e) => {
              const target = e.target as HTMLInputElement;
              if (target.files) {
                setFiles((prev) => [...prev, ...Array.from(target.files!)]);
              }
            };
            input.click();
          }}
          title="Attach files"
          style={{
            padding: '8px',
            borderRadius: 'var(--radius-full)',
            border: 'none',
            background: 'transparent',
            color: 'var(--text-secondary)',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'all 0.2s var(--ease-smooth)',
            flexShrink: 0,
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.color = 'var(--text-primary)';
            e.currentTarget.style.background = 'var(--glass-hover)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.color = 'var(--text-secondary)';
            e.currentTarget.style.background = 'transparent';
          }}
        >
          <Paperclip size={16} />
        </button>

        {/* Textarea */}
        <textarea
          ref={textareaRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Message AUI…"
          rows={1}
          style={{
            flex: 1,
            border: 'none',
            background: 'transparent',
            color: 'var(--text-primary)',
            fontSize: '0.875rem',
            fontFamily: 'inherit',
            lineHeight: 1.5,
            padding: '8px 10px',
            resize: 'none',
            outline: 'none',
            maxHeight: '140px',
            overflowY: 'auto',
          }}
        />

        {/* Right Actions: Voice + Send */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', flexShrink: 0 }}>
          <button
            onClick={toggleVoice}
            title={isListening ? 'Stop listening' : 'Voice input'}
            style={{
              padding: '8px',
              borderRadius: 'var(--radius-full)',
              border: 'none',
              background: isListening ? 'rgba(239, 68, 68, 0.12)' : 'transparent',
              color: isListening ? 'var(--danger)' : 'var(--text-secondary)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'all 0.2s var(--ease-smooth)',
            }}
            onMouseEnter={(e) => {
              if (!isListening) {
                e.currentTarget.style.color = 'var(--text-primary)';
                e.currentTarget.style.background = 'var(--glass-hover)';
              }
            }}
            onMouseLeave={(e) => {
              if (!isListening) {
                e.currentTarget.style.color = 'var(--text-secondary)';
                e.currentTarget.style.background = 'transparent';
              }
            }}
          >
            <Mic size={15} />
          </button>

          {isStreaming ? (
            <button
              onClick={stopStreaming}
              title="Stop generating"
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '50%',
                border: 'none',
                background: 'var(--bg-hover)',
                color: 'var(--text-primary)',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'all 0.2s var(--ease-smooth)',
              }}
            >
              <Square size={13} fill="currentColor" />
            </button>
          ) : (
            <button
              onClick={handleSubmit}
              disabled={!input.trim() && files.length === 0}
              title="Send message"
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '50%',
                border: 'none',
                background:
                  input.trim() || files.length > 0
                    ? 'linear-gradient(135deg, var(--brand), var(--brand-hover))'
                    : 'var(--glass)',
                color:
                  input.trim() || files.length > 0
                    ? 'white'
                    : 'var(--text-tertiary)',
                cursor: input.trim() || files.length > 0 ? 'pointer' : 'default',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'all 0.2s var(--ease-smooth)',
                boxShadow: input.trim() || files.length > 0 ? '0 4px 12px rgba(108, 99, 255, 0.3)' : 'none',
              }}
            >
              <ArrowUp size={16} strokeWidth={2.5} />
            </button>
          )}
        </div>
      </div>

      {/* Info notice */}
      <div
        style={{
          textAlign: 'center',
          fontSize: '0.65rem',
          color: 'var(--text-tertiary)',
          marginTop: '6px',
          letterSpacing: '0.01em',
        }}
      >
        AUI 3.0 Agent System. Information is processed locally.
      </div>
    </div>
  );
}

// Type declarations for Web Speech API
declare global {
  interface Window {
    SpeechRecognition: any;
    webkitSpeechRecognition: any;
  }
}

