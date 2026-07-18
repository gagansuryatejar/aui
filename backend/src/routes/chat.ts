import type { FastifyInstance, FastifyRequest } from 'fastify';
import { v4 as uuidv4 } from 'uuid';
import { executeChatStream } from '../services/smart-router.js';
import { optionalAuth } from '../middleware/auth.js';
import { prisma } from '../database/client.js';
import { logger } from '../services/logger.js';
import { extractAndSaveMemories, getMemoryContext, generateConversationSummary } from '../services/memory-engine.js';
import { analyzeConversationTone, getToneInstruction } from '../services/tone-detector.js';
import type { ChatMessage } from '../types/index.js';
import { scanUserInput, scanAiOutput } from '../services/ai-shield.js';
import { evaluateTurn } from '../services/learning-evaluator.js';
import { learnPreferences } from '../services/learning-report.js';

export async function chatRoutes(app: FastifyInstance): Promise<void> {
  // ── Streaming chat endpoint (SSE) ────────────────────
  app.post(
    '/api/chat',
    { preHandler: [optionalAuth] },
    async (request: FastifyRequest, reply) => {
      const body = request.body as {
        conversationId?: string;
        messages: ChatMessage[];
        webSearch?: boolean;
        persona?: string; // optional specialist persona key
        modelId?: string; // optional user selected model ID or 'consensus'
      };

      const userId = request.user?.userId;
      const messages = body.messages || [];
      const modelId = body.modelId;


      if (!messages.length) {
        return reply.status(400).send({
          success: false,
          error: 'Messages array is required',
        });
      }

      // ── AI Shield User Input Scan ─────────────────────────
      const lastUserMsg = messages[messages.length - 1];
      if (lastUserMsg && lastUserMsg.role === 'user') {
        const shieldResult = await scanUserInput(userId, lastUserMsg.content, body.conversationId);
        if (!shieldResult.isSafe) {
          reply.hijack();
          const sseHeaders = {
            ...(reply.getHeaders() as Record<string, string>),
            'content-type': 'text/event-stream',
            'cache-control': 'no-cache',
            'connection': 'keep-alive',
            'x-accel-buffering': 'no',
          };
          reply.raw.writeHead(200, sseHeaders);
          reply.raw.write(
            `data: ${JSON.stringify({ type: 'error', content: shieldResult.blockedReason })}\n\n`
          );
          reply.raw.end();
          return;
        }
        lastUserMsg.content = shieldResult.cleanedText;
      }

      // ── Detect emotional tone ──────────────────────────────
      const toneAnalysis = analyzeConversationTone(messages);
      const toneInstruction = getToneInstruction(toneAnalysis.tone);

      // ── Inject memory context for signed-in users ────────
      let augmentedMessages = [...messages];
      if (userId) {
        const memCtx = await getMemoryContext(userId);
        const toneCtx = toneInstruction
          ? `\n\n--- TONE CONTEXT ---\n${toneInstruction}\n--- END TONE ---`
          : '';
        const systemExtra = memCtx + toneCtx;

        if (systemExtra) {
          const hasSys = augmentedMessages[0]?.role === 'system';
          if (hasSys) {
            augmentedMessages[0] = {
              ...augmentedMessages[0],
              content: augmentedMessages[0].content + systemExtra,
            };
          } else {
            augmentedMessages = [
              {
                id: 'memory-context',
                role: 'system',
                content: 'You are AUI, a helpful AI assistant.' + systemExtra,
                timestamp: Date.now(),
              },
              ...augmentedMessages,
            ];
          }
        }
      } else if (toneInstruction) {
        // Even for guests, apply tone adjustments
        const hasSys = augmentedMessages[0]?.role === 'system';
        if (hasSys) {
          augmentedMessages[0] = {
            ...augmentedMessages[0],
            content: augmentedMessages[0].content + `\n\n${toneInstruction}`,
          };
        } else {
          augmentedMessages = [
            {
              id: 'tone-context',
              role: 'system',
              content: `You are AUI, a helpful AI assistant.\n\n${toneInstruction}`,
              timestamp: Date.now(),
            },
            ...augmentedMessages,
          ];
        }
      }

      // ── Inject persona system prompt if requested ────────
      if (body.persona) {
        let personaPrompt = body.persona;
        if (body.persona.includes('-') || body.persona.length > 0) {
          try {
            const { promises: fs } = await import('fs');
            const path = await import('path');
            const fileURLToPath = await import('url').then((u) => u.fileURLToPath);
            const __dirname = path.dirname(fileURLToPath(import.meta.url));
            const AGENTS_DIR = path.resolve(__dirname, '../../../agency-agents');

            // Find category subdirectories
            const entries = await fs.readdir(AGENTS_DIR, { withFileTypes: true });
            const categories = entries
              .filter((e) => e.isDirectory() && !e.name.startsWith('.'))
              .map((e) => e.name);

            let foundPath = '';
            for (const category of categories) {
              const catDir = path.join(AGENTS_DIR, category);
              try {
                const files = await fs.readdir(catDir);
                const matched = files.find((f) => f.replace('.md', '') === body.persona);
                if (matched) {
                  foundPath = path.join(catDir, matched);
                  break;
                }
              } catch {}
            }

            if (foundPath) {
              const rawContent = await fs.readFile(foundPath, 'utf-8');
              personaPrompt = rawContent.replace(/^---\n[\s\S]*?\n---\n?/, '').trim();
            }
          } catch {}
        }

        const personaContent = `You are acting as the following AI specialist persona. Follow this persona's identity, style, and mission exactly:\n\n${personaPrompt}\n\n---\n\n`;
        const hasSys = augmentedMessages[0]?.role === 'system';
        if (hasSys) {
          augmentedMessages[0] = {
            ...augmentedMessages[0],
            content: personaContent + augmentedMessages[0].content,
          };
        } else {
          augmentedMessages = [
            {
              id: 'persona-context',
              role: 'system',
              content: personaContent,
              timestamp: Date.now(),
            },
            ...augmentedMessages,
          ];
        }
      }

      // Get or create conversation
      let conversationId = body.conversationId;
      if (!conversationId) {
        conversationId = uuidv4();
        if (userId) {
          // Create a new conversation in database for signed-in users
          const firstUserMsg = messages.find((m) => m.role === 'user');
          const title = firstUserMsg?.content.slice(0, 80) || 'New Chat';

          const conversation = await prisma.conversation.create({
            data: {
              id: conversationId,
              userId,
              title,
            },
          });
          conversationId = conversation.id;
        }
      }

      // Store the user message for signed-in users
      if (userId && lastUserMsg?.role === 'user') {
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
        const stream = executeChatStream(augmentedMessages, body.webSearch, modelId);

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
            const cleanToken = scanAiOutput(chunk.content);
            fullContent += cleanToken;
            reply.raw.write(
              `data: ${JSON.stringify({ type: 'text', content: cleanToken })}\n\n`,
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

      // Store assistant message for signed-in users
      if (userId && fullContent) {
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

        // ── Extract memories in background (non-blocking) ────
        setImmediate(() => {
          extractAndSaveMemories(userId, conversationId!, messages).catch(() => {});
        });

        // ── Task evaluations and preference learning (async) ────
        if (lastUserMsg && lastUserMsg.role === 'user') {
          evaluateTurn(
            userId,
            conversationId!,
            uuidv4(),
            lastUserMsg.content,
            fullContent,
            latencyMs,
            3,
            true
          ).catch(() => {});

          learnPreferences(userId).catch(() => {});
        }

        // ── Generate conversation summary for longer chats ────
        const allMessages = await prisma.message.findMany({
          where: { conversationId },
          orderBy: { createdAt: 'asc' },
          select: { role: true, content: true },
        });
        if (allMessages.length >= 6) {
          setImmediate(() => {
            generateConversationSummary(userId, conversationId!, allMessages).catch(() => {});
          });
        }
      }

      reply.raw.end();
    },
  );
}
