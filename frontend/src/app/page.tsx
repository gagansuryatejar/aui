'use client';

import React, { useEffect, useState } from 'react';
import Sidebar from '@/components/sidebar/Sidebar';
import ChatArea from '@/components/chat/ChatArea';
import Header from '@/components/chat/Header';
import SettingsModal from '@/components/settings/SettingsModal';
import AuthPage from '@/components/auth/AuthPage';
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts';
import { useUIStore } from '@/store/ui-store';
import { useChatStore } from '@/store/chat-store';
import { AnimatePresence } from 'framer-motion';
import WelcomePopup from '@/components/common/WelcomePopup';
import { apiGet } from '@/lib/api';
import SandboxPreview, { parseWebCode } from '@/components/chat/SandboxPreview';
import MemoryPanel from '@/components/memory/MemoryPanel';

export default function Home() {
  const { setIsMobile, isMobile, sidebarOpen, isAuthenticated, setUser, authModalOpen, setAuthModalOpen, previewOpen, setPreviewOpen } = useUIStore();
  const { loadConversations, loadConversation, messages } = useChatStore();
  const [checkingAuth, setCheckingAuth] = useState(true);

  const webCode = parseWebCode(messages);

  // Register keyboard shortcuts
  useKeyboardShortcuts();

  // Detect mobile
  useEffect(() => {
    const checkMobile = () => {
      const mobile = window.innerWidth < 768;
      setIsMobile(mobile);
      if (mobile) {
        useUIStore.getState().setSidebarOpen(false);
      }
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, [setIsMobile]);

  // Load conversations and verify session on mount
  useEffect(() => {
    const initSession = async () => {
      const token = localStorage.getItem('aui_token');
      if (token) {
        try {
          const user = await apiGet<{ id: string; email: string; name: string }>('/api/auth/me');
          setUser(user);
          await loadConversations();
          // Load persisted active conversation if any
          const persistedId = typeof window !== 'undefined' ? localStorage.getItem('aui_active_conversation') : null;
          if (persistedId) {
            loadConversation(persistedId);
          }
        } catch {
          // Token expired or invalid
          localStorage.removeItem('aui_token');
          setUser(null);
        }
      }
      setCheckingAuth(false);
    };

    initSession();
  }, [loadConversations, loadConversation, setUser]);

  if (checkingAuth) {
    return (
      <div
        style={{
          display: 'flex',
          height: '100vh',
          width: '100vw',
          background: 'var(--bg-primary)',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'var(--text-secondary)',
          fontSize: '0.875rem',
        }}
      >
        Loading AUI…
      </div>
    );
  }

  // Authentication is now optional - no redirect on entrance!

  return (
    <div
      style={{
        display: 'flex',
        height: '100vh',
        width: '100vw',
        overflow: 'hidden',
        background: 'var(--bg-primary)',
      }}
    >
      {/* Sidebar */}
      <Sidebar />

      {/* Main content */}
      <div
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'row',
          height: '100vh',
          overflow: 'hidden',
          minWidth: 0,
        }}
      >
        <div
          style={{
            flex: 1,
            display: (isMobile && previewOpen && webCode.hasCode) ? 'none' : 'flex',
            flexDirection: 'column',
            height: '100%',
            overflow: 'hidden',
            minWidth: 0,
          }}
        >
          <Header />
          <ChatArea />
        </div>

        {/* Sandbox Live Preview Side Panel */}
        {previewOpen && webCode.hasCode && (
          <SandboxPreview onClose={() => setPreviewOpen(false)} />
        )}
      </div>

      {/* Settings modal */}
      <SettingsModal />

      {/* Memory panel */}
      <MemoryPanel />

      {/* Welcome popup */}
      <WelcomePopup />

      {/* Guest Sign In Modal */}
      <AnimatePresence>
        {authModalOpen && (
          <div
            style={{
              position: 'fixed',
              inset: 0,
              zIndex: 100,
              background: 'rgba(0, 0, 0, 0.65)',
              backdropFilter: 'blur(8px)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '24px',
            }}
          >
            {/* Click backdrop to close */}
            <div
              onClick={() => setAuthModalOpen(false)}
              style={{
                position: 'absolute',
                inset: 0,
                cursor: 'pointer',
              }}
            />
            <AuthPage />
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
