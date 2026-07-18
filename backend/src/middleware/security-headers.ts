import type { FastifyRequest, FastifyReply, FastifyInstance } from 'fastify';
import { logger } from '../services/logger.js';

/**
 * Security Headers Middleware – configures additional zero-trust protections.
 * Integrates CSRF protection, CSP overrides, frame-busting, and strict referrer policies.
 */

export function configureSecurityHeaders(app: FastifyInstance) {
  // CORS check & frame busting hook
  app.addHook('onRequest', async (request: FastifyRequest, reply: FastifyReply) => {
    // 1. Frame Busting (Anti-Clickjacking)
    reply.header('X-Frame-Options', 'DENY');
    
    // 2. Strict Content-Type Sniffing
    reply.header('X-Content-Type-Options', 'nosniff');
    
    // 3. Strict Referrer Policy
    reply.header('Referrer-Policy', 'strict-origin-when-cross-origin');
    
    // 4. Content Security Policy (enforcing local script limits)
    reply.header(
      'Content-Security-Policy',
      "default-src 'self'; script-src 'self' 'unsafe-inline' https://accounts.google.com; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; img-src 'self' data: https:; connect-src 'self' http://localhost:4000 ws://localhost:4000; frame-src 'self' https://accounts.google.com; object-src 'none';"
    );
  });

  // CSRF validation hook on mutating requests (POST, PUT, DELETE, PATCH)
  app.addHook('preValidation', async (request: FastifyRequest, reply: FastifyReply) => {
    const method = request.method;
    const isMutating = ['POST', 'PUT', 'DELETE', 'PATCH'].includes(method);
    if (!isMutating) return;

    // Skip validation for auth / chat endpoints to allow clients to stream easily
    const bypassRoutes = ['/api/auth/login', '/api/auth/register', '/api/chat', '/api/auth/google'];
    if (bypassRoutes.includes(request.routeOptions?.url || '')) return;

    // Zero-trust custom header validation (e.g. 'x-requested-with' or custom anti-CSRF token)
    const clientHeader = request.headers['x-requested-with'] || request.headers['x-csrf-token'];
    const origin = request.headers.origin;
    const host = request.headers.host;

    if (origin && origin.includes('localhost') === false && clientHeader !== 'aui-client') {
      logger.warn(`🛡️ CSRF Alert: Mutation blocked. Method: ${method}, Route: ${request.url}, Origin: ${origin}`);
      return reply.status(403).send({
        success: false,
        error: 'Forbidden: CSRF validation check failed. Missing secure custom request header.',
      });
    }
  });
}
