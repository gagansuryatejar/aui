import type { FastifyInstance, FastifyRequest } from 'fastify';
import { authMiddleware } from '../middleware/auth.js';
import { prisma } from '../database/client.js';
import { logger } from '../services/logger.js';
import { compileWeeklyReport, runPromptBenchmark } from '../services/learning-report.js';
import { createPromptVersion, activatePromptVersion } from '../services/prompt-manager.js';

export async function learningRoutes(app: FastifyInstance): Promise<void> {
  // ── 1. Learning Dashboard Metrics ──────────────────────
  app.get(
    '/api/learning/dashboard',
    { preHandler: [authMiddleware] },
    async (request: FastifyRequest, reply) => {
      const userId = request.user!.userId;

      try {
        const [suggestions, preferences, evaluations, reports] = await Promise.all([
          prisma.improvementSuggestion.findMany({
            where: { userId, status: 'pending' },
            orderBy: { createdAt: 'desc' },
          }),
          prisma.userPreference.findMany({
            where: { userId },
            orderBy: { updatedAt: 'desc' },
          }),
          prisma.taskEvaluation.findMany({
            where: { userId },
            orderBy: { createdAt: 'desc' },
            take: 30,
          }),
          prisma.weeklyReport.findMany({
            where: { userId },
            orderBy: { createdAt: 'desc' },
            take: 10,
          }),
        ]);

        // Calculate aggregate statistics
        const total = evaluations.length;
        const avgAccuracy = total > 0 ? (evaluations.reduce((acc, curr) => acc + curr.accuracy, 0) / total).toFixed(2) : 'N/A';
        const avgClarity = total > 0 ? (evaluations.reduce((acc, curr) => acc + curr.clarity, 0) / total).toFixed(2) : 'N/A';
        const avgLatency = total > 0 ? Math.round(evaluations.reduce((acc, curr) => acc + curr.latencyMs, 0) / total) : 0;
        const failedTasks = evaluations.filter((e) => !e.toolSuccess || e.accuracy <= 2).length;

        return reply.send({
          success: true,
          data: {
            suggestions,
            preferences,
            performance: {
              totalRuns: total,
              avgAccuracy,
              avgClarity,
              avgLatency,
              failedCount: failedTasks,
            },
            recentEvaluations: evaluations.slice(0, 10),
            reports,
          },
        });
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        logger.error(`Failed to load learning dashboard: ${msg}`);
        return reply.status(500).send({ success: false, error: 'Failed to load learning parameters' });
      }
    },
  );

  // ── 2. Approve Suggestion ──────────────────────────────
  app.post(
    '/api/learning/suggestions/:id/approve',
    { preHandler: [authMiddleware] },
    async (request: FastifyRequest, reply) => {
      const userId = request.user!.userId;
      const { id } = request.params as { id: string };

      try {
        const suggestion = await prisma.improvementSuggestion.findFirst({
          where: { id, userId, status: 'pending' },
        });

        if (!suggestion) {
          return reply.status(404).send({ success: false, error: 'Pending suggestion not found' });
        }

        // Apply suggestion action based on type
        const payload = JSON.parse(suggestion.payload);

        if (suggestion.type === 'prompt') {
          // Add a new active prompt version
          const newPrompt = await createPromptVersion(
            payload.target || 'routing',
            payload.tweak || 'Enhanced routing safety prompt.',
            `Optimized: ${suggestion.title}`,
            userId,
          );
          // Auto activate approved version
          await activatePromptVersion(newPrompt.name, newPrompt.version);
        }

        // Update suggestion state
        const updated = await prisma.improvementSuggestion.update({
          where: { id },
          data: { status: 'approved' },
        });

        // Log audit event
        await prisma.auditEvent.create({
          data: {
            userId,
            action: 'learning.suggestion_approved',
            status: 'success',
            details: JSON.stringify({ suggestionId: id, type: suggestion.type }),
          },
        });

        return reply.send({ success: true, data: updated, message: 'Suggestion approved and applied successfully.' });
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        logger.error(`Failed to approve suggestion: ${msg}`);
        return reply.status(500).send({ success: false, error: 'Failed to apply recommendation' });
      }
    },
  );

  // ── 3. Reject Suggestion ──────────────────────────────
  app.post(
    '/api/learning/suggestions/:id/reject',
    { preHandler: [authMiddleware] },
    async (request: FastifyRequest, reply) => {
      const userId = request.user!.userId;
      const { id } = request.params as { id: string };

      try {
        const updated = await prisma.improvementSuggestion.updateMany({
          where: { id, userId, status: 'pending' },
          data: { status: 'rejected' },
        });

        if (updated.count === 0) {
          return reply.status(404).send({ success: false, error: 'Pending suggestion not found' });
        }

        return reply.send({ success: true, message: 'Recommendation dismissed' });
      } catch (err) {
        return reply.status(500).send({ success: false, error: 'Failed to reject recommendation' });
      }
    },
  );

  // ── 4. List User Preferences ────────────────────────────
  app.get(
    '/api/learning/preferences',
    { preHandler: [authMiddleware] },
    async (request: FastifyRequest, reply) => {
      const userId = request.user!.userId;
      const prefs = await prisma.userPreference.findMany({
        where: { userId },
        orderBy: { key: 'asc' },
      });

      return reply.send({ success: true, data: prefs });
    },
  );

  // ── 5. Edit Preference ─────────────────────────────────
  app.put(
    '/api/learning/preferences/:id',
    { preHandler: [authMiddleware] },
    async (request: FastifyRequest, reply) => {
      const userId = request.user!.userId;
      const { id } = request.params as { id: string };
      const { value } = request.body as { value: string };

      try {
        const pref = await prisma.userPreference.findFirst({
          where: { id, userId },
        });

        if (!pref) {
          return reply.status(404).send({ success: false, error: 'Preference not found' });
        }

        const updated = await prisma.userPreference.update({
          where: { id },
          data: { value, source: 'explicit' }, // override source flag
        });

        return reply.send({ success: true, data: updated });
      } catch (err) {
        return reply.status(500).send({ success: false, error: 'Failed to update preference' });
      }
    },
  );

  // ── 6. Delete Preference ───────────────────────────────
  app.delete(
    '/api/learning/preferences/:id',
    { preHandler: [authMiddleware] },
    async (request: FastifyRequest, reply) => {
      const userId = request.user!.userId;
      const { id } = request.params as { id: string };

      try {
        const pref = await prisma.userPreference.findFirst({
          where: { id, userId },
        });

        if (!pref) {
          return reply.status(404).send({ success: false, error: 'Preference not found' });
        }

        await prisma.userPreference.delete({ where: { id } });
        return reply.send({ success: true, message: 'Preference removed successfully' });
      } catch (err) {
        return reply.status(500).send({ success: false, error: 'Failed to delete preference' });
      }
    },
  );

  // ── 7. Generate Weekly Report On-Demand ────────────────
  app.post(
    '/api/learning/reports/generate',
    { preHandler: [authMiddleware] },
    async (request: FastifyRequest, reply) => {
      const userId = request.user!.userId;

      try {
        const report = await compileWeeklyReport(userId);
        return reply.send({ success: true, data: report });
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        return reply.status(500).send({ success: false, error: `Failed to compile report: ${msg}` });
      }
    },
  );

  // ── 8. Run Experiment Benchmark ────────────────────────
  app.post(
    '/api/learning/experiments/run',
    { preHandler: [authMiddleware] },
    async (request: FastifyRequest, reply) => {
      const userId = request.user!.userId;
      const { name, promptName, testPrompt, basePrompt } = request.body as {
        name: string;
        promptName: string;
        testPrompt: string;
        basePrompt: string;
      };

      try {
        const run = await runPromptBenchmark(userId, name, promptName, testPrompt, basePrompt);
        return reply.send({ success: true, data: run });
      } catch (err) {
        return reply.status(500).send({ success: false, error: 'Failed to spawn benchmark experiment' });
      }
    },
  );
}
