import type { FastifyInstance, FastifyRequest } from 'fastify';
import { v4 as uuidv4 } from 'uuid';
import { executeChatStream } from '../services/smart-router.js';
import { authMiddleware } from '../middleware/auth.js';
import { prisma } from '../database/client.js';
import { logger } from '../services/logger.js';
import type { ChatMessage } from '../types/index.js';

export async function chatRoutes(app: FastifyInstance): Promise<void> {
  // ── Streaming chat endpoint (SSE) ────────────────────
  app.post(
    '/api/chat',
    { preHandler: [authMiddleware] },
    async (request: FastifyRequest, reply) => {
      const body = request.body as {
        conversationId?: string;
        messages: ChatMessage[];
        webSearch?: boolean;
      };

      const userId = request.user!.userId;
      const messages = body.messages || [];

      if (!messages.length) {
        return reply.status(400).send({
          success: false,
          error: 'Messages array is required',
        });
      }

      // Get or create conversation
      let conversationId = body.conversationId;
      if (!conversationId) {
        // Create a new conversation
        const firstUserMsg = messages.find((m) => m.role === 'user');
        const title =
          firstUserMsg?.content.slice(0, 80) || 'New Chat';

        const conversation = await prisma.conversation.create({
          data: {
            id: uuidv4(),
            userId,
            title,
          },
        });
        conversationId = conversation.id;
      }

      // Store the user message
      const lastUserMsg = messages[messages.length - 1];
      if (lastUserMsg?.role === 'user') {
        await prisma.message.create({
          data: {
            id: lastUserMsg.id || uuidv4(),
            conversationId,
            role: 'user',
            content: lastUserMsg.content,
          },
        });
      }

      // Set up SSE headers
      reply.hijack();
      const sseHeaders = {
        ...(reply.getHeaders() as Record<string, string>),
        'content-type': 'text/event-stream',
        'cache-control': 'no-cache',
        'connection': 'keep-alive',
        'x-accel-buffering': 'no',
      };
      reply.raw.writeHead(200, sseHeaders);

      // Send the conversation ID first
      reply.raw.write(
        `data: ${JSON.stringify({ type: 'conversation', conversationId })}\n\n`,
      );

      let fullContent = '';
      let usedProvider = '';
      let usedModel = '';
      const startTime = Date.now();

      try {
        const stream = executeChatStream(messages, body.webSearch);

        for await (const chunk of stream) {
          if (chunk.type === 'metadata') {
            usedProvider = (chunk.metadata?.provider as string) || '';
            usedModel = (chunk.metadata?.model as string) || '';
            reply.raw.write(
              `data: ${JSON.stringify({ type: 'metadata', provider: usedProvider, model: usedModel })}\n\n`,
            );
          } else if ((chunk.type as string) === 'searching') {
            reply.raw.write(
              `data: ${JSON.stringify({ type: 'searching', query: chunk.content })}\n\n`,
            );
          } else if ((chunk.type as string) === 'search_results') {
            reply.raw.write(
              `data: ${JSON.stringify({ type: 'search_results', results: chunk.content, metadata: chunk.metadata })}\n\n`,
            );
          } else if (chunk.type === 'text') {
            fullContent += chunk.content;
            reply.raw.write(
              `data: ${JSON.stringify({ type: 'text', content: chunk.content })}\n\n`,
            );
          } else if (chunk.type === 'done') {
            reply.raw.write(`data: ${JSON.stringify({ type: 'done' })}\n\n`);
          } else if (chunk.type === 'error') {
            reply.raw.write(
              `data: ${JSON.stringify({ type: 'error', content: chunk.content })}\n\n`,
            );
          }
        }
      } catch (error: unknown) {
        const msg = error instanceof Error ? error.message : 'Stream error';
        logger.error(`Chat stream error: ${msg}`);
        reply.raw.write(
          `data: ${JSON.stringify({ type: 'error', content: msg })}\n\n`,
        );
      }

      // Store assistant message
      if (fullContent) {
        const latencyMs = Date.now() - startTime;
        await prisma.message.create({
          data: {
            id: uuidv4(),
            conversationId,
            role: 'assistant',
            content: fullContent,
            provider: usedProvider,
            model: usedModel,
            latencyMs,
          },
        });

        // Update conversation title if it's the first exchange
        const msgCount = await prisma.message.count({
          where: { conversationId },
        });
        if (msgCount <= 2) {
          const title =
            messages
              .find((m) => m.role === 'user')
              ?.content.slice(0, 80) || 'New Chat';
          await prisma.conversation.update({
            where: { id: conversationId },
            data: { title },
          });
        }

        // Log analytics
        await prisma.analyticsEvent.create({
          data: {
            type: 'chat_completion',
            userId,
            provider: usedProvider,
            model: usedModel,
            latencyMs,
            success: true,
          },
        });
      }

      reply.raw.end();
    },
  );
}
