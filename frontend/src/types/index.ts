export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: number;
  attachments?: FileAttachment[];
  isStreaming?: boolean;
  isSearching?: boolean;
  searchQuery?: string;
  provider?: string;
  model?: string;
}

export interface FileAttachment {
  id: string;
  name: string;
  type: string;
  size: number;
  url: string;
  preview?: string;
}

export interface Conversation {
  id: string;
  title: string;
  pinned: boolean;
  folderId?: string | null;
  folder?: { id: string; name: string; color: string } | null;
  messages: ChatMessage[];
  createdAt: string;
  updatedAt: string;
}

export interface ConversationListItem {
  id: string;
  title: string;
  pinned: boolean;
  folderId?: string | null;
  folder?: { id: string; name: string; color: string } | null;
  messages?: Array<{ content: string; role: string; createdAt: string }>;
  createdAt: string;
  updatedAt: string;
}

export interface Folder {
  id: string;
  name: string;
  color: string;
  _count?: { conversations: number };
}

export interface User {
  id: string;
  email: string;
  name: string;
  avatarUrl?: string;
  role?: string;
}

export interface UserSettings {
  theme: 'light' | 'dark' | 'system';
  fontSize: number;
  sendOnEnter: boolean;
  streamResponses: boolean;
}

export type Theme = 'light' | 'dark' | 'system';

// ── Memory types ─────────────────────────────────────────────

export interface Memory {
  id: string;
  key: string;
  content: string;
  category: 'fact' | 'preference' | 'personality' | 'skill' | 'goal' | 'context';
  importance: number;
  source: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface MemoryStats {
  totalMemories: number;
  byCategory: Array<{ category: string; count: number }>;
  hasProfile: boolean;
  profile: UserProfileData | null;
}

export interface UserProfileData {
  communicationStyle: string;
  preferredResponseLength: string;
  expertiseAreas: string[];
  personalityTraits: string[];
}

export interface MemoryTimelineEntry {
  date: string;
  memories: Memory[];
}
