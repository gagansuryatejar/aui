// ── Shared types for the AUI backend ──────────────────────

export interface ChatMessage {
  id: string;
  role: 'system' | 'user' | 'assistant';
  content: string;
  timestamp: number;
  attachments?: FileAttachment[];
}

export interface FileAttachment {
  id: string;
  name: string;
  type: string;
  size: number;
  url: string;
}

export interface ChatRequest {
  conversationId?: string;
  messages: ChatMessage[];
  attachments?: FileAttachment[];
  stream?: boolean;
}

export interface ChatResponse {
  id: string;
  conversationId: string;
  message: ChatMessage;
  provider: string;
  model: string;
  usage?: TokenUsage;
}

export interface TokenUsage {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
}

// ── Provider abstraction ──────────────────────────────────

export interface ProviderConfig {
  name: string;
  displayName: string;
  apiKey: string;
  models: ModelConfig[];
  enabled: boolean;
  priority: number;              // lower = higher priority
  maxRetries: number;
  retryDelayMs: number;
  timeoutMs: number;
}

export interface ModelConfig {
  id: string;
  name: string;
  contextWindow: number;
  maxOutputTokens: number;
  costPerInputToken: number;     // USD per token
  costPerOutputToken: number;
  supportsStreaming: boolean;
  supportsVision: boolean;
  supportsFunctions: boolean;
  tags: string[];                // e.g. ['fast', 'reasoning', 'coding', 'creative']
}

export interface ProviderHealth {
  provider: string;
  healthy: boolean;
  latencyMs: number;
  lastChecked: number;
  errorCount: number;
  lastError?: string;
  rateLimited: boolean;
  rateLimitResetsAt?: number;
}

export interface StreamChunk {
  type: 'text' | 'error' | 'done' | 'metadata';
  content: string;
  metadata?: Record<string, unknown>;
}

// ── Smart Router ──────────────────────────────────────────

export interface RouteDecision {
  provider: string;
  model: string;
  reason: string;
  fallbacks: Array<{ provider: string; model: string }>;
}

export interface RequestAnalysis {
  estimatedTokens: number;
  complexity: 'simple' | 'moderate' | 'complex';
  category: 'general' | 'coding' | 'creative' | 'reasoning' | 'vision';
  requiresVision: boolean;
  requiresFunctions: boolean;
}

// ── Auth ──────────────────────────────────────────────────

export interface AuthPayload {
  userId: string;
  email: string;
  role?: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
  name: string;
}

// ── API responses ─────────────────────────────────────────

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

// ── Analytics ─────────────────────────────────────────────

export interface AnalyticsEvent {
  type: string;
  userId?: string;
  provider?: string;
  model?: string;
  tokens?: number;
  latencyMs?: number;
  success: boolean;
  error?: string;
  timestamp: number;
}
