import type { FastifyRequest, FastifyReply } from 'fastify';
import crypto from 'crypto';
import { verifyToken } from '../services/auth.js';
import type { AuthPayload } from '../types/index.js';
import { prisma } from '../database/client.js';

declare module 'fastify' {
  interface FastifyRequest {
    user?: AuthPayload;
    apiKeyName?: string;
  }
}

export async function authMiddleware(
  request: FastifyRequest,
  reply: FastifyReply,
): Promise<void> {
  const authHeader = request.headers.authorization;

  if (!authHeader?.startsWith('Bearer ')) {
    return reply.status(401).send({
      success: false,
      error: 'Missing or invalid authorization header',
    });
  }

  const token = authHeader.slice(7);

  // Check if it's a programmatic developer API key (starts with aui_)
  if (token.startsWith('aui_')) {
    try {
      const keyHash = crypto.createHash('sha256').update(token).digest('hex');
      const apiKey = await prisma.userApiKey.findUnique({
        where: { keyHash },
        include: { user: true },
      });

      if (!apiKey || (apiKey.expiresAt && apiKey.expiresAt < new Date())) {
        return reply.status(401).send({ success: false, error: 'Invalid or expired API Key' });
      }

      if (apiKey.user.lockedAt) {
        return reply.status(403).send({ success: false, error: 'User account is locked for emergency security' });
      }

      // Update lastUsed async
      prisma.userApiKey.update({
        where: { id: apiKey.id },
        data: { lastUsed: new Date() },
      }).catch(() => {});

      request.user = {
        userId: apiKey.userId,
        email: apiKey.user.email,
        role: apiKey.user.role,
      };
      request.apiKeyName = apiKey.name;
      return;
    } catch (err) {
      return reply.status(401).send({ success: false, error: 'API key verification error' });
    }
  }

  // standard JWT token path
  try {
    const payload = verifyToken(token);
    
    // Check if account is locked
    const user = await prisma.user.findUnique({ where: { id: payload.userId } });
    if (!user || user.lockedAt) {
      return reply.status(403).send({
        success: false,
        error: 'Account locked or unavailable',
      });
    }

    request.user = payload;
  } catch {
    return reply.status(401).send({
      success: false,
      error: 'Invalid or expired token',
    });
  }
}

export async function optionalAuth(request: FastifyRequest): Promise<void> {
  const authHeader = request.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) return;

  const token = authHeader.slice(7);

  if (token.startsWith('aui_')) {
    try {
      const keyHash = crypto.createHash('sha256').update(token).digest('hex');
      const apiKey = await prisma.userApiKey.findUnique({
        where: { keyHash },
        include: { user: true },
      });

      if (apiKey && (!apiKey.expiresAt || apiKey.expiresAt > new Date()) && !apiKey.user.lockedAt) {
        request.user = {
          userId: apiKey.userId,
          email: apiKey.user.email,
          role: apiKey.user.role,
        };
        request.apiKeyName = apiKey.name;
      }
    } catch {}
    return;
  }

  try {
    const payload = verifyToken(token);
    const user = await prisma.user.findUnique({ where: { id: payload.userId } });
    if (user && !user.lockedAt) {
      request.user = payload;
    }
  } catch {
    // Silently ignore
  }
}
