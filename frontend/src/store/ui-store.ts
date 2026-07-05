import { create } from 'zustand';
import type { Theme, User } from '@/types';

interface UIState {
  // Sidebar
  sidebarOpen: boolean;
  sidebarSearchQuery: string;

  // Theme
  theme: Theme;

  // Auth
  user: User | null;
  isAuthenticated: boolean;

  // Settings modal
  settingsOpen: boolean;

  // Mobile
  isMobile: boolean;

  // Web Search
  webSearchEnabled: boolean;

  // Auth modal
  authModalOpen: boolean;

  // Sandbox Live Preview
  previewOpen: boolean;

  // Actions
  toggleSidebar: () => void;
  setSidebarOpen: (open: boolean) => void;
  setSidebarSearch: (query: string) => void;
  setTheme: (theme: Theme) => void;
  setUser: (user: User | null) => void;
  logout: () => void;
  setSettingsOpen: (open: boolean) => void;
  setIsMobile: (mobile: boolean) => void;
  toggleWebSearch: () => void;
  setAuthModalOpen: (open: boolean) => void;
  setPreviewOpen: (open: boolean) => void;
}

function getInitialTheme(): Theme {
  if (typeof window === 'undefined') return 'dark';
  return (localStorage.getItem('aui_theme') as Theme) || 'dark';
}

function applyTheme(theme: Theme) {
  if (typeof window === 'undefined') return;

  const resolved =
    theme === 'system'
      ? window.matchMedia('(prefers-color-scheme: dark)').matches
        ? 'dark'
        : 'light'
      : theme;

  document.documentElement.setAttribute('data-theme', resolved);
  localStorage.setItem('aui_theme', theme);
}

export const useUIStore = create<UIState>((set) => ({
  sidebarOpen: true,
  sidebarSearchQuery: '',
  theme: 'dark',
  user: null,
  isAuthenticated: false,
  settingsOpen: false,
  isMobile: false,
  authModalOpen: false,
  previewOpen: false,
  webSearchEnabled: typeof window !== 'undefined'
    ? localStorage.getItem('aui_web_search') === 'true'
    : false,

  toggleSidebar: () =>
    set((state) => ({ sidebarOpen: !state.sidebarOpen })),

  setSidebarOpen: (open) => set({ sidebarOpen: open }),

  setSidebarSearch: (query) => set({ sidebarSearchQuery: query }),

  setTheme: (theme) => {
    applyTheme(theme);
    set({ theme });
  },

  setUser: (user) =>
    set({ user, isAuthenticated: !!user }),

  logout: () => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('aui_token');
      localStorage.removeItem('aui_active_conversation');
    }
    set({ user: null, isAuthenticated: false });
  },

  setSettingsOpen: (open) => set({ settingsOpen: open }),

  setIsMobile: (mobile) => set({ isMobile: mobile }),

  toggleWebSearch: () =>
    set((state) => {
      const newValue = !state.webSearchEnabled;
      if (typeof window !== 'undefined') {
        localStorage.setItem('aui_web_search', String(newValue));
      }
      return { webSearchEnabled: newValue };
    }),

  setAuthModalOpen: (open) => set({ authModalOpen: open }),

  setPreviewOpen: (open) => set({ previewOpen: open }),
}));

// Apply theme on load
if (typeof window !== 'undefined') {
  const theme = getInitialTheme();
  applyTheme(theme);
  // Update the store after it's created
  setTimeout(() => {
    useUIStore.getState().setTheme(theme);
  }, 0);
}
