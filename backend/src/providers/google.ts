import { GoogleGenerativeAI, type GenerateContentStreamResult } from '@google/generative-ai';
import { BaseProvider, type ChatOptions } from './base.js';
import type { ChatMessage, StreamChunk, TokenUsage, ModelConfig } from '../types/index.js';
import { logger } from '../services/logger.js';

/**
 * Google Gemini – FREE tier
 * Sign up: https://aistudio.google.com/apikey
 * Free limits: 15 RPM / 1M TPM / 1500 RPD for Flash
 */

const GOOGLE_MODELS: ModelConfig[] = [
  {
    id: 'gemini-2.5-flash',
    name: 'Gemini 2.5 Flash',
    contextWindow: 1048576,
    maxOutputTokens: 8192,
    costPerInputToken: 0,
    costPerOutputToken: 0,
    supportsStreaming: true,
    supportsVision: true,
    supportsFunctions: true,
    tags: ['fast', 'general', 'coding', 'reasoning', 'vision', 'free'],
  },
  {
    id: 'gemini-2.5-pro',
    name: 'Gemini 2.5 Pro',
    contextWindow: 1048576,
    maxOutputTokens: 8192,
    costPerInputToken: 0,
    costPerOutputToken: 0,
    supportsStreaming: true,
    supportsVision: true,
    supportsFunctions: true,
    tags: ['reasoning', 'coding', 'creative', 'vision', 'free'],
  },
  {
    id: 'gemini-2.0-flash',
    name: 'Gemini 2.0 Flash',
    contextWindow: 1048576,
    maxOutputTokens: 8192,
    costPerInputToken: 0,
    costPerOutputToken: 0,
    supportsStreaming: true,
    supportsVision: true,
    supportsFunctions: true,
    tags: ['fast', 'general', 'vision', 'free'],
  },
];

export class GoogleProvider extends BaseProvider {
  private client: GoogleGenerativeAI;

  constructor(apiKey: string) {
    super('google', 'Google Gemini (Free)', apiKey, GOOGLE_MODELS);
    this.client = new GoogleGenerativeAI(apiKey);
  }

  private formatMessages(messages: ChatMessage[]): {
    systemInstruction?: string;
    history: Array<{ role: string; parts: Array<{ text: string }> }>;
    lastMessage: string;
  } {
    let systemInstruction: string | undefined;
    const history: Array<{ role: string; parts: Array<{ text: string }> }> = [];
    let lastMessage = '';

    for (let i = 0; i < messages.length; i++) {
      const m = messages[i];
      if (m.role === 'system') {
        systemInstruction = m.content;
      } else if (i === messages.length - 1) {
        lastMessage = m.content;
      } else {
        history.push({
          role: m.role === 'assistant' ? 'model' : 'user',
          parts: [{ text: m.content }],
        });
      }
    }

    return { systemInstruction, history, lastMessage };
  }

  async chat(
    messages: ChatMessage[],
    modelId: string,
    options?: ChatOptions,
  ): Promise<{ content: string; usage?: TokenUsage }> {
    const { systemInstruction, history, lastMessage } = this.formatMessages(messages);

    const model = this.client.getGenerativeModel({
      model: modelId,
      systemInstruction,
      generationConfig: {
        temperature: options?.temperature ?? 0.7,
        maxOutputTokens: options?.maxTokens,
        topP: options?.topP,
        stopSequences: options?.stop,
      },
    });

    const chat = model.startChat({ history });
    const result = await chat.sendMessage(lastMessage);
    const response = result.response;
    const content = response.text();

    const meta = response.usageMetadata;
    const usage: TokenUsage | undefined = meta
      ? {
          promptTokens: meta.promptTokenCount ?? 0,
          completionTokens: meta.candidatesTokenCount ?? 0,
          totalTokens: meta.totalTokenCount ?? 0,
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
      const { systemInstruction, history, lastMessage } = this.formatMessages(messages);

      const model = this.client.getGenerativeModel({
        model: modelId,
        systemInstruction,
        generationConfig: {
          temperature: options?.temperature ?? 0.7,
          maxOutputTokens: options?.maxTokens,
          topP: options?.topP,
          stopSequences: options?.stop,
        },
      });

      const chat = model.startChat({ history });
      const result: GenerateContentStreamResult = await chat.sendMessageStream(lastMessage);

      for await (const chunk of result.stream) {
        const text = chunk.text();
        if (text) {
          yield { type: 'text', content: text };
        }
      }

      yield { type: 'done', content: '' };
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Unknown Google error';
      logger.error(`Google stream error: ${message}`);
      yield { type: 'error', content: message };
    }
  }

  async healthCheck(): Promise<boolean> {
    try {
      const model = this.client.getGenerativeModel({ model: 'gemini-2.0-flash' });
      await model.generateContent('Hi');
      return true;
    } catch {
      return false;
    }
  }
}
