import crypto from 'crypto';
import { prisma } from '../database/client.js';
import { logger } from './logger.js';

const CONCURRENT_SESSION_LIMIT = 5;
const SESSION_EXPIRY_DAYS = 30;

// Simple Country Mock Coordinates for Impossible Travel Checks
const COUNTRY_COORDS: Record<string, { lat: number; lng: number }> = {
  US: { lat: 37.0902, lng: -95.7129 },
  IN: { lat: 20.5937, lng: 78.9629 },
  GB: { lat: 55.3781, lng: -3.4360 },
  DE: { lat: 51.1657, lng: 10.4515 },
  FR: { lat: 46.2276, lng: 2.2137 },
  CA: { lat: 56.1304, lng: -106.3468 },
  AU: { lat: -25.2744, lng: 133.7751 },
  SG: { lat: 1.3521, lng: 103.8198 },
  JP: { lat: 36.2048, lng: 138.2529 },
};

/**
 * Session Manager Service – handles session life-cycle, device tracking, RTR, and impossible travel audits.
 */

/**
 * Creates a new session tracking entry for a user, enforcing concurrent session limits.
 */
export async function createSession(
  userId: string,
  refreshToken: string,
  deviceFingerprint?: string,
  ipAddress?: string,
  countryCode: string = 'US',
): Promise<any> {
  try {
    // 1. Enforce concurrent session limit (revoke oldest valid session if limit reached)
    const activeSessions = await prisma.session.findMany({
      where: { userId, isValid: true },
      orderBy: { lastActivity: 'asc' },
    });

    if (activeSessions.length >= CONCURRENT_SESSION_LIMIT) {
      const oldest = activeSessions[0];
      if (oldest) {
        await revokeSession(oldest.id, 'Concurrent session limit exceeded');
      }
    }

    // 2. Hash refresh token to prevent database leakage exploitation
    const refreshTokenHash = hashToken(refreshToken);
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + SESSION_EXPIRY_DAYS);

    // 3. Detect Impossible Travel before saving
    if (activeSessions.length > 0 && ipAddress) {
      const lastSession = activeSessions[activeSessions.length - 1];
      if (lastSession.ipAddress && lastSession.countryCode !== countryCode) {
        await checkImpossibleTravel(userId, lastSession, countryCode, ipAddress);
      }
    }

    // 4. Create new session
    const session = await prisma.session.create({
      data: {
        userId,
        refreshTokenHash,
        deviceFingerprint: deviceFingerprint || 'Unknown Browser',
        ipAddress: ipAddress || '127.0.0.1',
        countryCode,
        expiresAt,
      },
    });

    // Write audit event
    await prisma.auditEvent.create({
      data: {
        userId,
        action: 'session.create',
        status: 'success',
        ipAddress: ipAddress || '127.0.0.1',
        details: JSON.stringify({ sessionId: session.id, device: deviceFingerprint }),
      },
    });

    return session;
  } catch (err) {
    logger.error(`Failed to create session: ${err instanceof Error ? err.message : String(err)}`);
    throw err;
  }
}

/**
 * Rotate the session refresh token (Refresh Token Rotation - RTR).
 * Revokes old session and returns a new session.
 */
export async function rotateSession(
  oldToken: string,
  newToken: string,
  ipAddress?: string,
  deviceFingerprint?: string,
): Promise<any> {
  const oldHash = hashToken(oldToken);
  
  // Find session by old hash
  const session = await prisma.session.findUnique({
    where: { refreshTokenHash: oldHash },
  });

  if (!session) {
    throw new Error('Session not found');
  }

  // Reuse detection: if session is already invalid, it might be a replay attack.
  // Revoke ALL active sessions for this user for security.
  if (!session.isValid || session.expiresAt < new Date()) {
    await invalidateAllUserSessions(session.userId, 'Refresh token reuse detected');
    throw new Error('Refresh token reuse detected. Revoking all sessions for security.');
  }

  // Deactivate old session
  await prisma.session.update({
    where: { id: session.id },
    data: { isValid: false },
  });

  // Create new session linked
  const newHash = hashToken(newToken);
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + SESSION_EXPIRY_DAYS);

  const newSession = await prisma.session.create({
    data: {
      userId: session.userId,
      refreshTokenHash: newHash,
      deviceFingerprint: deviceFingerprint || session.deviceFingerprint,
      ipAddress: ipAddress || session.ipAddress,
      countryCode: session.countryCode, // inherit or recalculate
      expiresAt,
    },
  });

  return newSession;
}

/**
 * Revokes a session.
 */
export async function revokeSession(sessionId: string, reason: string = 'User logged out'): Promise<void> {
  await prisma.session.update({
    where: { id: sessionId },
    data: { isValid: false },
  });
  logger.info(`Session ${sessionId} revoked. Reason: ${reason}`);
}

/**
 * Revokes all sessions for a user.
 */
export async function invalidateAllUserSessions(userId: string, reason: string = 'Security lockdown'): Promise<void> {
  await prisma.session.updateMany({
    where: { userId, isValid: true },
    data: { isValid: false },
  });

  await prisma.auditEvent.create({
    data: {
      userId,
      action: 'session.lockdown',
      status: 'success',
      details: JSON.stringify({ reason }),
    },
  });

  logger.warn(`All sessions for user ${userId} revoked. Reason: ${reason}`);
}

/**
 * Helper to SHA-256 hash refresh tokens.
 */
function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

/**
 * Calculates distance and checks if speed exceeds 800 km/h.
 */
async function checkImpossibleTravel(
  userId: string,
  lastSession: any,
  currentCountry: string,
  currentIp: string,
) {
  const p1 = COUNTRY_COORDS[lastSession.countryCode || 'US'] || COUNTRY_COORDS.US;
  const p2 = COUNTRY_COORDS[currentCountry] || COUNTRY_COORDS.US;

  // Calculate distance in km
  const distance = haversineDistance(p1.lat, p1.lng, p2.lat, p2.lng);
  if (distance < 50) return; // ignore close travel

  const timeDiffHours = (Date.now() - new Date(lastSession.lastActivity).getTime()) / (1000 * 60 * 60);
  const velocity = distance / Math.max(timeDiffHours, 0.01); // cap min time to avoid division by zero

  if (velocity > 800 && timeDiffHours < 24) {
    logger.warn(`🚨 Impossible travel detected for user ${userId}: traveled ${distance.toFixed(0)}km at ${velocity.toFixed(0)}km/h`);
    
    // Log threat alert in audit events
    await prisma.auditEvent.create({
      data: {
        userId,
        action: 'security.impossible_travel',
        status: 'failure',
        ipAddress: currentIp,
        details: JSON.stringify({
          velocityKmh: Math.round(velocity),
          distanceKm: Math.round(distance),
          fromCountry: lastSession.countryCode,
          toCountry: currentCountry,
          timeDifferenceHours: timeDiffHours.toFixed(2),
        }),
      },
    });
  }
}

/**
 * Haversine formula to compute distance between coordinates.
 */
function haversineDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}
