import crypto from 'crypto';
import { config } from '../config/index.js';
import { logger } from './logger.js';

// We need a 32-byte key for AES-256-GCM.
// We derive it from a dedicated env variable, falling back to a SHA-256 hash of jwtSecret
const ENCRYPTION_KEY = (() => {
  const envKey = process.env.ENCRYPTION_KEY || '';
  if (envKey.length === 64) {
    return Buffer.from(envKey, 'hex');
  }
  // Derivation fallback
  const secret = process.env.JWT_SECRET || config.jwtSecret || 'default-fallback-encryption-pepper';
  return crypto.createHash('sha256').update(secret).digest();
})();

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12;
const AUTH_TAG_LENGTH = 16;

export interface EncryptedData {
  ciphertext: string; // Hex encoded ciphertext
  iv: string;         // Hex encoded IV
  tag: string;        // Hex encoded auth tag
}

/**
 * Encrypt clear text string using AES-256-GCM.
 */
export function encryptText(text: string): EncryptedData {
  try {
    const iv = crypto.randomBytes(IV_LENGTH);
    const cipher = crypto.createCipheriv(ALGORITHM, ENCRYPTION_KEY, iv);
    
    let ciphertext = cipher.update(text, 'utf8', 'hex');
    ciphertext += cipher.final('hex');
    const tag = cipher.getAuthTag().toString('hex');
    
    return {
      ciphertext,
      iv: iv.toString('hex'),
      tag,
    };
  } catch (err) {
    logger.error(`Encryption failed: ${err instanceof Error ? err.message : String(err)}`);
    throw new Error('Data encryption failed');
  }
}

/**
 * Decrypt ciphertext using AES-256-GCM.
 */
export function decryptText(ciphertext: string, ivHex: string, tagHex: string): string {
  try {
    const iv = Buffer.from(ivHex, 'hex');
    const tag = Buffer.from(tagHex, 'hex');
    const decipher = crypto.createDecipheriv(ALGORITHM, ENCRYPTION_KEY, iv);
    decipher.setAuthTag(tag);
    
    let decrypted = decipher.update(ciphertext, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  } catch (err) {
    logger.error(`Decryption failed: ${err instanceof Error ? err.message : String(err)}`);
    throw new Error('Data decryption failed. The key or integrity tag might be invalid.');
  }
}

/**
 * Encrypt a binary Buffer (for files) and return ciphertext Buffer with IV and tag prepended or separate.
 * Standard format: IV (12 bytes) + Tag (16 bytes) + Ciphertext (remaining)
 */
export function encryptBuffer(data: Buffer): Buffer {
  try {
    const iv = crypto.randomBytes(IV_LENGTH);
    const cipher = crypto.createCipheriv(ALGORITHM, ENCRYPTION_KEY, iv);
    
    const ciphertext = Buffer.concat([
      cipher.update(data),
      cipher.final(),
    ]);
    const tag = cipher.getAuthTag();
    
    // Concat into single output stream
    return Buffer.concat([iv, tag, ciphertext]);
  } catch (err) {
    logger.error(`Buffer encryption failed: ${err instanceof Error ? err.message : String(err)}`);
    throw new Error('Buffer encryption failed');
  }
}

/**
 * Decrypt a binary Buffer formatted as [IV(12) + Tag(16) + Ciphertext]
 */
export function decryptBuffer(encryptedData: Buffer): Buffer {
  try {
    if (encryptedData.length < IV_LENGTH + AUTH_TAG_LENGTH) {
      throw new Error('Invalid encrypted buffer length');
    }
    
    const iv = encryptedData.subarray(0, IV_LENGTH);
    const tag = encryptedData.subarray(IV_LENGTH, IV_LENGTH + AUTH_TAG_LENGTH);
    const ciphertext = encryptedData.subarray(IV_LENGTH + AUTH_TAG_LENGTH);
    
    const decipher = crypto.createDecipheriv(ALGORITHM, ENCRYPTION_KEY, iv);
    decipher.setAuthTag(tag);
    
    return Buffer.concat([
      decipher.update(ciphertext),
      decipher.final(),
    ]);
  } catch (err) {
    logger.error(`Buffer decryption failed: ${err instanceof Error ? err.message : String(err)}`);
    throw new Error('Buffer decryption failed');
  }
}

/**
 * Transparently encrypt string content using AES-256-GCM.
 * Prepends the '__ENC__' marker for easy detection and decryption.
 */
export function encryptTextPayload(text: string): string {
  if (!text) return '';
  const encrypted = encryptText(text);
  return `__ENC__:${encrypted.iv}:${encrypted.tag}:${encrypted.ciphertext}`;
}

/**
 * Transparently decrypt string content. If the content is not encrypted (does not start with '__ENC__'),
 * it returns the string as-is (enabling seamless backwards-compatibility).
 */
export function decryptTextPayload(payload: string): string {
  if (!payload || !payload.startsWith('__ENC__:')) return payload;
  try {
    const parts = payload.split(':');
    if (parts.length < 4) return payload;
    const [, iv, tag, ciphertext] = parts;
    return decryptText(ciphertext, iv, tag);
  } catch (err) {
    logger.warn(`Failed to decrypt database payload: ${err instanceof Error ? err.message : String(err)}`);
    return '[Decrypt Error: System key might be misconfigured]';
  }
}
