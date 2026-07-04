import 'dotenv/config';

export const config = {
  // Server
  port: parseInt(process.env.PORT || '4000', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  frontendUrl: process.env.FRONTEND_URL || 'http://localhost:3000',

  // JWT
  jwtSecret: process.env.JWT_SECRET || 'dev-secret-change-me',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',

  // Database
  databaseUrl: process.env.DATABASE_URL || 'file:./dev.db',

  // FREE AI Providers
  googleApiKey: process.env.GOOGLE_API_KEY || '',
  groqApiKey: process.env.GROQ_API_KEY || '',
  cohereApiKey: process.env.COHERE_API_KEY || '',
  openrouterApiKey: process.env.OPENROUTER_API_KEY || '',
  zenmuxApiKey: process.env.ZENMUX_API_KEY || '',

  // Web Search
  tavilyApiKey: process.env.TAVILY_API_KEY || '',
  googleSearchApiKey: process.env.GOOGLE_SEARCH_API_KEY || '',
  googleSearchCx: process.env.GOOGLE_SEARCH_CX || '',
  langsearchApiKey: process.env.LANGSEARCH_API_KEY || '',

  // Provider settings
  defaultProvider: process.env.DEFAULT_PROVIDER || 'google',
  maxRetries: parseInt(process.env.MAX_RETRIES || '3', 10),
  retryDelayMs: parseInt(process.env.RETRY_DELAY_MS || '1000', 10),
  requestTimeoutMs: parseInt(process.env.REQUEST_TIMEOUT_MS || '60000', 10),

  // Rate limiting
  rateLimitMax: parseInt(process.env.RATE_LIMIT_MAX || '60', 10),
  rateLimitWindowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '60000', 10),

  // File uploads
  uploadDir: process.env.UPLOAD_DIR || './uploads',
  maxFileSizeMb: parseInt(process.env.MAX_FILE_SIZE_MB || '10', 10),
} as const;

export type Config = typeof config;
