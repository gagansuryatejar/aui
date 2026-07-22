import { BaseProvider, type ChatOptions } from './base.js';
import type { ChatMessage, StreamChunk, TokenUsage, ModelConfig } from '../types/index.js';
import { logger } from '../services/logger.js';

/**
 * Lyzr AI Agent Provider
 *
 * Connects to Lyzr Studio agents via their official v3 REST API.
 * Each Lyzr agent is registered as a separate model entry, making it
 * easy to add more agents later by appending to LYZR_MODELS.
 *
 * API Docs: https://docs.lyzr.ai
 * Endpoints:
 *   - Non-streaming: POST /v3/inference/chat/
 *   - Streaming:     POST /v3/inference/stream/
 */

const LYZR_BASE_URL = 'https://agent-prod.studio.lyzr.ai';

interface LyzrAgentConfig {
  agentId: string;
  userId: string;
}

function buildLyzrModels(agentId: string): ModelConfig[] {
  return [
    {
      id: `lyzr-aui-3.0-ultra`,
      name: 'AUI 3.0 Ultra (Lyzr)',
      contextWindow: 128000,
      maxOutputTokens: 16384,
      costPerInputToken: 0,
      costPerOutputToken: 0,
      supportsStreaming: true,
      supportsVision: false,
      supportsFunctions: false,
      tags: ['lyzr', 'agent', 'general', 'reasoning', 'coding', 'creative'],
    },
  ];
}

export class LyzrProvider extends BaseProvider {
  private agentConfig: LyzrAgentConfig;

  constructor(apiKey: string, agentId: string, userId: string) {
    super('lyzr', 'AUI 3.0 Ultra (Lyzr)', apiKey, buildLyzrModels(agentId));
    this.agentConfig = { agentId, userId };
  }

  /**
   * Generate a unique session ID for each conversation turn.
   * Lyzr uses session IDs to maintain conversation context.
   */
  private generateSessionId(): string {
    const rand = Math.random().toString(36).substring(2, 10);
    return `${this.agentConfig.agentId}-${rand}`;
  }

  /**
   * Non-streaming chat via /v3/inference/chat/
   * Response format: { "response": "..." }
   */
  async chat(
    messages: ChatMessage[],
    _modelId: string,
    options?: ChatOptions,
  ): Promise<{ content: string; usage?: TokenUsage }> {
    // Extract the last user message as the prompt for Lyzr
    const lastUserMsg = messages.filter((m) => m.role === 'user').pop();
    const prompt = lastUserMsg?.content || '';

    // Build system context from system messages if present
    const systemMsgs = messages.filter((m) => m.role === 'system');
    const fullPrompt = systemMsgs.length > 0
      ? `[System Context]\n${systemMsgs.map((m) => m.content).join('\n')}\n\n[User Message]\n${prompt}`
      : prompt;

    const response = await fetch(`${LYZR_BASE_URL}/v3/inference/chat/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': this.apiKey,
      },
      body: JSON.stringify({
        user_id: this.agentConfig.userId,
        agent_id: this.agentConfig.agentId,
        session_id: this.generateSessionId(),
        message: fullPrompt,
      }),
      signal: options?.signal,
    });

    if (!response.ok) {
      const err = (await response.json().catch(() => ({}))) as any;
      throw new Error(
        err.detail || err.error || err.message || `Lyzr API error: ${response.status}`,
      );
    }

    const data = (await response.json()) as any;
    const content = data.response || data.message || '';

    return { content };
  }

  /**
   * Streaming chat via /v3/inference/stream/
   * Falls back to non-streaming + simulated chunking if the stream endpoint fails.
   */
  async *chatStream(
    messages: ChatMessage[],
    modelId: string,
    options?: ChatOptions,
  ): AsyncGenerator<StreamChunk> {
    const lastUserMsg = messages.filter((m) => m.role === 'user').pop();
    const prompt = lastUserMsg?.content || '';

    const systemMsgs = messages.filter((m) => m.role === 'system');
    const fullPrompt = systemMsgs.length > 0
      ? `[System Context]\n${systemMsgs.map((m) => m.content).join('\n')}\n\n[User Message]\n${prompt}`
      : prompt;

    const sessionId = this.generateSessionId();

    try {
      // Try the streaming endpoint first
      const response = await fetch(`${LYZR_BASE_URL}/v3/inference/stream/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': this.apiKey,
        },
        body: JSON.stringify({
          user_id: this.agentConfig.userId,
          agent_id: this.agentConfig.agentId,
          session_id: sessionId,
          message: fullPrompt,
        }),
        signal: options?.signal,
      });

      if (!response.ok) {
        // If streaming endpoint returns error, fall back to non-streaming
        throw new Error(`Stream endpoint returned ${response.status}`);
      }

      const reader = response.body?.getReader();
      if (!reader) throw new Error('No response body from Lyzr stream');

      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          const trimmed = line.trim();

          // Handle SSE format: data: {...}
          if (trimmed.startsWith('data: ')) {
            const data = trimmed.slice(6);
            if (data === '[DONE]') continue;

            try {
              const parsed = JSON.parse(data);
              // Lyzr streaming may return various event types
              const text =
                parsed.response ||
                parsed.content ||
                parsed.message ||
                parsed.delta?.content ||
                parsed.text ||
                '';
              if (text) {
                yield { type: 'text', content: text };
              }
            } catch {
              // If the line is plain text (not JSON), yield it directly
              if (data.length > 0 && data !== '[DONE]') {
                yield { type: 'text', content: data };
              }
            }
          } else if (trimmed.length > 0 && !trimmed.startsWith(':')) {
            // Some Lyzr streams may send raw text without SSE prefix
            try {
              const parsed = JSON.parse(trimmed);
              const text = parsed.response || parsed.content || parsed.message || '';
              if (text) {
                yield { type: 'text', content: text };
              }
            } catch {
              // Raw text chunk
              yield { type: 'text', content: trimmed };
            }
          }
        }
      }

      yield { type: 'done', content: '' };
    } catch (streamError: unknown) {
      const streamMsg = streamError instanceof Error ? streamError.message : String(streamError);
      logger.warn(`Lyzr stream fallback: ${streamMsg}. Using non-streaming + chunked output.`);

      // Fallback: use non-streaming endpoint and simulate streaming
      try {
        const result = await this.chat(messages, modelId, options);
        const text = result.content;

        // Simulate streaming by yielding text in small chunks
        const chunkSize = 12;
        for (let i = 0; i < text.length; i += chunkSize) {
          yield { type: 'text', content: text.slice(i, i + chunkSize) };
          await new Promise((r) => setTimeout(r, 15));
        }

        yield { type: 'done', content: '' };
      } catch (fallbackError: unknown) {
        const message =
          fallbackError instanceof Error ? fallbackError.message : 'Unknown Lyzr error';
        logger.error(`Lyzr chat error: ${message}`);
        yield { type: 'error', content: message };
      }
    }
  }

  /**
   * Health check: send a lightweight ping to verify the agent is reachable.
   */
  async healthCheck(): Promise<boolean> {
    try {
      const response = await fetch(`${LYZR_BASE_URL}/v3/inference/chat/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': this.apiKey,
        },
        body: JSON.stringify({
          user_id: this.agentConfig.userId,
          agent_id: this.agentConfig.agentId,
          session_id: this.generateSessionId(),
          message: 'ping',
        }),
      });
      return response.ok;
    } catch {
      return false;
    }
  }
}
