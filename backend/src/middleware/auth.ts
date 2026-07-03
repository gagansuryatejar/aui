import type { FastifyRequest, FastifyReply } from 'fastify';
import { verifyToken } from '../services/auth.js';
import type { AuthPayload } from '../types/index.js';

declare module 'fastify' {
  interface FastifyRequest {
    user?: AuthPayload;
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

  try {
    const token = authHeader.slice(7);
    const payload = verifyToken(token);
    request.user = payload;
  } catch {
    return reply.status(401).send({
      success: false,
      error: 'Invalid or expired token',
    });
  }
}

/**
 * Optional auth – sets request.user if token is present, but doesn't reject
 */
export async function optionalAuth(request: FastifyRequest): Promise<void> {
  const authHeader = request.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) return;

  try {
    const token = authHeader.slice(7);
    request.user = verifyToken(token);
  } catch {
    // Silently ignore invalid tokens for optional auth
  }
}
