import type { ChatMessage, StreamChunk, TokenUsage, ModelConfig } from '../types/index.js';

/**
 * Base class for all AI providers.
 * To add a new provider, extend this class and implement the abstract methods,
 * then register it in providers/index.ts.
 */
export abstract class BaseProvider {
  readonly name: string;
  readonly displayName: string;
  readonly models: ModelConfig[];
  protected apiKey: string;

  constructor(name: string, displayName: string, apiKey: string, models: ModelConfig[]) {
    this.name = name;
    this.displayName = displayName;
    this.apiKey = apiKey;
    this.models = models;
  }

  /** Whether this provider has a valid API key configured */
  get isConfigured(): boolean {
    return this.apiKey.length > 0;
  }

  /** Get a specific model config by ID */
  getModel(modelId: string): ModelConfig | undefined {
    return this.models.find((m) => m.id === modelId);
  }

  /** Get all model IDs */
  getModelIds(): string[] {
    return this.models.map((m) => m.id);
  }

  /**
   * Send a non-streaming chat completion request.
   * Returns the full assistant message and token usage.
   */
  abstract chat(
    messages: ChatMessage[],
    modelId: string,
    options?: ChatOptions,
  ): Promise<{ content: string; usage?: TokenUsage }>;

  /**
   * Send a streaming chat completion request.
   * Yields chunks of text as they arrive.
   */
  abstract chatStream(
    messages: ChatMessage[],
    modelId: string,
    options?: ChatOptions,
  ): AsyncGenerator<StreamChunk>;

  /**
   * Perform a lightweight health check (e.g. list models).
   * Should return true if the provider is reachable and the API key is valid.
   */
  abstract healthCheck(): Promise<boolean>;
}

export interface ChatOptions {
  temperature?: number;
  maxTokens?: number;
  topP?: number;
  stop?: string[];
  signal?: AbortSignal;
}
