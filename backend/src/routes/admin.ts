import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { authMiddleware } from '../middleware/auth.js';
import { prisma } from '../database/client.js';
import { getAllProviders } from '../providers/index.js';
import type { ApiResponse } from '../types/index.js';

export async function adminRoutes(app: FastifyInstance): Promise<void> {
  // Admin role check helper
  const requireAdmin = async (request: FastifyRequest, reply: FastifyReply) => {
    if (request.user?.role !== 'admin') {
      return reply.status(403).send({
        success: false,
        error: 'Forbidden: Admin access required',
      } satisfies ApiResponse);
    }
  };

  // ── List all registered models with database statuses ──
  app.get(
    '/api/admin/models',
    { preHandler: [authMiddleware, requireAdmin] },
    async (request, reply) => {
      try {
        const statuses = await prisma.modelStatus.findMany();
        const statusMap = new Map(statuses.map((s) => [s.modelId, s.enabled]));

        const providers = getAllProviders();
        const modelsList = [];

        for (const provider of providers) {
          for (const model of provider.models) {
            const dbEnabled = statusMap.get(model.id);
            modelsList.push({
              id: model.id,
              name: model.name,
              provider: provider.name,
              providerDisplayName: provider.displayName,
              enabled: dbEnabled !== undefined ? dbEnabled : true,
              tags: model.tags,
            });
          }
        }

        return reply.send({
          success: true,
          data: modelsList,
        });
      } catch (error) {
        return reply.status(500).send({
          success: false,
          error: error instanceof Error ? error.message : 'Failed to list models',
        } satisfies ApiResponse);
      }
    }
  );

  // ── Toggle model enable/disable status ────────────────
  app.post(
    '/api/admin/models/toggle',
    { preHandler: [authMiddleware, requireAdmin] },
    async (request, reply) => {
      try {
        const body = request.body as { modelId: string; enabled: boolean };

        if (!body.modelId) {
          return reply.status(400).send({
            success: false,
            error: 'modelId is required',
          } satisfies ApiResponse);
        }

        const status = await prisma.modelStatus.upsert({
          where: { modelId: body.modelId },
          update: { enabled: body.enabled },
          create: { modelId: body.modelId, enabled: body.enabled },
        });

        return reply.send({
          success: true,
          data: status,
        });
      } catch (error) {
        return reply.status(500).send({
          success: false,
          error: error instanceof Error ? error.message : 'Failed to toggle model',
        } satisfies ApiResponse);
      }
    }
  );
}
