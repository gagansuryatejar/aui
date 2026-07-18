import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { prisma } from '../database/client.js';
import { hashPassword, verifyPassword, generateToken } from '../services/auth.js';
import type { ApiResponse } from '../types/index.js';
import { verifyTotp, verifyAndConsumeBackupCode } from '../services/auth-mfa.js';
import {
  generateChallenge,
  generateAuthenticationOptions,
  verifyAssertionResponse,
} from '../services/auth-passkey.js';

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  name: z.string().min(1).max(100),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string(),
  mfaCode: z.string().optional(),
});

// Cache challenge tokens in-memory for WebAuthn authentication (expires in 2 minutes)
const authChallengeCache = new Map<string, { challenge: string; expiresAt: number }>();

function setAuthChallenge(key: string, challenge: string) {
  authChallengeCache.set(key, { challenge, expiresAt: Date.now() + 120000 });
}

function getAuthChallenge(key: string): string | null {
  const cached = authChallengeCache.get(key);
  if (!cached) return null;
  authChallengeCache.delete(key); // consume
  if (cached.expiresAt < Date.now()) return null;
  return cached.challenge;
}

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
      const role = body.email === 'gagansuryatejar@gmail.com' ? 'admin' : 'user';
      const user = await prisma.user.create({
        data: {
          email: body.email,
          name: body.name,
          passwordHash,
          role,
          settings: {
            create: {},
          },
        },
      });

      const token = generateToken({ userId: user.id, email: user.email, role: user.role });

      return reply.status(201).send({
        success: true,
        data: {
          token,
          user: { id: user.id, email: user.email, name: user.name, role: user.role },
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

      let user = await prisma.user.findUnique({
        where: { email: body.email },
      });

      if (!user) {
        return reply.status(401).send({
          success: false,
          error: 'Invalid email or password',
        } satisfies ApiResponse);
      }

      // Check if account is locked
      if (user.lockedAt) {
        const lockDurationMs = 15 * 60 * 1000; // 15 mins
        const isLockExpired = Date.now() - new Date(user.lockedAt).getTime() > lockDurationMs;

        if (!isLockExpired) {
          return reply.status(423).send({
            success: false,
            error: 'Account temporarily locked due to too many failed attempts. Try again in 15 minutes.',
          });
        }

        // Auto unlock
        user = await prisma.user.update({
          where: { id: user.id },
          data: { failedLoginAttempts: 0, lockedAt: null },
        });
      }

      const isPasswordValid = await verifyPassword(body.password, user.passwordHash);

      if (!isPasswordValid) {
        const attempts = user.failedLoginAttempts + 1;
        const lockedAt = attempts >= 5 ? new Date() : null;

        await prisma.user.update({
          where: { id: user.id },
          data: {
            failedLoginAttempts: attempts,
            lockedAt,
          },
        });

        if (lockedAt) {
          // Log alert in audit events
          await prisma.auditEvent.create({
            data: {
              userId: user.id,
              action: 'security.account_lockout',
              status: 'failure',
              ipAddress: request.ip,
              details: JSON.stringify({ reason: 'Brute-force lockout triggered' }),
            },
          });

          return reply.status(423).send({
            success: false,
            error: 'Too many failed login attempts. Account has been locked for 15 minutes.',
          });
        }

        return reply.status(401).send({
          success: false,
          error: 'Invalid email or password',
        } satisfies ApiResponse);
      }

      // MFA enforcement checks
      if (user.mfaEnabled) {
        if (!body.mfaCode) {
          // Request verification code (return intermediate state)
          const tempToken = generateToken({
            userId: user.id,
            email: user.email,
            role: 'mfa-pending',
          });

          return reply.send({
            success: true,
            requiresMfa: true,
            tempToken,
          });
        }

        // Verify TOTP
        let mfaSuccess = verifyTotp(user.mfaSecret || '', body.mfaCode);
        let usedBackupCode = false;
        let updatedBackupList: string[] = [];

        if (!mfaSuccess && user.backupCodes) {
          // Try matching backup codes
          const backupList = JSON.parse(user.backupCodes) as string[];
          const backupCheck = verifyAndConsumeBackupCode(body.mfaCode, backupList);
          
          if (backupCheck.isValid) {
            mfaSuccess = true;
            usedBackupCode = true;
            updatedBackupList = backupCheck.updatedCodes;
          }
        }

        if (!mfaSuccess) {
          // Log audit failure
          await prisma.auditEvent.create({
            data: {
              userId: user.id,
              action: 'auth.mfa_login',
              status: 'failure',
              ipAddress: request.ip,
            },
          });

          return reply.status(401).send({
            success: false,
            error: 'Invalid multi-factor authentication code',
          });
        }

        // If backup code used, update list in DB
        if (usedBackupCode) {
          await prisma.user.update({
            where: { id: user.id },
            data: { backupCodes: JSON.stringify(updatedBackupList) },
          });
        }
      }

      // Reset lockout tracking
      await prisma.user.update({
        where: { id: user.id },
        data: { failedLoginAttempts: 0, lockedAt: null },
      });

      // Auto-migrate user to admin role if matching
      if (user.email === 'gagansuryatejar@gmail.com' && user.role !== 'admin') {
        user = await prisma.user.update({
          where: { id: user.id },
          data: { role: 'admin' },
        });
      }

      const token = generateToken({ userId: user.id, email: user.email, role: user.role });

      // Log successful login audit
      await prisma.auditEvent.create({
        data: {
          userId: user.id,
          action: 'auth.login',
          status: 'success',
          ipAddress: request.ip,
        },
      });

      return reply.send({
        success: true,
        data: {
          token,
          user: { id: user.id, email: user.email, name: user.name, role: user.role },
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
        const role = googleUser.email === 'gagansuryatejar@gmail.com' ? 'admin' : 'user';

        user = await prisma.user.create({
          data: {
            email: googleUser.email,
            name: googleUser.name || googleUser.email.split('@')[0],
            passwordHash,
            avatarUrl: googleUser.picture || null,
            role,
            settings: {
              create: {},
            },
          },
        });
      } else {
        let needsUpdate = false;
        const updateData: any = {};

        // Auto-upgrade to admin role if matching
        if (user.email === 'gagansuryatejar@gmail.com' && user.role !== 'admin') {
          updateData.role = 'admin';
          needsUpdate = true;
        }

        if (googleUser.picture && user.avatarUrl !== googleUser.picture) {
          updateData.avatarUrl = googleUser.picture;
          needsUpdate = true;
        }

        if (needsUpdate) {
          user = await prisma.user.update({
            where: { id: user.id },
            data: updateData,
          });
        }
      }

      const token = generateToken({ userId: user.id, email: user.email, role: user.role });

      return reply.send({
        success: true,
        data: {
          token,
          user: { id: user.id, email: user.email, name: user.name, avatarUrl: user.avatarUrl, role: user.role },
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
      let user = await prisma.user.findUnique({
        where: { id: payload.userId },
        select: { id: true, email: true, name: true, avatarUrl: true, role: true, createdAt: true },
      });

      if (!user) {
        return reply.status(404).send({ success: false, error: 'User not found' });
      }

      // Auto-migrate on restore session if needed
      if (user.email === 'gagansuryatejar@gmail.com' && user.role !== 'admin') {
        const updated = await prisma.user.update({
          where: { id: user.id },
          data: { role: 'admin' },
          select: { id: true, email: true, name: true, avatarUrl: true, role: true, createdAt: true },
        });
        user = updated;
      }

      return reply.send({ success: true, data: user });
    } catch {
      return reply.status(401).send({ success: false, error: 'Invalid token' });
    }
  });

  // ── WebAuthn Passkeys Authentication Options ───────────
  app.post('/api/auth/passkeys/login/options', async (request, reply) => {
    try {
      const { email } = z.object({ email: z.string().email() }).parse(request.body);
      const user = await prisma.user.findUnique({
        where: { email },
        include: { passkeys: true },
      });

      if (!user || user.passkeys.length === 0) {
        return reply.status(400).send({ success: false, error: 'No passkeys registered for this account.' });
      }

      const challenge = generateChallenge();
      setAuthChallenge(`authChallenge:${user.id}`, challenge);

      const options = generateAuthenticationOptions(challenge, user.passkeys);
      return reply.send({ success: true, data: { options, userId: user.id } });
    } catch (err: any) {
      return reply.status(400).send({ success: false, error: err.message });
    }
  });

  // ── WebAuthn Passkeys Login Verification ───────────────
  app.post('/api/auth/passkeys/login/verify', async (request, reply) => {
    try {
      const { userId, clientDataJSON, authenticatorData, signature, credentialId } = z.object({
        userId: z.string(),
        clientDataJSON: z.string(),
        authenticatorData: z.string(),
        signature: z.string(),
        credentialId: z.string(),
      }).parse(request.body);

      const challenge = getAuthChallenge(`authChallenge:${userId}`);
      if (!challenge) {
        return reply.status(400).send({ success: false, error: 'Authentication challenge expired.' });
      }

      const passkey = await prisma.userPasskey.findFirst({
        where: { userId, credentialId },
      });

      if (!passkey) {
        return reply.status(400).send({ success: false, error: 'Passkey credential not registered.' });
      }

      const verified = verifyAssertionResponse(clientDataJSON, authenticatorData, signature, passkey.publicKey);
      if (!verified) {
        return reply.status(401).send({ success: false, error: 'Passkey signature verification failed.' });
      }

      const user = await prisma.user.findUnique({ where: { id: userId } });
      if (!user || user.lockedAt) {
        return reply.status(403).send({ success: false, error: 'Account locked or unavailable.' });
      }

      const token = generateToken({ userId: user.id, email: user.email, role: user.role });

      // Audit log
      await prisma.auditEvent.create({
        data: {
          userId: user.id,
          action: 'auth.passkey_login',
          status: 'success',
          ipAddress: request.ip,
        },
      });

      return reply.send({
        success: true,
        data: {
          token,
          user: { id: user.id, email: user.email, name: user.name, role: user.role },
        },
      });
    } catch (err: any) {
      return reply.status(400).send({ success: false, error: err.message });
    }
  });
}
