import type { FastifyInstance } from 'fastify';
import { checkAllProviders } from '../services/smart-router.js';
import { getConfiguredProviders } from '../providers/index.js';

export async function healthRoutes(app: FastifyInstance): Promise<void> {
  // ── Basic health check ─────────────────────────────
  app.get('/api/health', async (_request, reply) => {
    const providers = getConfiguredProviders();
    return reply.send({
      status: 'ok',
      timestamp: new Date().toISOString(),
      providers: providers.map((p) => ({
        name: p.name,
        displayName: p.displayName,
        models: p.getModelIds(),
        configured: p.isConfigured,
      })),
    });
  });

  // ── Deep health check (pings all providers) ────────
  app.get('/api/health/deep', async (_request, reply) => {
    const results = await checkAllProviders();
    const allHealthy = results.every((r) => r.healthy);

    return reply.status(allHealthy ? 200 : 503).send({
      status: allHealthy ? 'ok' : 'degraded',
      timestamp: new Date().toISOString(),
      providers: results,
    });
  });
}
