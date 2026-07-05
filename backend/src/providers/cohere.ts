import { BaseProvider, type ChatOptions } from './base.js';
import type { ChatMessage, StreamChunk, TokenUsage, ModelConfig } from '../types/index.js';
import { logger } from '../services/logger.js';

const COHERE_MODELS: ModelConfig[] = [
  {
    id: 'command-r',
    name: 'Command R (Cohere)',
    contextWindow: 128000,
    maxOutputTokens: 4096,
    costPerInputToken: 0,
    costPerOutputToken: 0,
    supportsStreaming: true,
    supportsVision: false,
    supportsFunctions: false,
    tags: ['general', 'creative', 'free'],
  },
  {
    id: 'command-r-plus',
    name: 'Command R+ (Cohere)',
    contextWindow: 128000,
    maxOutputTokens: 4096,
    costPerInputToken: 0,
    costPerOutputToken: 0,
    supportsStreaming: true,
    supportsVision: false,
    supportsFunctions: false,
    tags: ['reasoning', 'creative', 'coding', 'free'],
  },
];

export class CohereProvider extends BaseProvider {
  private baseUrl = 'https://api.cohere.com/v1';

  constructor(apiKey: string) {
    super('cohere', 'Cohere', apiKey, COHERE_MODELS);
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
      throw new Error(err.message || `Cohere API error: ${response.status}`);
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
        throw new Error(err.message || `Cohere API error: ${response.status}`);
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
      const message = error instanceof Error ? error.message : 'Unknown Cohere error';
      logger.error(`Cohere stream error: ${message}`);
      yield { type: 'error', content: message };
    }
  }

  async healthCheck(): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          model: 'command-r',
          messages: [{ role: 'user', content: 'hello' }],
          max_tokens: 1,
        }),
      });
      return response.ok;
    } catch {
      return false;
    }
  }
}
