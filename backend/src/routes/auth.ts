import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { prisma } from '../database/client.js';
import { hashPassword, verifyPassword, generateToken } from '../services/auth.js';
import type { ApiResponse } from '../types/index.js';

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  name: z.string().min(1).max(100),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string(),
});

export async function authRoutes(app: FastifyInstance): Promise<void> {
  // ── Register ──────────────────────────────────────────
  app.post('/api/auth/register', async (request, reply) => {
    try {
      const body = registerSchema.parse(request.body);

      // Check for existing user
      const existing = await prisma.user.findUnique({
        where: { email: body.email },
      });
      if (existing) {
        return reply.status(409).send({
          success: false,
          error: 'Email already registered',
        } satisfies ApiResponse);
      }

      const passwordHash = await hashPassword(body.password);
      const user = await prisma.user.create({
        data: {
          email: body.email,
          name: body.name,
          passwordHash,
          settings: {
            create: {},
          },
        },
      });

      const token = generateToken({ userId: user.id, email: user.email });

      return reply.status(201).send({
        success: true,
        data: {
          token,
          user: { id: user.id, email: user.email, name: user.name },
        },
      } satisfies ApiResponse);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return reply.status(400).send({
          success: false,
          error: error.errors.map((e) => e.message).join(', '),
        } satisfies ApiResponse);
      }
      throw error;
    }
  });

  // ── Login ─────────────────────────────────────────────
  app.post('/api/auth/login', async (request, reply) => {
    try {
      const body = loginSchema.parse(request.body);

      const user = await prisma.user.findUnique({
        where: { email: body.email },
      });

      if (!user || !(await verifyPassword(body.password, user.passwordHash))) {
        return reply.status(401).send({
          success: false,
          error: 'Invalid email or password',
        } satisfies ApiResponse);
      }

      const token = generateToken({ userId: user.id, email: user.email });

      return reply.send({
        success: true,
        data: {
          token,
          user: { id: user.id, email: user.email, name: user.name },
        },
      } satisfies ApiResponse);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return reply.status(400).send({
          success: false,
          error: error.errors.map((e) => e.message).join(', '),
        } satisfies ApiResponse);
      }
      throw error;
    }
  });

  // ── Google OAuth Login ─────────────────────────────────
  app.post('/api/auth/google', async (request, reply) => {
    try {
      const { credential } = z.object({ credential: z.string() }).parse(request.body);

      // Verify token with Google's public endpoint
      const googleRes = await fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${credential}`);
      if (!googleRes.ok) {
        return reply.status(401).send({
          success: false,
          error: 'Invalid Google credential token',
        } satisfies ApiResponse);
      }

      const googleUser = (await googleRes.json()) as {
        email: string;
        name: string;
        picture?: string;
        email_verified?: string | boolean;
      };

      if (!googleUser.email) {
        return reply.status(400).send({
          success: false,
          error: 'Google account has no email address',
        } satisfies ApiResponse);
      }

      // Check for existing user
      let user = await prisma.user.findUnique({
        where: { email: googleUser.email },
      });

      if (!user) {
        // Create user with a strong random password hash to prevent local login using default credentials
        const randomPassword = Math.random().toString(36) + Math.random().toString(36);
        const passwordHash = await hashPassword(randomPassword);

        user = await prisma.user.create({
          data: {
            email: googleUser.email,
            name: googleUser.name || googleUser.email.split('@')[0],
            passwordHash,
            avatarUrl: googleUser.picture || null,
            settings: {
              create: {},
            },
          },
        });
      } else if (googleUser.picture && user.avatarUrl !== googleUser.picture) {
        // Sync avatar updates from Google profile
        user = await prisma.user.update({
          where: { id: user.id },
          data: { avatarUrl: googleUser.picture },
        });
      }

      const token = generateToken({ userId: user.id, email: user.email });

      return reply.send({
        success: true,
        data: {
          token,
          user: { id: user.id, email: user.email, name: user.name, avatarUrl: user.avatarUrl },
        },
      } satisfies ApiResponse);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return reply.status(400).send({
          success: false,
          error: error.errors.map((e) => e.message).join(', '),
        } satisfies ApiResponse);
      }
      throw error;
    }
  });

  // ── Get current user ─────────────────────────────────
  app.get('/api/auth/me', async (request, reply) => {
    const authHeader = request.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      return reply.status(401).send({ success: false, error: 'Not authenticated' });
    }

    try {
      const { verifyToken } = await import('../services/auth.js');
      const payload = verifyToken(authHeader.slice(7));
      const user = await prisma.user.findUnique({
        where: { id: payload.userId },
        select: { id: true, email: true, name: true, avatarUrl: true, createdAt: true },
      });

      if (!user) {
        return reply.status(404).send({ success: false, error: 'User not found' });
      }

      return reply.send({ success: true, data: user });
    } catch {
      return reply.status(401).send({ success: false, error: 'Invalid token' });
    }
  });
}
