import { BaseProvider, type ChatOptions } from './base.js';
import type { ChatMessage, StreamChunk, TokenUsage, ModelConfig } from '../types/index.js';
import { logger } from '../services/logger.js';

/**
 * Groq – FREE tier (super fast inference)
 * Sign up: https://console.groq.com/keys
 * Free limits: 30 RPM / 15,000 TPM for Llama, 30 RPM / 15,000 TPM for Mixtral
 */

const GROQ_MODELS: ModelConfig[] = [
  {
    id: 'llama-3.3-70b-versatile',
    name: 'Llama 3.3 70B',
    contextWindow: 128000,
    maxOutputTokens: 32768,
    costPerInputToken: 0,
    costPerOutputToken: 0,
    supportsStreaming: true,
    supportsVision: false,
    supportsFunctions: true,
    tags: ['fast', 'reasoning', 'coding', 'creative', 'free'],
  },
  {
    id: 'llama-3.1-8b-instant',
    name: 'Llama 3.1 8B',
    contextWindow: 128000,
    maxOutputTokens: 8192,
    costPerInputToken: 0,
    costPerOutputToken: 0,
    supportsStreaming: true,
    supportsVision: false,
    supportsFunctions: true,
    tags: ['fast', 'general', 'free'],
  },
  {
    id: 'gemma2-9b-it',
    name: 'Gemma 2 9B',
    contextWindow: 8192,
    maxOutputTokens: 8192,
    costPerInputToken: 0,
    costPerOutputToken: 0,
    supportsStreaming: true,
    supportsVision: false,
    supportsFunctions: false,
    tags: ['fast', 'general', 'free'],
  },
  {
    id: 'mixtral-8x7b-32768',
    name: 'Mixtral 8x7B',
    contextWindow: 32768,
    maxOutputTokens: 32768,
    costPerInputToken: 0,
    costPerOutputToken: 0,
    supportsStreaming: true,
    supportsVision: false,
    supportsFunctions: false,
    tags: ['fast', 'coding', 'general', 'free'],
  },
];

export class GroqProvider extends BaseProvider {
  private baseUrl = 'https://api.groq.com/openai/v1';

  constructor(apiKey: string) {
    super('groq', 'Groq (Free)', apiKey, GROQ_MODELS);
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
      throw new Error(err.error?.message || `Groq API error: ${response.status}`);
    }

    const data = (await response.json()) as any;
    const content = data.choices?.[0]?.message?.content || '';
    const usage: TokenUsage | undefined = data.usage
      ? {
          promptTokens: data.usage.prompt_tokens,
          completionTokens: data.usage.completion_tokens,
          totalTokens: data.usage.total_tokens,
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
        throw new Error(err.error?.message || `Groq API error: ${response.status}`);
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
            const delta = parsed.choices?.[0]?.delta?.content;
            if (delta) {
              yield { type: 'text', content: delta };
            }
          } catch {
            // Skip malformed JSON
          }
        }
      }

      yield { type: 'done', content: '' };
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Unknown Groq error';
      logger.error(`Groq stream error: ${message}`);
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
