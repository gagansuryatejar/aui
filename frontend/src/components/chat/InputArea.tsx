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
} from 'lucide-react';
import { useChatStore } from '@/store/chat-store';
import { useUIStore } from '@/store/ui-store';

interface InputAreaProps {
  onSubmit?: () => void;
}

export default function InputArea({ onSubmit }: InputAreaProps) {
  const { sendMessage, isStreaming, stopStreaming } = useChatStore();
  const { webSearchEnabled, toggleWebSearch } = useUIStore();

  const [input, setInput] = useState('');
  const [files, setFiles] = useState<File[]>([]);
  const [isListening, setIsListening] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const recognitionRef = useRef<any | null>(null);

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
        padding: '0 16px 24px',
        maxWidth: '48rem',
        width: '100%',
        margin: '0 auto',
      }}
    >
      {/* File previews */}
      <AnimatePresence>
        {files.length > 0 && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            style={{
              display: 'flex',
              gap: '8px',
              flexWrap: 'wrap',
              marginBottom: '8px',
            }}
          >
            {files.map((file, i) => (
              <motion.div
                key={`${file.name}-${i}`}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '6px 10px',
                  borderRadius: 'var(--radius-sm)',
                  background: 'var(--bg-tertiary)',
                  border: '1px solid var(--border-primary)',
                  fontSize: '0.8125rem',
                  color: 'var(--text-secondary)',
                }}
              >
                {file.type.startsWith('image/') ? (
                  <ImageIcon size={14} style={{ color: 'var(--brand-primary)' }} />
                ) : (
                  <FileText size={14} style={{ color: 'var(--brand-primary)' }} />
                )}
                <span style={{ maxWidth: 120, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {file.name}
                </span>
                <button
                  onClick={() => removeFile(i)}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    color: 'var(--text-tertiary)',
                    cursor: 'pointer',
                    padding: '2px',
                    display: 'flex',
                  }}
                >
                  <X size={12} />
                </button>
              </motion.div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Input container */}
      <div
        {...getRootProps()}
        style={{
          position: 'relative',
          borderRadius: 'var(--radius-lg)',
          border: isDragActive
            ? '2px solid var(--brand-primary)'
            : '1px solid var(--border-primary)',
          background: 'var(--bg-input)',
          transition: 'all var(--transition-fast)',
          boxShadow: isDragActive ? 'var(--shadow-glow)' : 'var(--shadow-sm)',
        }}
      >
        {/* Drag overlay */}
        <AnimatePresence>
          {isDragActive && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              style={{
                position: 'absolute',
                inset: 0,
                borderRadius: 'var(--radius-lg)',
                background: 'rgba(99, 102, 241, 0.08)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                zIndex: 10,
                pointerEvents: 'none',
              }}
            >
              <span
                style={{
                  color: 'var(--brand-primary)',
                  fontWeight: 500,
                  fontSize: '0.875rem',
                }}
              >
                Drop files here…
              </span>
            </motion.div>
          )}
        </AnimatePresence>

        <input {...getInputProps()} />

        <div style={{ display: 'flex', alignItems: 'flex-end', padding: '8px' }}>
          {/* Web Search toggle */}
          <button
            onClick={toggleWebSearch}
            title={webSearchEnabled ? 'Web search enabled – click to disable' : 'Enable web search'}
            style={{
              padding: '8px',
              borderRadius: 'var(--radius-sm)',
              border: 'none',
              background: webSearchEnabled ? 'rgba(59, 130, 246, 0.12)' : 'transparent',
              color: webSearchEnabled ? '#3b82f6' : 'var(--text-tertiary)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'all var(--transition-fast)',
              position: 'relative',
            }}
            onMouseEnter={(e) => {
              if (!webSearchEnabled) {
                e.currentTarget.style.color = 'var(--text-primary)';
                e.currentTarget.style.background = 'var(--bg-hover)';
              }
            }}
            onMouseLeave={(e) => {
              if (!webSearchEnabled) {
                e.currentTarget.style.color = 'var(--text-tertiary)';
                e.currentTarget.style.background = 'transparent';
              } else {
                e.currentTarget.style.background = 'rgba(59, 130, 246, 0.12)';
              }
            }}
          >
            <Globe size={18} />
            {webSearchEnabled && (
              <span
                style={{
                  position: 'absolute',
                  top: '5px',
                  right: '5px',
                  width: '6px',
                  height: '6px',
                  borderRadius: '50%',
                  background: '#3b82f6',
                  boxShadow: '0 0 4px rgba(59, 130, 246, 0.6)',
                }}
              />
            )}
          </button>

          {/* Attachment button */}
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
              borderRadius: 'var(--radius-sm)',
              border: 'none',
              background: 'transparent',
              color: 'var(--text-tertiary)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'all var(--transition-fast)',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.color = 'var(--text-primary)';
              e.currentTarget.style.background = 'var(--bg-hover)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.color = 'var(--text-tertiary)';
              e.currentTarget.style.background = 'transparent';
            }}
          >
            <Paperclip size={18} />
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
              fontSize: '0.9375rem',
              fontFamily: 'inherit',
              lineHeight: 1.5,
              padding: '8px 4px',
              resize: 'none',
              outline: 'none',
              maxHeight: '200px',
              overflowY: 'auto',
            }}
          />

          {/* Voice button */}
          <button
            onClick={toggleVoice}
            title={isListening ? 'Stop listening' : 'Voice input'}
            style={{
              padding: '8px',
              borderRadius: 'var(--radius-sm)',
              border: 'none',
              background: isListening ? 'rgba(239, 68, 68, 0.1)' : 'transparent',
              color: isListening ? '#ef4444' : 'var(--text-tertiary)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'all var(--transition-fast)',
            }}
            onMouseEnter={(e) => {
              if (!isListening) {
                e.currentTarget.style.color = 'var(--text-primary)';
                e.currentTarget.style.background = 'var(--bg-hover)';
              }
            }}
            onMouseLeave={(e) => {
              if (!isListening) {
                e.currentTarget.style.color = 'var(--text-tertiary)';
                e.currentTarget.style.background = 'transparent';
              }
            }}
          >
            {isListening ? <MicOff size={18} /> : <Mic size={18} />}
          </button>

          {/* Send / Stop button */}
          {isStreaming ? (
            <button
              onClick={stopStreaming}
              title="Stop generating"
              style={{
                padding: '8px',
                borderRadius: 'var(--radius-sm)',
                border: 'none',
                background: 'var(--bg-hover)',
                color: 'var(--text-primary)',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'all var(--transition-fast)',
              }}
            >
              <Square size={16} fill="currentColor" />
            </button>
          ) : (
            <button
              onClick={handleSubmit}
              disabled={!input.trim() && files.length === 0}
              title="Send message"
              style={{
                padding: '8px',
                borderRadius: 'var(--radius-sm)',
                border: 'none',
                background:
                  input.trim() || files.length > 0
                    ? 'var(--brand-primary)'
                    : 'var(--bg-hover)',
                color:
                  input.trim() || files.length > 0
                    ? 'white'
                    : 'var(--text-tertiary)',
                cursor: input.trim() || files.length > 0 ? 'pointer' : 'default',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'all var(--transition-fast)',
              }}
            >
              <ArrowUp size={18} />
            </button>
          )}
        </div>
      </div>

      {/* Hint text */}
      <div
        style={{
          textAlign: 'center',
          fontSize: '0.6875rem',
          color: 'var(--text-tertiary)',
          marginTop: '8px',
        }}
      >
        AUI can make mistakes. Verify important information.
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
