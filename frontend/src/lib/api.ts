const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

function getAuthHeaders(): Record<string, string> {
  if (typeof window === 'undefined') return {};
  const token = localStorage.getItem('aui_token');
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export async function apiGet<T>(path: string): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    headers: { ...getAuthHeaders() },
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || `API error: ${res.status}`);
  }
  const json = await res.json();
  return json.data ?? json;
}

export async function apiPost<T>(path: string, data?: unknown): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...getAuthHeaders(),
    },
    body: data ? JSON.stringify(data) : undefined,
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || `API error: ${res.status}`);
  }
  const json = await res.json();
  return json.data ?? json;
}

export async function apiPatch<T>(path: string, data?: unknown): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      ...getAuthHeaders(),
    },
    body: data ? JSON.stringify(data) : undefined,
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || `API error: ${res.status}`);
  }
  const json = await res.json();
  return json.data ?? json;
}

export async function apiDelete(path: string): Promise<void> {
  const res = await fetch(`${API_URL}${path}`, {
    method: 'DELETE',
    headers: { ...getAuthHeaders() },
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || `API error: ${res.status}`);
  }
}

/**
 * Stream chat responses via SSE.
 * Calls `onChunk` for each text chunk, `onMeta` for provider metadata,
 * `onSearching` when web search starts, `onSearchResults` when results arrive,
 * and `onDone` when the stream ends.
 */
export function streamChat(
  messages: Array<{ id: string; role: string; content: string; timestamp: number }>,
  conversationId?: string,
  webSearch?: boolean,
  callbacks?: {
    onConversation?: (id: string) => void;
    onMeta?: (provider: string, model: string) => void;
    onSearching?: (query: string) => void;
    onSearchResults?: (results: string, metadata: Record<string, unknown>) => void;
    onChunk?: (text: string) => void;
    onDone?: () => void;
    onError?: (error: string) => void;
  },
): AbortController {
  const controller = new AbortController();

  (async () => {
    try {
      const res = await fetch(`${API_URL}/api/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeaders(),
        },
        body: JSON.stringify({ conversationId, messages, webSearch: !!webSearch }),
        signal: controller.signal,
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        callbacks?.onError?.(body.error || `API error: ${res.status}`);
        return;
      }

      const reader = res.body?.getReader();
      if (!reader) {
        callbacks?.onError?.('No response body');
        return;
      }

      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          const data = line.slice(6).trim();
          if (!data) continue;

          try {
            const parsed = JSON.parse(data);

            switch (parsed.type) {
              case 'conversation':
                callbacks?.onConversation?.(parsed.conversationId);
                break;
              case 'metadata':
                callbacks?.onMeta?.(parsed.provider, parsed.model);
                break;
              case 'searching':
                callbacks?.onSearching?.(parsed.query);
                break;
              case 'search_results':
                callbacks?.onSearchResults?.(parsed.results, parsed.metadata || {});
                break;
              case 'text':
                callbacks?.onChunk?.(parsed.content);
                break;
              case 'done':
                callbacks?.onDone?.();
                break;
              case 'error':
                callbacks?.onError?.(parsed.content);
                break;
            }
          } catch {
            // Skip malformed JSON lines
          }
        }
      }

      callbacks?.onDone?.();
    } catch (err: unknown) {
      if (err instanceof Error && err.name === 'AbortError') return;
      callbacks?.onError?.(err instanceof Error ? err.message : 'Stream error');
    }
  })();

  return controller;
}
