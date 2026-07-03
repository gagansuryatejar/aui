import Fastify from 'fastify';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import rateLimit from '@fastify/rate-limit';
import { config } from './config/index.js';
import { initProviders } from './providers/index.js';
import { logger } from './services/logger.js';
import { authRoutes } from './routes/auth.js';
import { chatRoutes } from './routes/chat.js';
import { conversationRoutes } from './routes/conversations.js';
import { healthRoutes } from './routes/health.js';

async function main() {
  // ── Initialize providers ────────────────────────────
  initProviders();

  // ── Create Fastify instance ─────────────────────────
  const app = Fastify({
    logger: false, // Using Winston instead
    bodyLimit: config.maxFileSizeMb * 1024 * 1024,
  });

  // ── Plugins ─────────────────────────────────────────
  await app.register(cors, {
    origin: [config.frontendUrl, 'http://localhost:3000', 'http://localhost:3001'],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  });

  await app.register(helmet, {
    contentSecurityPolicy: false, // Allow SSE
  });

  await app.register(rateLimit, {
    max: config.rateLimitMax,
    timeWindow: config.rateLimitWindowMs,
    keyGenerator: (request) => {
      return request.headers.authorization || request.ip;
    },
  });

  // ── Error handler ───────────────────────────────────
  app.setErrorHandler((error: any, request, reply) => {
    logger.error(`${request.method} ${request.url}: ${error.message}`, {
      stack: error.stack,
      statusCode: error.statusCode,
    });

    const statusCode = error.statusCode || 500;
    reply.status(statusCode).send({
      success: false,
      error:
        config.nodeEnv === 'production' && statusCode === 500
          ? 'Internal server error'
          : error.message,
    });
  });

  // ── Routes ──────────────────────────────────────────
  await app.register(authRoutes);
  await app.register(chatRoutes);
  await app.register(conversationRoutes);
  await app.register(healthRoutes);

  // ── Root ────────────────────────────────────────────
  app.get('/', async () => ({
    name: 'AUI Backend',
    version: '1.0.0',
    status: 'running',
  }));

  // ── Start ───────────────────────────────────────────
  try {
    await app.listen({ port: config.port, host: '0.0.0.0' });
    logger.info(`🚀 AUI Backend running on http://localhost:${config.port}`);
    logger.info(`   Environment: ${config.nodeEnv}`);
    logger.info(`   Frontend URL: ${config.frontendUrl}`);
  } catch (err) {
    logger.error('Failed to start server:', err);
    process.exit(1);
  }
}

main();
