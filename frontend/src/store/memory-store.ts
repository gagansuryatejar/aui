import { create } from 'zustand';
import type { Memory, MemoryStats, MemoryTimelineEntry } from '@/types';
import { apiGet, apiDelete } from '@/lib/api';

interface MemoryState {
  // Data
  memories: Memory[];
  stats: MemoryStats | null;
  timeline: MemoryTimelineEntry[];
  searchQuery: string;
  filterCategory: string;

  // UI
  panelOpen: boolean;
  loading: boolean;
  error: string | null;

  // Actions
  setPanelOpen: (open: boolean) => void;
  setSearchQuery: (query: string) => void;
  setFilterCategory: (category: string) => void;
  loadMemories: () => Promise<void>;
  loadStats: () => Promise<void>;
  loadTimeline: () => Promise<void>;
  deleteMemory: (id: string) => Promise<void>;
  clearAllMemories: () => Promise<void>;
  clearError: () => void;
}

export const useMemoryStore = create<MemoryState>((set, get) => ({
  memories: [],
  stats: null,
  timeline: [],
  searchQuery: '',
  filterCategory: '',
  panelOpen: false,
  loading: false,
  error: null,

  setPanelOpen: (open) => {
    set({ panelOpen: open });
    if (open) {
      // Load data when panel opens
      get().loadMemories();
      get().loadStats();
    }
  },

  setSearchQuery: (query) => {
    set({ searchQuery: query });
    get().loadMemories();
  },

  setFilterCategory: (category) => {
    set({ filterCategory: category });
    get().loadMemories();
  },

  loadMemories: async () => {
    const { searchQuery, filterCategory } = get();
    set({ loading: true, error: null });
    try {
      const params = new URLSearchParams();
      if (searchQuery) params.set('q', searchQuery);
      if (filterCategory) params.set('category', filterCategory);
      const queryString = params.toString();
      const path = `/api/memory${queryString ? `?${queryString}` : ''}`;
      const memories = await apiGet<Memory[]>(path);
      set({ memories, loading: false });
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to load memories';
      set({ error: msg, loading: false });
    }
  },

  loadStats: async () => {
    try {
      const stats = await apiGet<MemoryStats>('/api/memory/stats');
      set({ stats });
    } catch {
      // Non-critical
    }
  },

  loadTimeline: async () => {
    try {
      const timeline = await apiGet<MemoryTimelineEntry[]>('/api/memory/timeline');
      set({ timeline });
    } catch {
      // Non-critical
    }
  },

  deleteMemory: async (id: string) => {
    try {
      await apiDelete(`/api/memory/${id}`);
      const { memories } = get();
      set({ memories: memories.filter((m) => m.id !== id) });
      get().loadStats();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to delete memory';
      set({ error: msg });
    }
  },

  clearAllMemories: async () => {
    try {
      await apiDelete('/api/memory');
      set({ memories: [], stats: null, timeline: [] });
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to clear memories';
      set({ error: msg });
    }
  },

  clearError: () => set({ error: null }),
}));
