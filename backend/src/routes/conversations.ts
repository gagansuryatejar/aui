import type { FastifyInstance, FastifyRequest } from 'fastify';
import { authMiddleware, optionalAuth } from '../middleware/auth.js';
import { prisma } from '../database/client.js';
import type { ApiResponse } from '../types/index.js';

export async function conversationRoutes(app: FastifyInstance): Promise<void> {
  // ── List conversations ─────────────────────────────
  app.get(
    '/api/conversations',
    { preHandler: [optionalAuth] },
    async (request: FastifyRequest, reply) => {
      const userId = request.user?.userId;
      if (!userId) {
        return reply.send({
          success: true,
          data: [],
        } satisfies ApiResponse);
      }

      const conversations = await prisma.conversation.findMany({
        where: { userId },
        orderBy: { updatedAt: 'desc' },
        include: {
          messages: {
            take: 1,
            orderBy: { createdAt: 'desc' },
            select: { content: true, role: true, createdAt: true },
          },
          folder: { select: { id: true, name: true, color: true } },
        },
      });

      return reply.send({
        success: true,
        data: conversations,
      } satisfies ApiResponse);
    },
  );

  // ── Get conversation with messages ─────────────────
  app.get(
    '/api/conversations/:id',
    { preHandler: [authMiddleware] },
    async (request: FastifyRequest, reply) => {
      const userId = request.user!.userId;
      const { id } = request.params as { id: string };

      const conversation = await prisma.conversation.findFirst({
        where: { id, userId },
        include: {
          messages: {
            orderBy: { createdAt: 'asc' },
          },
        },
      });

      if (!conversation) {
        return reply.status(404).send({
          success: false,
          error: 'Conversation not found',
        } satisfies ApiResponse);
      }

      return reply.send({
        success: true,
        data: conversation,
      } satisfies ApiResponse);
    },
  );

  // ── Update conversation (title, pin, folder) ──────
  app.patch(
    '/api/conversations/:id',
    { preHandler: [authMiddleware] },
    async (request: FastifyRequest, reply) => {
      const userId = request.user!.userId;
      const { id } = request.params as { id: string };
      const body = request.body as { title?: string; pinned?: boolean; folderId?: string | null };

      const conversation = await prisma.conversation.findFirst({
        where: { id, userId },
      });
      if (!conversation) {
        return reply.status(404).send({
          success: false,
          error: 'Conversation not found',
        } satisfies ApiResponse);
      }

      const updated = await prisma.conversation.update({
        where: { id },
        data: {
          ...(body.title !== undefined && { title: body.title }),
          ...(body.pinned !== undefined && { pinned: body.pinned }),
          ...(body.folderId !== undefined && { folderId: body.folderId }),
        },
      });

      return reply.send({
        success: true,
        data: updated,
      } satisfies ApiResponse);
    },
  );

  // ── Delete conversation ────────────────────────────
  app.delete(
    '/api/conversations/:id',
    { preHandler: [authMiddleware] },
    async (request: FastifyRequest, reply) => {
      const userId = request.user!.userId;
      const { id } = request.params as { id: string };

      const conversation = await prisma.conversation.findFirst({
        where: { id, userId },
      });
      if (!conversation) {
        return reply.status(404).send({
          success: false,
          error: 'Conversation not found',
        } satisfies ApiResponse);
      }

      await prisma.conversation.delete({ where: { id } });

      return reply.send({
        success: true,
        message: 'Conversation deleted',
      } satisfies ApiResponse);
    },
  );

  // ── Folders ────────────────────────────────────────
  app.get(
    '/api/folders',
    { preHandler: [optionalAuth] },
    async (request: FastifyRequest, reply) => {
      const userId = request.user?.userId;
      if (!userId) {
        return reply.send({ success: true, data: [] } satisfies ApiResponse);
      }

      const folders = await prisma.folder.findMany({
        where: { userId },
        orderBy: { name: 'asc' },
        include: {
          _count: { select: { conversations: true } },
        },
      });

      return reply.send({ success: true, data: folders } satisfies ApiResponse);
    },
  );

  app.post(
    '/api/folders',
    { preHandler: [authMiddleware] },
    async (request: FastifyRequest, reply) => {
      const userId = request.user!.userId;
      const { name, color } = request.body as { name: string; color?: string };

      const folder = await prisma.folder.create({
        data: { userId, name, color: color || '#6366f1' },
      });

      return reply.status(201).send({
        success: true,
        data: folder,
      } satisfies ApiResponse);
    },
  );

  app.delete(
    '/api/folders/:id',
    { preHandler: [authMiddleware] },
    async (request: FastifyRequest, reply) => {
      const { id } = request.params as { id: string };
      await prisma.folder.delete({ where: { id } });
      return reply.send({ success: true, message: 'Folder deleted' } satisfies ApiResponse);
    },
  );
}
