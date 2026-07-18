import type { FastifyInstance, FastifyRequest } from 'fastify';
import { authMiddleware } from '../middleware/auth.js';
import { prisma } from '../database/client.js';
import { searchMemories, getMemoryStats } from '../services/memory-engine.js';
import { logger } from '../services/logger.js';
import { encryptTextPayload, decryptTextPayload } from '../services/security-encryption.js';

export async function memoryRoutes(app: FastifyInstance): Promise<void> {
  // ── List all memories ──────────────────────────────────
  app.get(
    '/api/memory',
    { preHandler: [authMiddleware] },
    async (request: FastifyRequest, reply) => {
      const userId = request.user!.userId;
      const query = (request.query as any)?.q || '';
      const category = (request.query as any)?.category || '';

      try {
        const memories = await searchMemories(userId, query, category || undefined);
        return reply.send({ success: true, data: memories });
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        logger.error(`Failed to fetch memories: ${msg}`);
        return reply.status(500).send({ success: false, error: 'Failed to fetch memories' });
      }
    },
  );

  // ── Memory stats ───────────────────────────────────────
  app.get(
    '/api/memory/stats',
    { preHandler: [authMiddleware] },
    async (request: FastifyRequest, reply) => {
      const userId = request.user!.userId;

      try {
        const stats = await getMemoryStats(userId);
        return reply.send({ success: true, data: stats });
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        logger.error(`Failed to fetch memory stats: ${msg}`);
        return reply.status(500).send({ success: false, error: 'Failed to fetch stats' });
      }
    },
  );

  // ── Memory timeline (grouped by date) ──────────────────
  app.get(
    '/api/memory/timeline',
    { preHandler: [authMiddleware] },
    async (request: FastifyRequest, reply) => {
      const userId = request.user!.userId;

      try {
        const memories = await prisma.memory.findMany({
          where: { userId },
          orderBy: { createdAt: 'desc' },
          take: 100,
        });

        // Group by date and decrypt
        const grouped: Record<string, typeof memories> = {};
        for (const m of memories) {
          const dateKey = m.createdAt.toISOString().split('T')[0];
          if (!grouped[dateKey]) grouped[dateKey] = [];
          grouped[dateKey].push({
            ...m,
            content: decryptTextPayload(m.content),
          });
        }

        const timeline = Object.entries(grouped).map(([date, items]) => ({
          date,
          memories: items,
        }));

        return reply.send({ success: true, data: timeline });
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        logger.error(`Failed to fetch memory timeline: ${msg}`);
        return reply.status(500).send({ success: false, error: 'Failed to fetch timeline' });
      }
    },
  );

  // ── Update a memory ────────────────────────────────────
  app.put(
    '/api/memory/:id',
    { preHandler: [authMiddleware] },
    async (request: FastifyRequest, reply) => {
      const userId = request.user!.userId;
      const { id } = request.params as { id: string };
      const body = request.body as {
        content?: string;
        category?: string;
        importance?: number;
      };

      try {
        // Verify ownership
        const memory = await prisma.memory.findFirst({
          where: { id, userId },
        });

        if (!memory) {
          return reply.status(404).send({ success: false, error: 'Memory not found' });
        }

        const updated = await prisma.memory.update({
          where: { id },
          data: {
            ...(body.content !== undefined && { content: encryptTextPayload(body.content) }),
            ...(body.category !== undefined && { category: body.category }),
            ...(body.importance !== undefined && {
              importance: Math.min(5, Math.max(1, body.importance)),
            }),
          },
        });

        const decrypted = {
          ...updated,
          content: decryptTextPayload(updated.content),
        };

        return reply.send({ success: true, data: decrypted });
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        logger.error(`Failed to update memory: ${msg}`);
        return reply.status(500).send({ success: false, error: 'Failed to update memory' });
      }
    },
  );

  // ── Delete a memory ────────────────────────────────────
  app.delete(
    '/api/memory/:id',
    { preHandler: [authMiddleware] },
    async (request: FastifyRequest, reply) => {
      const userId = request.user!.userId;
      const { id } = request.params as { id: string };

      try {
        const memory = await prisma.memory.findFirst({
          where: { id, userId },
        });

        if (!memory) {
          return reply.status(404).send({ success: false, error: 'Memory not found' });
        }

        await prisma.memory.delete({ where: { id } });
        return reply.send({ success: true, message: 'Memory deleted' });
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        logger.error(`Failed to delete memory: ${msg}`);
        return reply.status(500).send({ success: false, error: 'Failed to delete memory' });
      }
    },
  );

  // ── Clear all memories ─────────────────────────────────
  app.delete(
    '/api/memory',
    { preHandler: [authMiddleware] },
    async (request: FastifyRequest, reply) => {
      const userId = request.user!.userId;

      try {
        const deleted = await prisma.memory.deleteMany({ where: { userId } });
        // Also clear the user profile
        await prisma.userProfile.deleteMany({ where: { userId } });

        return reply.send({
          success: true,
          message: `Cleared ${deleted.count} memories and user profile`,
        });
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        logger.error(`Failed to clear memories: ${msg}`);
        return reply.status(500).send({ success: false, error: 'Failed to clear memories' });
      }
    },
  );

  // ── Export memories as JSON ─────────────────────────────
  app.get(
    '/api/memory/export',
    { preHandler: [authMiddleware] },
    async (request: FastifyRequest, reply) => {
      const userId = request.user!.userId;

      try {
        const [memories, profile, summaries] = await Promise.all([
          prisma.memory.findMany({ where: { userId }, orderBy: { updatedAt: 'desc' } }),
          prisma.userProfile.findUnique({ where: { userId } }),
          prisma.conversationSummary.findMany({ where: { userId }, orderBy: { createdAt: 'desc' }, take: 50 }),
        ]);

        const decryptedMemories = memories.map((m) => ({
          ...m,
          content: decryptTextPayload(m.content),
        }));

        const exported = {
          exportedAt: new Date().toISOString(),
          memories: decryptedMemories,
          profile: profile
            ? {
                communicationStyle: profile.communicationStyle,
                expertiseAreas: JSON.parse(profile.expertiseAreas || '[]'),
                personalityTraits: JSON.parse(profile.personalityTraits || '[]'),
                preferredResponseLength: profile.preferredResponseLength,
              }
            : null,
          conversationSummaries: summaries.map((s) => ({
            ...s,
            keyTopics: JSON.parse(s.keyTopics || '[]'),
          })),
        };

        reply.header('Content-Disposition', 'attachment; filename="aui-memories.json"');
        reply.header('Content-Type', 'application/json');
        return reply.send(exported);
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        logger.error(`Failed to export memories: ${msg}`);
        return reply.status(500).send({ success: false, error: 'Failed to export' });
      }
    },
  );

  // ── Get user profile ───────────────────────────────────
  app.get(
    '/api/memory/profile',
    { preHandler: [authMiddleware] },
    async (request: FastifyRequest, reply) => {
      const userId = request.user!.userId;

      try {
        const profile = await prisma.userProfile.findUnique({ where: { userId } });
        if (!profile) {
          return reply.send({
            success: true,
            data: null,
            message: 'No profile learned yet. Keep chatting!',
          });
        }

        return reply.send({
          success: true,
          data: {
            communicationStyle: profile.communicationStyle,
            expertiseAreas: JSON.parse(profile.expertiseAreas || '[]'),
            personalityTraits: JSON.parse(profile.personalityTraits || '[]'),
            preferredResponseLength: profile.preferredResponseLength,
            timezone: profile.timezone,
            language: profile.language,
            updatedAt: profile.updatedAt,
          },
        });
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        logger.error(`Failed to fetch profile: ${msg}`);
        return reply.status(500).send({ success: false, error: 'Failed to fetch profile' });
      }
    },
  );
}
