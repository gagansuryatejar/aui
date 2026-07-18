import type { FastifyInstance, FastifyRequest } from 'fastify';
import crypto from 'crypto';
import { authMiddleware } from '../middleware/auth.js';
import { prisma } from '../database/client.js';
import { logger } from '../services/logger.js';
import {
  generateTotpSecret,
  verifyTotp,
  generateBackupCodes,
} from '../services/auth-mfa.js';
import {
  generateChallenge,
  generateRegistrationOptions,
  generateAuthenticationOptions,
  verifyRegistrationResponse,
  verifyAssertionResponse,
} from '../services/auth-passkey.js';
import { invalidateAllUserSessions } from '../services/session-manager.js';

// Cache challenge tokens in-memory for WebAuthn flow (expires in 2 minutes)
const challengeCache = new Map<string, { challenge: string; expiresAt: number }>();

function setChallenge(key: string, challenge: string) {
  challengeCache.set(key, { challenge, expiresAt: Date.now() + 120000 });
}

function getChallenge(key: string): string | null {
  const cached = challengeCache.get(key);
  if (!cached) return null;
  challengeCache.delete(key); // consume
  if (cached.expiresAt < Date.now()) return null;
  return cached.challenge;
}

export async function securityRoutes(app: FastifyInstance): Promise<void> {
  // ── 1. MFA setup (Generate Secret) ─────────────────────
  app.post(
    '/api/security/mfa/setup',
    { preHandler: [authMiddleware] },
    async (request: FastifyRequest, reply) => {
      const userId = request.user!.userId;
      const user = await prisma.user.findUnique({ where: { id: userId } });
      
      if (!user) {
        return reply.status(404).send({ success: false, error: 'User not found' });
      }

      const tempSecret = generateTotpSecret();
      // Generate OTP Auth URI for QR code generation
      const issuer = 'AUI_OS';
      const otpauthUri = `otpauth://totp/${issuer}:${user.email}?secret=${tempSecret}&issuer=${issuer}`;

      // Temporarily store the secret in challengeCache to verify in the next call
      setChallenge(`mfaSecret:${userId}`, tempSecret);

      return reply.send({
        success: true,
        data: {
          secret: tempSecret,
          otpauthUri,
        },
      });
    },
  );

  // ── 2. MFA verify (Enable MFA) ─────────────────────────
  app.post(
    '/api/security/mfa/verify',
    { preHandler: [authMiddleware] },
    async (request: FastifyRequest, reply) => {
      const userId = request.user!.userId;
      const { code } = request.body as { code: string };

      if (!code) {
        return reply.status(400).send({ success: false, error: 'Verification code required' });
      }

      const secret = getChallenge(`mfaSecret:${userId}`);
      if (!secret) {
        return reply.status(400).send({ success: false, error: 'MFA setup session expired. Try again.' });
      }

      const isValid = verifyTotp(secret, code);
      if (!isValid) {
        return reply.status(400).send({ success: false, error: 'Invalid verification code' });
      }

      // Generate backup codes
      const backup = generateBackupCodes(10);

      // Save to database
      await prisma.user.update({
        where: { id: userId },
        data: {
          mfaEnabled: true,
          mfaSecret: secret,
          backupCodes: JSON.stringify(backup.hashed),
        },
      });

      // Write audit event
      await prisma.auditEvent.create({
        data: {
          userId,
          action: 'security.mfa_enabled',
          status: 'success',
          ipAddress: request.ip,
        },
      });

      return reply.send({
        success: true,
        data: {
          backupCodes: backup.raw,
        },
      });
    },
  );

  // ── 3. MFA disable ─────────────────────────────────────
  app.post(
    '/api/security/mfa/disable',
    { preHandler: [authMiddleware] },
    async (request: FastifyRequest, reply) => {
      const userId = request.user!.userId;

      await prisma.user.update({
        where: { id: userId },
        data: {
          mfaEnabled: false,
          mfaSecret: null,
          backupCodes: '[]',
        },
      });

      // Audit event
      await prisma.auditEvent.create({
        data: {
          userId,
          action: 'security.mfa_disabled',
          status: 'success',
          ipAddress: request.ip,
        },
      });

      return reply.send({ success: true, message: 'Multi-factor authentication disabled' });
    },
  );

  // ── 4. Passkeys Registration Options ───────────────────
  app.post(
    '/api/security/passkeys/register/options',
    { preHandler: [authMiddleware] },
    async (request: FastifyRequest, reply) => {
      const userId = request.user!.userId;
      const user = await prisma.user.findUnique({ where: { id: userId } });
      if (!user) {
        return reply.status(404).send({ success: false, error: 'User not found' });
      }

      const challenge = generateChallenge();
      setChallenge(`registerChallenge:${userId}`, challenge);

      const options = generateRegistrationOptions(userId, user.email, challenge);
      return reply.send({ success: true, data: options });
    },
  );

  // ── 5. Passkeys Registration Verification ──────────────
  app.post(
    '/api/security/passkeys/register/verify',
    { preHandler: [authMiddleware] },
    async (request: FastifyRequest, reply) => {
      const userId = request.user!.userId;
      const body = request.body as {
        clientDataJSON: string;
        attestationObject: string;
      };

      const challenge = getChallenge(`registerChallenge:${userId}`);
      if (!challenge) {
        return reply.status(400).send({ success: false, error: 'Registration challenge expired' });
      }

      const result = verifyRegistrationResponse(body.clientDataJSON, body.attestationObject);
      if (!result.success) {
        return reply.status(400).send({ success: false, error: 'WebAuthn attestation verification failed' });
      }

      // Save credential
      await prisma.userPasskey.create({
        data: {
          userId,
          credentialId: result.credentialId,
          publicKey: result.publicKeyPem,
        },
      });

      // Audit event
      await prisma.auditEvent.create({
        data: {
          userId,
          action: 'security.passkey_registered',
          status: 'success',
          ipAddress: request.ip,
        },
      });

      return reply.send({ success: true, message: 'Passkey biometric registered successfully' });
    },
  );

  // ── 6. Developer API Keys (List) ────────────────────────
  app.get(
    '/api/security/keys',
    { preHandler: [authMiddleware] },
    async (request: FastifyRequest, reply) => {
      const userId = request.user!.userId;
      const keys = await prisma.userApiKey.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
      });

      return reply.send({
        success: true,
        data: keys.map((k) => ({
          id: k.id,
          name: k.name,
          scopes: JSON.parse(k.scopes),
          createdAt: k.createdAt,
          lastUsed: k.lastUsed,
          expiresAt: k.expiresAt,
        })),
      });
    },
  );

  // ── 7. Developer API Keys (Generate) ────────────────────
  app.post(
    '/api/security/keys/generate',
    { preHandler: [authMiddleware] },
    async (request: FastifyRequest, reply) => {
      const userId = request.user!.userId;
      const { name, scopes, expiryDays } = request.body as {
        name: string;
        scopes?: string[];
        expiryDays?: number;
      };

      if (!name) {
        return reply.status(400).send({ success: false, error: 'Key name is required' });
      }

      const rawKey = `aui_${crypto.randomBytes(24).toString('hex')}`;
      const keyHash = crypto.createHash('sha256').update(rawKey).digest('hex');

      let expiresAt: Date | null = null;
      if (expiryDays) {
        expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + expiryDays);
      }

      const scopesArray = scopes || ['chat:write'];

      await prisma.userApiKey.create({
        data: {
          userId,
          keyHash,
          name,
          scopes: JSON.stringify(scopesArray),
          expiresAt,
        },
      });

      // Audit
      await prisma.auditEvent.create({
        data: {
          userId,
          action: 'security.key_generated',
          status: 'success',
          ipAddress: request.ip,
          details: JSON.stringify({ name }),
        },
      });

      return reply.send({
        success: true,
        data: {
          apiKey: rawKey,
          name,
          scopes: scopesArray,
          expiresAt,
        },
      });
    },
  );

  // ── 8. Developer API Keys (Revoke) ──────────────────────
  app.delete(
    '/api/security/keys/:id',
    { preHandler: [authMiddleware] },
    async (request: FastifyRequest, reply) => {
      const userId = request.user!.userId;
      const { id } = request.params as { id: string };

      const key = await prisma.userApiKey.findFirst({
        where: { id, userId },
      });

      if (!key) {
        return reply.status(404).send({ success: false, error: 'API key not found' });
      }

      await prisma.userApiKey.delete({ where: { id } });

      // Audit
      await prisma.auditEvent.create({
        data: {
          userId,
          action: 'security.key_revoked',
          status: 'success',
          ipAddress: request.ip,
          details: JSON.stringify({ name: key.name }),
        },
      });

      return reply.send({ success: true, message: 'API key successfully revoked' });
    },
  );

  // ── 9. Active Sessions (List) ───────────────────────────
  app.get(
    '/api/security/sessions',
    { preHandler: [authMiddleware] },
    async (request: FastifyRequest, reply) => {
      const userId = request.user!.userId;
      const sessions = await prisma.session.findMany({
        where: { userId, isValid: true, expiresAt: { gt: new Date() } },
        orderBy: { lastActivity: 'desc' },
      });

      return reply.send({
        success: true,
        data: sessions.map((s) => ({
          id: s.id,
          device: s.deviceFingerprint,
          ipAddress: s.ipAddress,
          country: s.countryCode,
          lastActive: s.lastActivity,
        })),
      });
    },
  );

  // ── 10. Active Sessions (Revoke) ────────────────────────
  app.delete(
    '/api/security/sessions/:id',
    { preHandler: [authMiddleware] },
    async (request: FastifyRequest, reply) => {
      const userId = request.user!.userId;
      const { id } = request.params as { id: string };

      const session = await prisma.session.findFirst({
        where: { id, userId },
      });

      if (!session) {
        return reply.status(404).send({ success: false, error: 'Session not found' });
      }

      await prisma.session.update({
        where: { id },
        data: { isValid: false },
      });

      return reply.send({ success: true, message: 'Session revoked successfully' });
    },
  );

  // ── 11. Security Audit Logs ─────────────────────────────
  app.get(
    '/api/security/audit-logs',
    { preHandler: [authMiddleware] },
    async (request: FastifyRequest, reply) => {
      const userId = request.user!.userId;
      const user = await prisma.user.findUnique({ where: { id: userId } });
      const isAdmin = user?.role === 'admin';

      // Admins can see all events or query by user. Normal users see only their own events.
      const queryUserId = isAdmin && (request.query as any).userId ? (request.query as any).userId : userId;

      const logs = await prisma.auditEvent.findMany({
        where: queryUserId === 'all' ? {} : { userId: queryUserId },
        orderBy: { createdAt: 'desc' },
        take: 100,
      });

      return reply.send({ success: true, data: logs });
    },
  );

  // ── 12. Emergency Lockout (Self-Lock) ───────────────────
  app.post(
    '/api/security/emergency/lock',
    { preHandler: [authMiddleware] },
    async (request: FastifyRequest, reply) => {
      const userId = request.user!.userId;

      // Lock user account and revoke sessions
      await prisma.user.update({
        where: { id: userId },
        data: {
          lockedAt: new Date(),
        },
      });

      await invalidateAllUserSessions(userId, 'Emergency lock triggered by user');

      logger.warn(`🔐 EMERGENCY LOCKDOWN triggered for user: ${userId}`);

      return reply.send({
        success: true,
        message: 'Account locked. All active sessions have been revoked. Contact admin to unlock.',
      });
    },
  );
}
