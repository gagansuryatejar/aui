'use client';

import { useEffect } from 'react';
import { useChatStore } from '@/store/chat-store';
import { useUIStore } from '@/store/ui-store';

export function useKeyboardShortcuts() {
  const { newChat, stopStreaming, isStreaming } = useChatStore();
  const { toggleSidebar, setSettingsOpen, settingsOpen, theme, setTheme, setSidebarSearch } =
    useUIStore();

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      const isCtrl = e.ctrlKey || e.metaKey;

      // Ctrl+N – New chat
      if (isCtrl && e.key === 'n') {
        e.preventDefault();
        newChat();
      }

      // Ctrl+B – Toggle sidebar
      if (isCtrl && e.key === 'b') {
        e.preventDefault();
        toggleSidebar();
      }

      // Ctrl+K – Focus search
      if (isCtrl && e.key === 'k') {
        e.preventDefault();
        // Focus the sidebar search input
        const searchInput = document.querySelector(
          'input[placeholder="Search chats…"]',
        ) as HTMLInputElement | null;
        searchInput?.focus();
      }

      // Ctrl+D – Toggle dark mode
      if (isCtrl && e.key === 'd') {
        e.preventDefault();
        setTheme(theme === 'dark' ? 'light' : 'dark');
      }

      // Ctrl+, – Open settings
      if (isCtrl && e.key === ',') {
        e.preventDefault();
        setSettingsOpen(!settingsOpen);
      }

      // Escape – Stop streaming or close settings
      if (e.key === 'Escape') {
        if (isStreaming) {
          stopStreaming();
        } else if (settingsOpen) {
          setSettingsOpen(false);
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    newChat,
    stopStreaming,
    isStreaming,
    toggleSidebar,
    setSettingsOpen,
    settingsOpen,
    theme,
    setTheme,
    setSidebarSearch,
  ]);
}
