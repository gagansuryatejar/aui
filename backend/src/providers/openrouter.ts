import { BaseProvider, type ChatOptions } from './base.js';
import type { ChatMessage, StreamChunk, TokenUsage, ModelConfig } from '../types/index.js';
import { logger } from '../services/logger.js';

/**
 * OpenRouter – FREE models
 * Sign up: https://openrouter.ai/keys
 * These models are completely free on OpenRouter.
 */

const OPENROUTER_MODELS: ModelConfig[] = [
  // ── Heavy hitters (reasoning / coding) ──────────────
  {
    id: 'nvidia/nemotron-3-ultra:free',
    name: 'Nemotron 3 Ultra',
    contextWindow: 32768,
    maxOutputTokens: 8192,
    costPerInputToken: 0,
    costPerOutputToken: 0,
    supportsStreaming: true,
    supportsVision: false,
    supportsFunctions: false,
    tags: ['reasoning', 'coding', 'creative', 'free'],
  },
  {
    id: 'nousresearch/hermes-3-llama-3.1-405b:free',
    name: 'Hermes 3 405B Instruct',
    contextWindow: 16384,
    maxOutputTokens: 8192,
    costPerInputToken: 0,
    costPerOutputToken: 0,
    supportsStreaming: true,
    supportsVision: false,
    supportsFunctions: false,
    tags: ['reasoning', 'creative', 'general', 'free'],
  },
  {
    id: 'qwen/qwen3-coder-480b-a35b:free',
    name: 'Qwen3 Coder 480B',
    contextWindow: 65536,
    maxOutputTokens: 16384,
    costPerInputToken: 0,
    costPerOutputToken: 0,
    supportsStreaming: true,
    supportsVision: false,
    supportsFunctions: false,
    tags: ['coding', 'reasoning', 'free'],
  },
  {
    id: 'qwen/qwen3-next-80b-a3b-instruct:free',
    name: 'Qwen3 Next 80B',
    contextWindow: 32768,
    maxOutputTokens: 8192,
    costPerInputToken: 0,
    costPerOutputToken: 0,
    supportsStreaming: true,
    supportsVision: false,
    supportsFunctions: false,
    tags: ['general', 'reasoning', 'coding', 'free'],
  },
  {
    id: 'gpt-oss/gpt-oss-120b:free',
    name: 'GPT-OSS 120B',
    contextWindow: 32768,
    maxOutputTokens: 8192,
    costPerInputToken: 0,
    costPerOutputToken: 0,
    supportsStreaming: true,
    supportsVision: false,
    supportsFunctions: false,
    tags: ['general', 'reasoning', 'creative', 'free'],
  },
  {
    id: 'meta-llama/llama-3.3-70b-instruct:free',
    name: 'Llama 3.3 70B Instruct',
    contextWindow: 131072,
    maxOutputTokens: 8192,
    costPerInputToken: 0,
    costPerOutputToken: 0,
    supportsStreaming: true,
    supportsVision: false,
    supportsFunctions: false,
    tags: ['general', 'reasoning', 'coding', 'free'],
  },
  // ── Mid-range ───────────────────────────────────────
  {
    id: 'nvidia/nemotron-3-super:free',
    name: 'Nemotron 3 Super',
    contextWindow: 32768,
    maxOutputTokens: 8192,
    costPerInputToken: 0,
    costPerOutputToken: 0,
    supportsStreaming: true,
    supportsVision: false,
    supportsFunctions: false,
    tags: ['general', 'reasoning', 'free'],
  },
  {
    id: 'google/gemma-4-31b:free',
    name: 'Gemma 4 31B',
    contextWindow: 32768,
    maxOutputTokens: 8192,
    costPerInputToken: 0,
    costPerOutputToken: 0,
    supportsStreaming: true,
    supportsVision: false,
    supportsFunctions: false,
    tags: ['general', 'coding', 'free'],
  },
  {
    id: 'google/gemma-4-26b-a4b:free',
    name: 'Gemma 4 26B',
    contextWindow: 32768,
    maxOutputTokens: 8192,
    costPerInputToken: 0,
    costPerOutputToken: 0,
    supportsStreaming: true,
    supportsVision: false,
    supportsFunctions: false,
    tags: ['fast', 'general', 'free'],
  },
  {
    id: 'gpt-oss/gpt-oss-20b:free',
    name: 'GPT-OSS 20B',
    contextWindow: 32768,
    maxOutputTokens: 8192,
    costPerInputToken: 0,
    costPerOutputToken: 0,
    supportsStreaming: true,
    supportsVision: false,
    supportsFunctions: false,
    tags: ['fast', 'general', 'free'],
  },
  {
    id: 'thedrummer/north-mini-code:free',
    name: 'North Mini Code',
    contextWindow: 32768,
    maxOutputTokens: 8192,
    costPerInputToken: 0,
    costPerOutputToken: 0,
    supportsStreaming: true,
    supportsVision: false,
    supportsFunctions: false,
    tags: ['coding', 'fast', 'free'],
  },
  // ── Vision / Multimodal ─────────────────────────────
  {
    id: 'nvidia/nemotron-3-nano-omni-30b-a3b-reasoning:free',
    name: 'Nemotron 3 Nano Omni Reasoning',
    contextWindow: 262144,
    maxOutputTokens: 8192,
    costPerInputToken: 0,
    costPerOutputToken: 0,
    supportsStreaming: true,
    supportsVision: true,
    supportsFunctions: false,
    tags: ['reasoning', 'vision', 'free'],
  },
  {
    id: 'nvidia/llama-nemotron-rerank-vl-1b-v2:free',
    name: 'Llama Nemotron Rerank VL 1B',
    contextWindow: 10240,
    maxOutputTokens: 4096,
    costPerInputToken: 0,
    costPerOutputToken: 0,
    supportsStreaming: true,
    supportsVision: true,
    supportsFunctions: false,
    tags: ['vision', 'fast', 'free'],
  },
  {
    id: 'nvidia/nemotron-3-nano-omni:free',
    name: 'Nemotron 3 Nano Omni',
    contextWindow: 32768,
    maxOutputTokens: 8192,
    costPerInputToken: 0,
    costPerOutputToken: 0,
    supportsStreaming: true,
    supportsVision: true,
    supportsFunctions: false,
    tags: ['vision', 'general', 'free'],
  },
  {
    id: 'nvidia/nemotron-nano-12b-2-vl:free',
    name: 'Nemotron Nano 12B VL',
    contextWindow: 32768,
    maxOutputTokens: 8192,
    costPerInputToken: 0,
    costPerOutputToken: 0,
    supportsStreaming: true,
    supportsVision: true,
    supportsFunctions: false,
    tags: ['vision', 'fast', 'free'],
  },
  // ── Small / fast fallbacks ──────────────────────────
  {
    id: 'nvidia/nemotron-3-nano-30b-a3b:free',
    name: 'Nemotron 3 Nano 30B',
    contextWindow: 32768,
    maxOutputTokens: 8192,
    costPerInputToken: 0,
    costPerOutputToken: 0,
    supportsStreaming: true,
    supportsVision: false,
    supportsFunctions: false,
    tags: ['fast', 'general', 'free'],
  },
  {
    id: 'nvidia/nemotron-nano-9b-v2:free',
    name: 'Nemotron Nano 9B',
    contextWindow: 32768,
    maxOutputTokens: 8192,
    costPerInputToken: 0,
    costPerOutputToken: 0,
    supportsStreaming: true,
    supportsVision: false,
    supportsFunctions: false,
    tags: ['fast', 'general', 'free'],
  },
  {
    id: 'meta-llama/llama-3.2-3b-instruct:free',
    name: 'Llama 3.2 3B Instruct',
    contextWindow: 131072,
    maxOutputTokens: 8192,
    costPerInputToken: 0,
    costPerOutputToken: 0,
    supportsStreaming: true,
    supportsVision: false,
    supportsFunctions: false,
    tags: ['fast', 'general', 'free'],
  },
  {
    id: 'caldera/laguna-m-1:free',
    name: 'Laguna M.1',
    contextWindow: 32768,
    maxOutputTokens: 8192,
    costPerInputToken: 0,
    costPerOutputToken: 0,
    supportsStreaming: true,
    supportsVision: false,
    supportsFunctions: false,
    tags: ['general', 'creative', 'free'],
  },
  {
    id: 'caldera/laguna-xs-2:free',
    name: 'Laguna XS.2',
    contextWindow: 32768,
    maxOutputTokens: 8192,
    costPerInputToken: 0,
    costPerOutputToken: 0,
    supportsStreaming: true,
    supportsVision: false,
    supportsFunctions: false,
    tags: ['fast', 'general', 'free'],
  },
  {
    id: 'liquid/lfm2-5-1-2b-thinking:free',
    name: 'LFM2.5 Thinking',
    contextWindow: 32768,
    maxOutputTokens: 8192,
    costPerInputToken: 0,
    costPerOutputToken: 0,
    supportsStreaming: true,
    supportsVision: false,
    supportsFunctions: false,
    tags: ['reasoning', 'fast', 'free'],
  },
  // ── Additional free models ──────────────────────────
  {
    id: 'deepseek/deepseek-r2:free',
    name: 'DeepSeek R2',
    contextWindow: 163840,
    maxOutputTokens: 8192,
    costPerInputToken: 0,
    costPerOutputToken: 0,
    supportsStreaming: true,
    supportsVision: false,
    supportsFunctions: false,
    tags: ['reasoning', 'coding', 'free'],
  },
  {
    id: 'deepseek/deepseek-chat-v3-0324:free',
    name: 'DeepSeek Chat V3',
    contextWindow: 131072,
    maxOutputTokens: 8192,
    costPerInputToken: 0,
    costPerOutputToken: 0,
    supportsStreaming: true,
    supportsVision: false,
    supportsFunctions: false,
    tags: ['general', 'coding', 'reasoning', 'free'],
  },
  {
    id: 'microsoft/phi-4-reasoning:free',
    name: 'Phi-4 Reasoning',
    contextWindow: 32768,
    maxOutputTokens: 8192,
    costPerInputToken: 0,
    costPerOutputToken: 0,
    supportsStreaming: true,
    supportsVision: false,
    supportsFunctions: false,
    tags: ['reasoning', 'fast', 'free'],
  },
  {
    id: 'mistralai/mistral-nemo:free',
    name: 'Mistral Nemo',
    contextWindow: 131072,
    maxOutputTokens: 4096,
    costPerInputToken: 0,
    costPerOutputToken: 0,
    supportsStreaming: true,
    supportsVision: false,
    supportsFunctions: false,
    tags: ['general', 'creative', 'free'],
  },
  {
    id: 'mistralai/mistral-7b-instruct:free',
    name: 'Mistral 7B Instruct',
    contextWindow: 32768,
    maxOutputTokens: 4096,
    costPerInputToken: 0,
    costPerOutputToken: 0,
    supportsStreaming: true,
    supportsVision: false,
    supportsFunctions: false,
    tags: ['fast', 'general', 'free'],
  },
  {
    id: 'qwen/qwen-2.5-72b-instruct:free',
    name: 'Qwen 2.5 72B Instruct',
    contextWindow: 32768,
    maxOutputTokens: 8192,
    costPerInputToken: 0,
    costPerOutputToken: 0,
    supportsStreaming: true,
    supportsVision: false,
    supportsFunctions: false,
    tags: ['general', 'coding', 'reasoning', 'free'],
  },
  {
    id: 'qwen/qwen-2.5-coder-32b-instruct:free',
    name: 'Qwen 2.5 Coder 32B',
    contextWindow: 32768,
    maxOutputTokens: 8192,
    costPerInputToken: 0,
    costPerOutputToken: 0,
    supportsStreaming: true,
    supportsVision: false,
    supportsFunctions: false,
    tags: ['coding', 'free'],
  },
  {
    id: 'google/gemma-2-9b-it:free',
    name: 'Gemma 2 9B',
    contextWindow: 8192,
    maxOutputTokens: 4096,
    costPerInputToken: 0,
    costPerOutputToken: 0,
    supportsStreaming: true,
    supportsVision: false,
    supportsFunctions: false,
    tags: ['fast', 'general', 'free'],
  },
  {
    id: 'google/gemma-2-27b-it:free',
    name: 'Gemma 2 27B',
    contextWindow: 8192,
    maxOutputTokens: 4096,
    costPerInputToken: 0,
    costPerOutputToken: 0,
    supportsStreaming: true,
    supportsVision: false,
    supportsFunctions: false,
    tags: ['general', 'reasoning', 'free'],
  },
  {
    id: 'tngtech/deepseek-r1t2-chimera:free',
    name: 'DeepSeek R1T2 Chimera',
    contextWindow: 163840,
    maxOutputTokens: 8192,
    costPerInputToken: 0,
    costPerOutputToken: 0,
    supportsStreaming: true,
    supportsVision: false,
    supportsFunctions: false,
    tags: ['reasoning', 'coding', 'free'],
  },
  {
    id: 'openchat/openchat-3.5-0106:free',
    name: 'OpenChat 3.5',
    contextWindow: 8192,
    maxOutputTokens: 4096,
    costPerInputToken: 0,
    costPerOutputToken: 0,
    supportsStreaming: true,
    supportsVision: false,
    supportsFunctions: false,
    tags: ['general', 'fast', 'free'],
  },
];


export class OpenRouterProvider extends BaseProvider {
  private baseUrl = 'https://openrouter.ai/api/v1';

  constructor(apiKey: string) {
    super('openrouter', 'OpenRouter (Free)', apiKey, OPENROUTER_MODELS);
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
        'HTTP-Referer': 'https://aui-chat.vercel.app',
        'X-Title': 'AUI Chat',
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
      const errMsg = err.error?.message || `OpenRouter API error: ${response.status}`;
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
          'HTTP-Referer': 'https://aui-chat.vercel.app',
          'X-Title': 'AUI Chat',
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
        throw new Error(err.error?.message || `OpenRouter API error: ${response.status}`);
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

            // Check for OpenRouter-specific error in stream
            if (parsed.error) {
              throw new Error(parsed.error.message || 'OpenRouter stream error');
            }

            const delta = parsed.choices?.[0]?.delta?.content;
            if (delta) {
              yield { type: 'text', content: delta };
            }
          } catch (e) {
            if (e instanceof Error && e.message.includes('OpenRouter')) throw e;
            // Skip malformed JSON
          }
        }
      }

      yield { type: 'done', content: '' };
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Unknown OpenRouter error';
      logger.error(`OpenRouter stream error: ${message}`);
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
