import { BaseProvider, type ChatOptions } from './base.js';
import type { ChatMessage, StreamChunk, TokenUsage, ModelConfig } from '../types/index.js';
import { logger } from '../services/logger.js';

const CLOUDFLARE_MODELS: ModelConfig[] = [
  {
    id: '@cf/meta/llama-3.1-8b-instruct',
    name: 'Llama 3.1 8B (Cloudflare)',
    contextWindow: 131072,
    maxOutputTokens: 2048,
    costPerInputToken: 0,
    costPerOutputToken: 0,
    supportsStreaming: true,
    supportsVision: false,
    supportsFunctions: false,
    tags: ['fast', 'general', 'free'],
  },
  {
    id: '@cf/qwen/qwen1.5-14b-chat',
    name: 'Qwen 1.5 14B (Cloudflare)',
    contextWindow: 8192,
    maxOutputTokens: 2048,
    costPerInputToken: 0,
    costPerOutputToken: 0,
    supportsStreaming: true,
    supportsVision: false,
    supportsFunctions: false,
    tags: ['general', 'free'],
  },
  {
    id: '@cf/mistral/mistral-7b-instruct-v0.1',
    name: 'Mistral 7B (Cloudflare)',
    contextWindow: 4096,
    maxOutputTokens: 2048,
    costPerInputToken: 0,
    costPerOutputToken: 0,
    supportsStreaming: true,
    supportsVision: false,
    supportsFunctions: false,
    tags: ['fast', 'general', 'free'],
  },
];

export class CloudflareProvider extends BaseProvider {
  private accountId: string | null = null;
  private resolvePromise: Promise<void> | null = null;

  constructor(apiKey: string) {
    super('cloudflare', 'Cloudflare Workers AI', apiKey, CLOUDFLARE_MODELS);
  }

  private async ensureAccountId(): Promise<string> {
    if (this.accountId) return this.accountId;

    if (!this.resolvePromise) {
      this.resolvePromise = (async () => {
        try {
          const res = await fetch('https://api.cloudflare.com/client/v4/accounts', {
            headers: {
              Authorization: `Bearer ${this.apiKey}`,
              'Content-Type': 'application/json',
            },
          });
          if (res.ok) {
            const data = await res.json() as any;
            if (data.result && data.result.length > 0) {
              this.accountId = data.result[0].id;
              logger.info(`☁️ Cloudflare Provider: Automatically resolved Account ID: ${this.accountId}`);
            }
          }
        } catch (err) {
          logger.error(`Failed to resolve Cloudflare account ID: ${err}`);
        }
      })();
    }

    await this.resolvePromise;

    if (!this.accountId) {
      throw new Error('Cloudflare Account ID could not be resolved from API Token');
    }
    return this.accountId;
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
    const accId = await this.ensureAccountId();
    const response = await fetch(`https://api.cloudflare.com/client/v4/accounts/${accId}/ai/v1/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        model: modelId,
        messages: this.formatMessages(messages),
        temperature: options?.temperature ?? 0.7,
        max_tokens: options?.maxTokens ?? 2048,
        top_p: options?.topP,
        stop: options?.stop,
        stream: false,
      }),
      signal: options?.signal,
    });

    if (!response.ok) {
      const err = (await response.json().catch(() => ({}))) as any;
      throw new Error(err.errors?.[0]?.message || err.message || `Cloudflare API error: ${response.status}`);
    }

    const data = (await response.json()) as any;
    const content = data.result?.choices?.[0]?.message?.content || data.choices?.[0]?.message?.content || '';
    const usage: TokenUsage | undefined = data.result?.usage || data.usage
      ? {
          promptTokens: (data.result?.usage || data.usage).prompt_tokens ?? 0,
          completionTokens: (data.result?.usage || data.usage).completion_tokens ?? 0,
          totalTokens: (data.result?.usage || data.usage).total_tokens ?? 0,
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
      const accId = await this.ensureAccountId();
      const response = await fetch(`https://api.cloudflare.com/client/v4/accounts/${accId}/ai/v1/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          model: modelId,
          messages: this.formatMessages(messages),
          temperature: options?.temperature ?? 0.7,
          max_tokens: options?.maxTokens ?? 2048,
          top_p: options?.topP,
          stop: options?.stop,
          stream: true,
        }),
        signal: options?.signal,
      });

      if (!response.ok) {
        const err = (await response.json().catch(() => ({}))) as any;
        throw new Error(err.errors?.[0]?.message || err.message || `Cloudflare API error: ${response.status}`);
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
      const message = error instanceof Error ? error.message : 'Unknown Cloudflare error';
      logger.error(`Cloudflare stream error: ${message}`);
      yield { type: 'error', content: message };
    }
  }

  async healthCheck(): Promise<boolean> {
    try {
      const accId = await this.ensureAccountId();
      return !!accId;
    } catch {
      return false;
    }
  }
}
