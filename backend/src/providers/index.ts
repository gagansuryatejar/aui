import { config } from '../config/index.js';
import { BaseProvider } from './base.js';
import { GoogleProvider } from './google.js';
import { GroqProvider } from './groq.js';
import { OpenRouterProvider } from './openrouter.js';
import { ZenMuxProvider } from './zenmux.js';
import { NvidiaProvider } from './nvidia.js';
import { CerebrasProvider } from './cerebras.js';
import { GitHubProvider } from './github.js';
import { HuggingFaceProvider } from './huggingface.js';
import { CloudflareProvider } from './cloudflare.js';
import { MistralProvider } from './mistral.js';
import { CohereProvider } from './cohere.js';
import { logger } from '../services/logger.js';

/**
 * Provider registry – FREE providers only.
 * 
 * Priority order (best free experience):
 *   1. Google Gemini  – best free tier (1M tokens/min)
 *   2. Groq           – fastest inference (Llama/Mixtral)
 *   3. OpenRouter      – 18+ free models as fallbacks
 *   4. ZenMux         – 4 free models including Sonnet 5
 *
 * When one model runs out of tokens, the Smart Router 
 * automatically falls back to the next provider/model.
 *
 * To add a new provider:
 *   1. Create a file in providers/ that extends BaseProvider
 *   2. Register it below with its API key
 */

const registry = new Map<string, BaseProvider>();

export function initProviders(): void {
  // Google Gemini (FREE – best default)
  if (config.googleApiKey) {
    registry.set('google', new GoogleProvider(config.googleApiKey));
    logger.info('✅ Registered provider: Google Gemini (Free)');
  }

  // Groq (FREE – super fast)
  if (config.groqApiKey) {
    registry.set('groq', new GroqProvider(config.groqApiKey));
    logger.info('✅ Registered provider: Groq (Free)');
  }

  // OpenRouter (FREE models – many fallback options)
  if (config.openrouterApiKey) {
    registry.set('openrouter', new OpenRouterProvider(config.openrouterApiKey));
    logger.info('✅ Registered provider: OpenRouter (Free models)');
  }

  // ZenMux (FREE models)
  if (config.zenmuxApiKey) {
    registry.set('zenmux', new ZenMuxProvider(config.zenmuxApiKey));
    logger.info('✅ Registered provider: ZenMux (Free)');
  }

  // NVIDIA AI (Nemotron, Llama, Mistral, DeepSeek, etc.)
  if (config.nvidiaApiKey) {
    registry.set('nvidia', new NvidiaProvider(config.nvidiaApiKey));
    logger.info('✅ Registered provider: NVIDIA AI');
  }

  // Cerebras
  if (config.cerebrasApiKey) {
    registry.set('cerebras', new CerebrasProvider(config.cerebrasApiKey));
    logger.info('✅ Registered provider: Cerebras');
  }

  // GitHub Models
  if (config.githubApiKey) {
    registry.set('github', new GitHubProvider(config.githubApiKey));
    logger.info('✅ Registered provider: GitHub Models');
  }

  // Hugging Face
  if (config.huggingfaceApiKey) {
    registry.set('huggingface', new HuggingFaceProvider(config.huggingfaceApiKey));
    logger.info('✅ Registered provider: Hugging Face');
  }

  // Cloudflare
  if (config.cloudflareApiKey) {
    registry.set('cloudflare', new CloudflareProvider(config.cloudflareApiKey));
    logger.info('✅ Registered provider: Cloudflare Workers AI');
  }

  // Mistral AI
  if (config.mistralApiKey) {
    registry.set('mistral', new MistralProvider(config.mistralApiKey));
    logger.info('✅ Registered provider: Mistral AI');
  }

  // Cohere
  if (config.cohereApiKey) {
    registry.set('cohere', new CohereProvider(config.cohereApiKey));
    logger.info('✅ Registered provider: Cohere');
  }

  if (registry.size === 0) {
    logger.warn('');
    logger.warn('⚠️  No AI providers configured!');
    logger.warn('   Get FREE API keys from:');
    logger.warn('   • Google Gemini → https://aistudio.google.com/apikey');
    logger.warn('   • Groq          → https://console.groq.com/keys');
    logger.warn('   • OpenRouter    → https://openrouter.ai/keys');
    logger.warn('   Then add them to your .env file.');
    logger.warn('');
  } else {
    const totalModels = Array.from(registry.values()).reduce(
      (sum, p) => sum + p.models.length,
      0,
    );
    logger.info(`🚀 ${registry.size} provider(s) ready with ${totalModels} free models`);
  }
}

export function getProvider(name: string): BaseProvider | undefined {
  return registry.get(name);
}

export function getAllProviders(): BaseProvider[] {
  return Array.from(registry.values());
}

export function getProviderNames(): string[] {
  return Array.from(registry.keys());
}

export function getConfiguredProviders(): BaseProvider[] {
  return getAllProviders().filter((p) => p.isConfigured);
}
