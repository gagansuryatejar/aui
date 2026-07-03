'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, Info, X } from 'lucide-react';

export default function WelcomePopup() {
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    // Show popup if not seen before or if welcome=true query param is present
    const params = new URLSearchParams(window.location.search);
    const forceShow = params.get('welcome') === 'true';
    const hasSeen = localStorage.getItem('aui_welcome_seen');
    if (!hasSeen || forceShow) {
      setIsOpen(true);
    }
  }, []);

  const handleClose = () => {
    localStorage.setItem('aui_welcome_seen', 'true');
    setIsOpen(false);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '24px',
            background: 'rgba(0, 0, 0, 0.7)',
            backdropFilter: 'blur(8px)',
          }}
        >
          {/* Backdrop Click */}
          <div
            onClick={handleClose}
            style={{
              position: 'absolute',
              inset: 0,
              cursor: 'pointer',
            }}
          />

          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            transition={{ type: 'spring', duration: 0.5 }}
            style={{
              position: 'relative',
              width: '100%',
              maxWidth: '460px',
              background: 'var(--bg-secondary)',
              border: '1px solid var(--border-primary)',
              borderRadius: 'var(--radius-lg)',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.5), var(--shadow-glow)',
              padding: '36px 28px 28px',
              zIndex: 10,
              overflow: 'hidden',
            }}
          >
            {/* Ambient Background Glow */}
            <div
              style={{
                position: 'absolute',
                top: '-150px',
                right: '-150px',
                width: '300px',
                height: '300px',
                borderRadius: '50%',
                background: 'radial-gradient(circle, rgba(99, 102, 241, 0.15) 0%, rgba(0,0,0,0) 70%)',
                pointerEvents: 'none',
              }}
            />

            {/* Close Icon Button */}
            <button
              onClick={handleClose}
              title="Close notification"
              style={{
                position: 'absolute',
                top: '16px',
                right: '16px',
                background: 'transparent',
                border: 'none',
                color: 'var(--text-tertiary)',
                cursor: 'pointer',
                padding: '6px',
                borderRadius: 'var(--radius-sm)',
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
              <X size={16} />
            </button>

            {/* Header Icon */}
            <div
              style={{
                display: 'flex',
                justifyContent: 'center',
                marginBottom: '20px',
              }}
            >
              <div
                style={{
                  width: '52px',
                  height: '52px',
                  borderRadius: 'var(--radius-md)',
                  background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.1), rgba(139, 92, 246, 0.1))',
                  border: '1px solid rgba(99, 102, 241, 0.2)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'var(--brand-primary)',
                }}
              >
                <Sparkles size={26} />
              </div>
            </div>

            {/* Title */}
            <h3
              style={{
                fontSize: '1.25rem',
                fontWeight: 700,
                textAlign: 'center',
                color: 'var(--text-primary)',
                marginBottom: '16px',
                background: 'linear-gradient(135deg, var(--text-primary), var(--text-secondary))',
                WebkitBackgroundClip: 'text',
              }}
            >
              Welcome to AUI!
            </h3>

            {/* Content text */}
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '14px',
                fontSize: '0.875rem',
                lineHeight: '1.6',
                color: 'var(--text-secondary)',
                marginBottom: '28px',
                textAlign: 'center',
              }}
            >
              <div
                style={{
                  background: 'var(--bg-tertiary)',
                  border: '1px solid var(--border-primary)',
                  borderRadius: 'var(--radius-sm)',
                  padding: '12px 16px',
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '10px',
                  textAlign: 'left',
                  fontSize: '0.8125rem',
                  color: 'var(--text-tertiary)',
                }}
              >
                <Info size={16} style={{ flexShrink: 0, marginTop: '2px', color: '#f59e0b' }} />
                <span>
                  We deployed this website on a <strong>free server</strong>, so it will give answers late. Please cooperate with us.
                </span>
              </div>

              <p style={{ margin: 0 }}>
                We used in this project more than <strong>20+ models</strong> to give the best output. Enjoy AUI!
              </p>

              <p style={{ margin: 0, fontSize: '0.8125rem', color: 'var(--text-tertiary)' }}>
                We also integrated <strong>real-time web search</strong> to give you the best experience!
              </p>

              <div
                style={{
                  borderTop: '1px solid var(--border-primary)',
                  paddingTop: '12px',
                  fontSize: '0.75rem',
                  color: 'var(--text-tertiary)',
                  fontStyle: 'italic',
                }}
              >
                Made by R. Gagan Surya Teja
              </div>
            </div>

            {/* Action button */}
            <button
              onClick={handleClose}
              style={{
                width: '100%',
                padding: '10px',
                borderRadius: 'var(--radius-sm)',
                border: 'none',
                background: 'var(--brand-primary)',
                color: 'white',
                fontSize: '0.875rem',
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'all var(--transition-fast)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'var(--brand-primary-hover)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'var(--brand-primary)';
              }}
            >
              Enjoy AUI
            </button>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
