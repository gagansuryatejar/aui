import { BaseProvider, type ChatOptions } from './base.js';
import type { ChatMessage, StreamChunk, TokenUsage, ModelConfig } from '../types/index.js';
import { logger } from '../services/logger.js';

/**
 * ZenMux AI Provider
 * Unified OpenAI-compatible API gateway.
 * Website: https://zenmux.ai
 */

const ZENMUX_MODELS: ModelConfig[] = [
  {
    id: 'anthropic/claude-sonnet-5-free',
    name: 'Claude Sonnet 5 (Free)',
    contextWindow: 1000000,
    maxOutputTokens: 64000,
    costPerInputToken: 0,
    costPerOutputToken: 0,
    supportsStreaming: true,
    supportsVision: true,
    supportsFunctions: false,
    tags: ['reasoning', 'coding', 'general', 'free'],
  },
  {
    id: 'google/gemini-3.1-flash-lite-image-free',
    name: 'Nano Banana 2 Lite (Gemini 3.1)',
    contextWindow: 32768,
    maxOutputTokens: 8192,
    costPerInputToken: 0,
    costPerOutputToken: 0,
    supportsStreaming: true,
    supportsVision: true,
    supportsFunctions: false,
    tags: ['creative', 'free'],
  },
  {
    id: 'stepfun/step-3-7-flash-free',
    name: 'Step 3.7 Flash (Free)',
    contextWindow: 256000,
    maxOutputTokens: 256000,
    costPerInputToken: 0,
    costPerOutputToken: 0,
    supportsStreaming: true,
    supportsVision: true,
    supportsFunctions: false,
    tags: ['general', 'fast', 'free'],
  },
  {
    id: 'z-ai/glm-4.7-flash-free',
    name: 'GLM 4.7 Flash (Free)',
    contextWindow: 200000,
    maxOutputTokens: 128000,
    costPerInputToken: 0,
    costPerOutputToken: 0,
    supportsStreaming: true,
    supportsVision: false,
    supportsFunctions: false,
    tags: ['coding', 'fast', 'free'],
  },
];

export class ZenMuxProvider extends BaseProvider {
  private baseUrl = 'https://zenmux.ai/api/v1';

  constructor(apiKey: string) {
    super('zenmux', 'ZenMux (Free)', apiKey, ZENMUX_MODELS);
  }

  private formatMessages(messages: ChatMessage[]) {
    return messages.map((m) => ({
      role: m.role as 'system' | 'user' | 'assistant',
      content: m.content,
    }));
  }

  async chat(
    messages: ChatMessage[],
    modelId: string,
    options?: ChatOptions,
  ): Promise<{ content: string; usage?: TokenUsage }> {
    const response = await fetch(`${this.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        model: modelId,
        messages: this.formatMessages(messages),
        temperature: options?.temperature ?? 0.7,
        max_tokens: options?.maxTokens ?? 4096,
        top_p: options?.topP,
        stop: options?.stop,
        stream: false,
      }),
      signal: options?.signal,
    });

    if (!response.ok) {
      const err = (await response.json().catch(() => ({}))) as any;
      const errMsg = err.error?.message || `ZenMux API error: ${response.status}`;
      throw new Error(errMsg);
    }

    const data = (await response.json()) as any;
    const content = data.choices?.[0]?.message?.content || '';
    const usage: TokenUsage | undefined = data.usage
      ? {
          promptTokens: data.usage.prompt_tokens ?? 0,
          completionTokens: data.usage.completion_tokens ?? 0,
          totalTokens: data.usage.total_tokens ?? 0,
        }
      : undefined;

    return { content, usage };
  }

  async *chatStream(
    messages: ChatMessage[],
    modelId: string,
    options?: ChatOptions,
  ): AsyncGenerator<StreamChunk> {
    try {
      const response = await fetch(`${this.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          model: modelId,
          messages: this.formatMessages(messages),
          temperature: options?.temperature ?? 0.7,
          max_tokens: options?.maxTokens ?? 4096,
          top_p: options?.topP,
          stop: options?.stop,
          stream: true,
        }),
        signal: options?.signal,
      });

      if (!response.ok) {
        const err = (await response.json().catch(() => ({}))) as any;
        throw new Error(err.error?.message || `ZenMux API error: ${response.status}`);
      }

      const reader = response.body?.getReader();
      if (!reader) throw new Error('No response body');

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
          if (!trimmed.startsWith('data: ')) continue;
          const data = trimmed.slice(6);
          if (data === '[DONE]') continue;

          try {
            const parsed = JSON.parse(data);

            if (parsed.error) {
              throw new Error(parsed.error.message || 'ZenMux stream error');
            }

            const delta = parsed.choices?.[0]?.delta?.content;
            if (delta) {
              yield { type: 'text', content: delta };
            }
          } catch (e) {
            if (e instanceof Error && e.message.includes('ZenMux')) throw e;
          }
        }
      }

      yield { type: 'done', content: '' };
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Unknown ZenMux error';
      logger.error(`ZenMux stream error: ${message}`);
      yield { type: 'error', content: message };
    }
  }

  async healthCheck(): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/models`, {
        headers: { Authorization: `Bearer ${this.apiKey}` },
      });
      return response.ok;
    } catch {
      return false;
    }
  }
}
