import { config } from '../config/index.js';
import { getProvider, getConfiguredProviders } from '../providers/index.js';
import type { BaseProvider } from '../providers/base.js';
import type {
  ChatMessage,
  StreamChunk,
  RouteDecision,
  RequestAnalysis,
  ProviderHealth,
  TokenUsage,
} from '../types/index.js';
import { healthCache } from './cache.js';
import { logger } from './logger.js';
import { webSearch, formatSearchContext, isSearchConfigured } from './web-search.js';

// ── Token exhaustion / error pattern detection ────────────

const EXHAUSTION_PATTERNS = [
  /rate.?limit/i,
  /429/,
  /quota/i,
  /insufficient.?(?:credits|funds|balance|quota)/i,
  /exceeded/i,
  /too many requests/i,
  /tokens?.?(?:limit|exceeded|exhausted|depleted)/i,
  /resource.?exhausted/i,
  /capacity/i,
  /overloaded/i,
  /billing/i,
  /credit/i,
  /limit.?reached/i,
  /max.?(?:tokens|requests)/i,
  /throttl/i,
];

const AUTH_ERRORS = [
  /401/,
  /403/,
  /invalid.?api.?key/i,
  /unauthorized/i,
  /authentication/i,
  /permission/i,
];

function isTokenExhaustion(error: string): boolean {
  return EXHAUSTION_PATTERNS.some((p) => p.test(error));
}

function isAuthError(error: string): boolean {
  return AUTH_ERRORS.some((p) => p.test(error));
}

function isModelUnavailable(error: string): boolean {
  return /model.?(?:not.?found|unavailable|does.?not.?exist|disabled)/i.test(error) ||
    /not.?available/i.test(error) ||
    /503/i.test(error) ||
    /502/i.test(error);
}

// ── Request analysis ──────────────────────────────────────

function analyzeRequest(messages: ChatMessage[]): RequestAnalysis {
  const lastMessage = messages[messages.length - 1]?.content ?? '';
  const allContent = messages.map((m) => m.content).join(' ');
  const estimatedTokens = Math.ceil(allContent.length / 4);

  const requiresVision = messages.some(
    (m) => m.attachments && m.attachments.some((a) => a.type.startsWith('image/')),
  );

  const codePatterns = /\b(code|function|class|debug|error|fix|implement|refactor|api|sql|regex|algorithm|typescript|python|javascript|rust|go|java|cpp|html|css|react|node|git|docker|deploy)\b/i;
  const reasoningPatterns = /\b(explain|why|how|analyze|compare|evaluate|reason|think|logic|proof|math|calculate|solve|derive)\b/i;
  const creativePatterns = /\b(write|story|poem|creative|generate|imagine|describe|essay|blog|article|song|script)\b/i;

  let category: RequestAnalysis['category'] = 'general';
  if (requiresVision) category = 'vision';
  else if (codePatterns.test(lastMessage)) category = 'coding';
  else if (reasoningPatterns.test(lastMessage)) category = 'reasoning';
  else if (creativePatterns.test(lastMessage)) category = 'creative';

  let complexity: RequestAnalysis['complexity'] = 'simple';
  if (estimatedTokens > 4000 || messages.length > 10) complexity = 'complex';
  else if (estimatedTokens > 1000 || messages.length > 4) complexity = 'moderate';

  return {
    estimatedTokens,
    complexity,
    category,
    requiresVision,
    requiresFunctions: false,
  };
}

// ── Provider health tracking ──────────────────────────────

function getHealth(providerName: string, modelId?: string): ProviderHealth {
  const key = modelId ? `health:${providerName}:${modelId}` : `health:${providerName}`;
  const cached = healthCache.get<ProviderHealth>(key);
  if (cached) return cached;

  return {
    provider: providerName,
    healthy: true,
    latencyMs: 0,
    lastChecked: 0,
    errorCount: 0,
    rateLimited: false,
  };
}

function updateHealth(providerName: string, updates: Partial<ProviderHealth>, modelId?: string): void {
  const key = modelId ? `health:${providerName}:${modelId}` : `health:${providerName}`;
  const current = getHealth(providerName, modelId);
  const updated: ProviderHealth = {
    ...current,
    ...updates,
    lastChecked: Date.now(),
  };
  // Mark exhausted models unhealthy for 5 minutes
  const ttl = updated.rateLimited ? 300 : 60;
  healthCache.set(key, updated, ttl);
}

export function markProviderError(providerName: string, error: string, modelId?: string): void {
  const exhausted = isTokenExhaustion(error);
  const current = getHealth(providerName, modelId);

  updateHealth(providerName, {
    healthy: !exhausted && current.errorCount + 1 < 5,
    errorCount: current.errorCount + 1,
    lastError: error,
    rateLimited: exhausted,
    rateLimitResetsAt: exhausted ? Date.now() + 300000 : undefined, // 5 min cooldown
  }, modelId);

  if (exhausted) {
    logger.warn(`🔄 ${providerName}${modelId ? `/${modelId}` : ''} tokens exhausted – switching to next model`);
  }
}

export function markProviderSuccess(providerName: string, latencyMs: number, modelId?: string): void {
  updateHealth(providerName, {
    healthy: true,
    latencyMs,
    errorCount: 0,
    rateLimited: false,
    lastError: undefined,
    rateLimitResetsAt: undefined,
  }, modelId);
}

// ── Model selection ───────────────────────────────────────

function isModelHealthy(providerName: string, modelId: string): boolean {
  const modelHealth = getHealth(providerName, modelId);
  const providerHealth = getHealth(providerName);

  // Check model-level health
  if (modelHealth.rateLimited) {
    if (modelHealth.rateLimitResetsAt && modelHealth.rateLimitResetsAt > Date.now()) {
      return false;
    }
  }
  if (!modelHealth.healthy && modelHealth.errorCount >= 3) return false;

  // Check provider-level health
  if (providerHealth.rateLimited) {
    if (providerHealth.rateLimitResetsAt && providerHealth.rateLimitResetsAt > Date.now()) {
      return false;
    }
  }

  return true;
}

function buildCandidateList(analysis: RequestAnalysis): Array<{ provider: BaseProvider; modelId: string; score: number }> {
  const providers = getConfiguredProviders();
  const candidates: Array<{ provider: BaseProvider; modelId: string; score: number }> = [];

  for (const provider of providers) {
    for (const model of provider.models) {
      // Skip if model doesn't meet requirements
      if (analysis.requiresVision && !model.supportsVision) continue;
      if (analysis.estimatedTokens > model.contextWindow * 0.9) continue;

      // Skip unhealthy models
      if (!isModelHealthy(provider.name, model.id)) continue;

      // Score the model
      let score = 50;

      // Category match bonus
      if (model.tags.includes(analysis.category)) score += 20;

      // Provider priority: google > groq > openrouter
      if (provider.name === 'google') score += 15;
      else if (provider.name === 'groq') score += 10;
      else if (provider.name === 'openrouter') score += 5;

      // Default provider bonus
      if (provider.name === config.defaultProvider) score += 10;

      // Speed preference for simple queries
      if (analysis.complexity === 'simple' && model.tags.includes('fast')) score += 10;

      // Larger models for complex queries
      if (analysis.complexity === 'complex') {
        if (model.contextWindow >= 100000) score += 8;
        if (model.tags.includes('reasoning')) score += 10;
      }

      // Coding-specific models
      if (analysis.category === 'coding' && model.tags.includes('coding')) score += 15;

      // Latency bonus (prefer models with known low latency)
      const health = getHealth(provider.name, model.id);
      if (health.latencyMs > 0 && health.latencyMs < 2000) score += 5;

      candidates.push({ provider, modelId: model.id, score });
    }
  }

  // Sort by score descending
  candidates.sort((a, b) => b.score - a.score);
  return candidates;
}

// ── Route decision ────────────────────────────────────────

export function routeRequest(messages: ChatMessage[]): RouteDecision {
  const analysis = analyzeRequest(messages);
  const candidates = buildCandidateList(analysis);

  if (candidates.length === 0) {
    // Absolute fallback
    return {
      provider: 'google',
      model: 'gemini-2.0-flash',
      reason: 'No healthy models available – using default fallback',
      fallbacks: [],
    };
  }

  const primary = candidates[0];
  const fallbacks = candidates.slice(1).map((c) => ({
    provider: c.provider.name,
    model: c.modelId,
  }));

  const modelName = primary.provider.getModel(primary.modelId)?.name || primary.modelId;

  return {
    provider: primary.provider.name,
    model: primary.modelId,
    reason: `Selected ${primary.provider.displayName} → ${modelName} for ${analysis.category} (${analysis.complexity}) – ${fallbacks.length} fallback(s) available`,
    fallbacks,
  };
}

// ── Execute with retries and automatic fallback ───────────

export async function executeChat(
  messages: ChatMessage[],
): Promise<{ content: string; provider: string; model: string; usage?: TokenUsage }> {
  const decision = routeRequest(messages);
  const attempts = [
    { provider: decision.provider, model: decision.model },
    ...decision.fallbacks,
  ];

  logger.info(`🧠 Smart Router: ${decision.reason}`);

  for (const attempt of attempts) {
    const provider = getProvider(attempt.provider);
    if (!provider) continue;

    for (let retry = 0; retry < config.maxRetries; retry++) {
      try {
        const start = Date.now();
        const result = await provider.chat(messages, attempt.model);
        const latency = Date.now() - start;

        markProviderSuccess(attempt.provider, latency, attempt.model);
        logger.info(`✅ Chat completed: ${attempt.provider}/${attempt.model} in ${latency}ms`);

        return {
          content: result.content,
          provider: attempt.provider,
          model: attempt.model,
          usage: result.usage,
        };
      } catch (error: unknown) {
        const msg = error instanceof Error ? error.message : String(error);
        markProviderError(attempt.provider, msg, attempt.model);

        // Auth errors → skip this provider entirely
        if (isAuthError(msg)) {
          logger.error(`🔑 Auth error for ${attempt.provider} – skipping provider`);
          break;
        }

        // Token exhaustion → skip this model immediately (don't retry)
        if (isTokenExhaustion(msg)) {
          logger.warn(`🔄 Tokens exhausted for ${attempt.provider}/${attempt.model} – trying next model`);
          break;
        }

        // Model unavailable → skip this model
        if (isModelUnavailable(msg)) {
          logger.warn(`❌ Model unavailable: ${attempt.provider}/${attempt.model} – trying next`);
          break;
        }

        // Generic error → retry with backoff
        logger.warn(`⚠️ Attempt ${retry + 1}/${config.maxRetries} failed: ${attempt.provider}/${attempt.model}: ${msg}`);
        if (retry < config.maxRetries - 1) {
          await new Promise((r) => setTimeout(r, config.retryDelayMs * 2 ** retry));
        }
      }
    }
  }

  throw new Error('All models exhausted. Please try again in a few minutes.');
}

// ── Image Generation Intent Routing ───────────────────────

function isImageGenerationRequest(text: string): { isImage: boolean; prompt: string } {
  const clean = text.trim();
  
  const prefixes = [
    /^\/image\s+(.+)$/i,
    /^\/imagine\s+(.+)$/i,
    /^generate\s+an?\s+image\s+of\s+(.+)$/i,
    /^create\s+an?\s+image\s+of\s+(.+)$/i,
    /^draw\s+an?\s+image\s+of\s+(.+)$/i,
    /^draw\s+(.+)$/i,
    /^paint\s+(.+)$/i,
    /^create\s+a\s+picture\s+of\s+(.+)$/i,
    /^generate\s+a\s+picture\s+of\s+(.+)$/i
  ];
  
  for (const regex of prefixes) {
    const match = clean.match(regex);
    if (match && match[1]) {
      return { isImage: true, prompt: match[1].trim() };
    }
  }

  // Also match "image of a cat" style
  if (/^(?:image|picture|drawing|painting)\s+of\s+(.+)$/i.test(clean)) {
    const match = clean.match(/^(?:image|picture|drawing|painting)\s+of\s+(.+)$/i);
    return { isImage: true, prompt: match![1].trim() };
  }
  
  return { isImage: false, prompt: '' };
}

// ── Execute streaming with automatic fallback ─────────────

export async function* executeChatStream(
  messages: ChatMessage[],
  webSearchRequested?: boolean,
): AsyncGenerator<StreamChunk & { provider?: string; model?: string }> {
  // Check for image generation intent first
  const lastUserMsg = messages.filter((m) => m.role === 'user').pop();
  if (lastUserMsg) {
    const imgCheck = isImageGenerationRequest(lastUserMsg.content);
    if (imgCheck.isImage) {
      logger.info(`🎨 Smart Router: Intercepted image generation request: "${imgCheck.prompt}"`);
      
      yield {
        type: 'metadata' as StreamChunk['type'],
        content: '',
        metadata: { provider: 'Pollinations AI', model: 'Flux / Stable Diffusion' }
      };

      yield {
        type: 'text' as StreamChunk['type'],
        content: `🎨 **Generating image for prompt:** *"${imgCheck.prompt}"*...\n\n`
      };

      // Add a small delay for premium effect
      await new Promise((r) => setTimeout(r, 1200));

      const seed = Math.floor(Math.random() * 1000000);
      const imageUrl = `https://image.pollinations.ai/prompt/${encodeURIComponent(imgCheck.prompt)}?width=1024&height=1024&nologo=true&seed=${seed}`;

      yield {
        type: 'text' as StreamChunk['type'],
        content: `Here is your generated image:\n\n![${imgCheck.prompt}](${imageUrl})`
      };

      yield { type: 'done' as StreamChunk['type'], content: '' };
      return;
    }
  }

  const decision = routeRequest(messages);
  const attempts = [
    { provider: decision.provider, model: decision.model },
    ...decision.fallbacks,
  ];

  logger.info(`🧠 Smart Router: ${decision.reason}`);

  // ── Web search: only when user has enabled the toggle ───────────
  let augmentedMessages = [...messages];

  if (webSearchRequested && isSearchConfigured()) {
    const lastUserMsg = messages.filter((m) => m.role === 'user').pop();
    if (lastUserMsg) {
      // Signal the frontend that we're searching
      yield { type: 'searching' as StreamChunk['type'], content: lastUserMsg.content };

      try {
        const searchResponse = await webSearch(lastUserMsg.content);
        const searchContext = formatSearchContext(searchResponse);

        if (searchContext) {
          // Emit search results metadata to the frontend
          yield {
            type: 'search_results' as StreamChunk['type'],
            content: JSON.stringify(searchResponse.results),
            metadata: {
              provider: searchResponse.provider,
              query: searchResponse.query,
              cached: searchResponse.cached,
              resultCount: searchResponse.results.length,
            },
          };

          // Inject search context as a system message just before the last user message
          const systemSearchMsg: ChatMessage = {
            id: 'web-search-context',
            role: 'system',
            content: `You have access to real-time web search results. Use them to provide accurate, up-to-date information. ${searchContext}`,
            timestamp: Date.now(),
          };

          // Insert before the last user message
          const insertIndex = augmentedMessages.length - 1;
          augmentedMessages = [
            ...augmentedMessages.slice(0, insertIndex),
            systemSearchMsg,
            augmentedMessages[insertIndex],
          ];
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        logger.warn(`⚠️ Web search failed (non-fatal): ${msg}`);
      }
    }
  }

  for (const attempt of attempts) {
    const provider = getProvider(attempt.provider);
    if (!provider) continue;

    for (let retry = 0; retry < config.maxRetries; retry++) {
      try {
        const start = Date.now();
        let hasYielded = false;

        // Emit which model we're using
        const modelConfig = provider.getModel(attempt.model);
        yield {
          type: 'metadata',
          content: '',
          provider: attempt.provider,
          model: attempt.model,
          metadata: {
            provider: attempt.provider,
            providerName: provider.displayName,
            model: attempt.model,
            modelName: modelConfig?.name || attempt.model,
          },
        };

        const stream = provider.chatStream(augmentedMessages, attempt.model);

        for await (const chunk of stream) {
          if (chunk.type === 'error') {
            throw new Error(chunk.content);
          }
          hasYielded = true;
          yield chunk;
        }

        if (hasYielded) {
          const latency = Date.now() - start;
          markProviderSuccess(attempt.provider, latency, attempt.model);
          logger.info(`✅ Stream completed: ${attempt.provider}/${attempt.model} in ${latency}ms`);
          return;
        }
      } catch (error: unknown) {
        const msg = error instanceof Error ? error.message : String(error);
        markProviderError(attempt.provider, msg, attempt.model);

        if (isAuthError(msg)) {
          logger.error(`🔑 Auth error for ${attempt.provider} – skipping`);
          break;
        }

        if (isTokenExhaustion(msg)) {
          logger.warn(`🔄 Tokens exhausted: ${attempt.provider}/${attempt.model} – auto-switching...`);
          break;
        }

        if (isModelUnavailable(msg)) {
          logger.warn(`❌ Model unavailable: ${attempt.provider}/${attempt.model} – next...`);
          break;
        }

        logger.warn(`⚠️ Stream attempt ${retry + 1}/${config.maxRetries}: ${attempt.provider}/${attempt.model}: ${msg}`);
        if (retry < config.maxRetries - 1) {
          await new Promise((r) => setTimeout(r, config.retryDelayMs * 2 ** retry));
        }
      }
    }
  }

  yield {
    type: 'error',
    content: 'All free models are currently exhausted. Please wait a few minutes and try again.',
  };
}

// ── Health check all providers ────────────────────────────

export async function checkAllProviders(): Promise<ProviderHealth[]> {
  const providers = getConfiguredProviders();
  const results: ProviderHealth[] = [];

  for (const provider of providers) {
    const start = Date.now();
    try {
      const ok = await provider.healthCheck();
      const latency = Date.now() - start;
      const health: ProviderHealth = {
        provider: provider.name,
        healthy: ok,
        latencyMs: latency,
        lastChecked: Date.now(),
        errorCount: ok ? 0 : 1,
        rateLimited: false,
      };
      updateHealth(provider.name, health);
      results.push(health);
    } catch {
      const health: ProviderHealth = {
        provider: provider.name,
        healthy: false,
        latencyMs: Date.now() - start,
        lastChecked: Date.now(),
        errorCount: 1,
        rateLimited: false,
        lastError: 'Health check failed',
      };
      updateHealth(provider.name, health);
      results.push(health);
    }
  }

  return results;
}
