import { create } from 'zustand';
import type { ChatMessage, Conversation, ConversationListItem } from '@/types';
import { generateId } from '@/lib/utils';
import { streamChat, apiGet, apiDelete, apiPatch } from '@/lib/api';

interface ChatState {
  // Conversations list
  conversations: ConversationListItem[];
  activeConversationId: string | null;

  // Current chat messages
  messages: ChatMessage[];
  isStreaming: boolean;
  streamAbortController: AbortController | null;

  // Provider info for current stream
  activeProvider: string | null;
  activeModel: string | null;

  // Error state
  error: string | null;

  // Selected overrides
  selectedModelId: string;
  activePersona: any | null;

  // Actions
  loadConversations: () => Promise<void>;
  loadConversation: (id: string) => Promise<void>;
  newChat: () => void;
  sendMessage: (content: string, attachments?: File[], webSearch?: boolean, persona?: string) => void;
  stopStreaming: () => void;
  deleteConversation: (id: string) => Promise<void>;
  renameConversation: (id: string, title: string) => Promise<void>;
  pinConversation: (id: string, pinned: boolean) => Promise<void>;
  editMessage: (messageId: string, newContent: string) => void;
  regenerateLastResponse: () => void;
  clearError: () => void;
  setSelectedModelId: (id: string) => void;
  setActivePersona: (persona: any | null) => void;
}

export const useChatStore = create<ChatState>((set, get) => ({
  conversations: [],
  activeConversationId: null,
  messages: [],
  isStreaming: false,
  streamAbortController: null,
  activeProvider: null,
  activeModel: null,
  error: null,
  selectedModelId: 'auto',
  activePersona: null,


  loadConversations: async () => {
    try {
      const data = await apiGet<ConversationListItem[]>('/api/conversations');
      set({ conversations: data });
    } catch (err) {
      console.error('Failed to load conversations:', err);
    }
  },

  loadConversation: async (id: string) => {
    try {
      const data = await apiGet<Conversation>(`/api/conversations/${id}`);
      set({
        activeConversationId: id,
        messages: data.messages.map((m: any) => ({
          ...m,
          timestamp: new Date(m.createdAt ?? Date.now()).getTime(),
        })) as ChatMessage[],
      });
      // Persist the active conversation ID for session continuity
      if (typeof window !== 'undefined') {
        localStorage.setItem('aui_active_conversation', id);
      }
    } catch (err) {
      console.error('Failed to load conversation:', err);
    }
  },

  newChat: () => {
    const { streamAbortController } = get();
    if (streamAbortController) streamAbortController.abort();
    set({
      activeConversationId: null,
      messages: [],
      isStreaming: false,
      streamAbortController: null,
      activeProvider: null,
      activeModel: null,
      error: null,
    });
  },

  sendMessage: (content: string, _attachments?: File[], webSearch?: boolean, persona?: string) => {
    const { messages, activeConversationId, isStreaming, selectedModelId, activePersona } = get();
    if (isStreaming) return;

    const userMessage: ChatMessage = {
      id: generateId(),
      role: 'user',
      content,
      timestamp: Date.now(),
    };

    const assistantMessage: ChatMessage = {
      id: generateId(),
      role: 'assistant',
      content: '',
      timestamp: Date.now(),
      isStreaming: true,
    };

    const newMessages = [...messages, userMessage, assistantMessage];
    set({ messages: newMessages, isStreaming: true, error: null });

    const messagesToSend = newMessages
      .filter((m) => !m.isStreaming)
      .map((m) => ({
        id: m.id,
        role: m.role,
        content: m.content,
        timestamp: m.timestamp,
      }));

    const controller = streamChat(
      messagesToSend,
      activeConversationId ?? undefined,
      webSearch,
      {
        onConversation: (id) => {
          console.log('Stream: onConversation called with ID:', id);
          set({ activeConversationId: id });
        },
        onMeta: (provider, model) => {
          console.log('Stream: onMeta called:', provider, model);
          set({ activeProvider: provider, activeModel: model });
        },
        onSearching: (query) => {
          console.log('Stream: onSearching called:', query);
          const { messages: currentMessages } = get();
          const updated = [...currentMessages];
          const lastMsg = updated[updated.length - 1];
          if (lastMsg && lastMsg.role === 'assistant') {
            updated[updated.length - 1] = {
              ...lastMsg,
              isSearching: true,
              searchQuery: query,
            };
          }
          set({ messages: updated });
        },
        onSearchResults: (_results, _metadata) => {
          console.log('Stream: onSearchResults received');
          const { messages: currentMessages } = get();
          const updated = [...currentMessages];
          const lastMsg = updated[updated.length - 1];
          if (lastMsg && lastMsg.role === 'assistant') {
            updated[updated.length - 1] = {
              ...lastMsg,
              isSearching: false,
            };
          }
          set({ messages: updated });
        },
        onChunk: (text) => {
          const { messages: currentMessages } = get();
          console.log('Stream: onChunk called. Text length:', text.length, 'Current messages count:', currentMessages.length);
          const updated = [...currentMessages];
          const lastMsg = updated[updated.length - 1];
          if (lastMsg && lastMsg.role === 'assistant') {
            updated[updated.length - 1] = {
              ...lastMsg,
              content: lastMsg.content + text,
              isSearching: false,
            };
          } else {
            console.warn('Stream warning: Last message is not assistant message! Role is:', lastMsg?.role);
          }
          set({ messages: updated });
        },
        onDone: () => {
          console.log('Stream: onDone called');
          const { messages: currentMessages } = get();
          const updated = [...currentMessages];
          const lastMsg = updated[updated.length - 1];
          if (lastMsg && lastMsg.role === 'assistant') {
            updated[updated.length - 1] = {
              ...lastMsg,
              isStreaming: false,
              isSearching: false,
            };
          }
          set({
            messages: updated,
            isStreaming: false,
            streamAbortController: null,
          });
          // Refresh conversation list
          get().loadConversations();
        },
        onError: (error) => {
          console.error('Stream error callback:', error);
          set({
            error,
            isStreaming: false,
            streamAbortController: null,
          });
          // Remove the empty assistant message on error
          const { messages: currentMessages } = get();
          const filtered = currentMessages.filter(
            (m) => !(m.role === 'assistant' && m.content === '' && m.isStreaming),
          );
          set({ messages: filtered });
        },
      },
      persona || activePersona?.id,
      selectedModelId,
    );

    set({ streamAbortController: controller });
  },

  stopStreaming: () => {
    const { streamAbortController, messages } = get();
    if (streamAbortController) {
      streamAbortController.abort();
      const updated = messages.map((m) =>
        m.isStreaming ? { ...m, isStreaming: false } : m,
      );
      set({
        messages: updated,
        isStreaming: false,
        streamAbortController: null,
      });
    }
  },

  deleteConversation: async (id: string) => {
    try {
      await apiDelete(`/api/conversations/${id}`);
      const { conversations, activeConversationId } = get();
      set({
        conversations: conversations.filter((c) => c.id !== id),
        ...(activeConversationId === id
          ? { activeConversationId: null, messages: [] }
          : {}),
      });
    } catch (err) {
      console.error('Failed to delete conversation:', err);
    }
  },

  renameConversation: async (id: string, title: string) => {
    try {
      await apiPatch(`/api/conversations/${id}`, { title });
      const { conversations } = get();
      set({
        conversations: conversations.map((c) =>
          c.id === id ? { ...c, title } : c,
        ),
      });
    } catch (err) {
      console.error('Failed to rename conversation:', err);
    }
  },

  pinConversation: async (id: string, pinned: boolean) => {
    try {
      await apiPatch(`/api/conversations/${id}`, { pinned });
      const { conversations } = get();
      set({
        conversations: conversations.map((c) =>
          c.id === id ? { ...c, pinned } : c,
        ),
      });
    } catch (err) {
      console.error('Failed to pin conversation:', err);
    }
  },

  editMessage: (messageId: string, newContent: string) => {
    const { messages } = get();
    const msgIndex = messages.findIndex((m) => m.id === messageId);
    if (msgIndex === -1) return;

    // Remove all messages after the edited one
    const updated = messages.slice(0, msgIndex + 1);
    updated[msgIndex] = { ...updated[msgIndex], content: newContent };
    set({ messages: updated });

    // Re-send
    get().sendMessage(newContent);
  },

  regenerateLastResponse: () => {
    const { messages } = get();
    // Find the last user message
    const lastUserMsgIndex = messages
      .map((m, i) => ({ role: m.role, index: i }))
      .filter((m) => m.role === 'user')
      .pop()?.index;

    if (lastUserMsgIndex === undefined) return;

    // Remove assistant messages after the last user message
    const trimmed = messages.slice(0, lastUserMsgIndex + 1);
    const userContent = trimmed[lastUserMsgIndex].content;
    set({ messages: trimmed });

    // Re-send
    get().sendMessage(userContent);
  },

  clearError: () => set({ error: null }),
  setSelectedModelId: (id) => set({ selectedModelId: id }),
  setActivePersona: (persona) => set({ activePersona: persona }),
}));
