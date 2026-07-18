import crypto from 'crypto';
import bcrypt from 'bcryptjs';

/**
 * Custom base32 decoder for zero-dependency TOTP verification.
 */
function base32Decode(base32: string): Buffer {
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
  const clean = base32.toUpperCase().replace(/=+$/, '').replace(/\s/g, '');
  
  let bits = 0;
  let value = 0;
  const buffer: number[] = [];

  for (let i = 0; i < clean.length; i++) {
    const idx = alphabet.indexOf(clean[i]);
    if (idx === -1) {
      throw new Error(`Invalid base32 character: ${clean[i]}`);
    }

    value = (value << 5) | idx;
    bits += 5;

    if (bits >= 8) {
      buffer.push((value >>> (bits - 8)) & 0xff);
      bits -= 8;
    }
  }

  return Buffer.from(buffer);
}

/**
 * Generate a standard TOTP token for a secret at a specific counter (time step).
 */
export function generateTotp(secretBase32: string, timeStep: number = Math.floor(Date.now() / 30000)): string {
  const key = base32Decode(secretBase32);
  
  // Counter buffer (8 bytes, big endian)
  const counterBuf = Buffer.alloc(8);
  // Write 64-bit integer
  let temp = timeStep;
  for (let i = 7; i >= 0; i--) {
    counterBuf[i] = temp & 0xff;
    temp = temp >>> 8;
  }

  const hmac = crypto.createHmac('sha1', key);
  hmac.update(counterBuf);
  const hmacResult = hmac.digest();

  // Dynamic truncation
  const offset = hmacResult[hmacResult.length - 1] & 0xf;
  const code =
    ((hmacResult[offset] & 0x7f) << 24) |
    ((hmacResult[offset + 1] & 0xff) << 16) |
    ((hmacResult[offset + 2] & 0xff) << 8) |
    (hmacResult[offset + 3] & 0xff);

  const otp = code % 1000000;
  return otp.toString().padStart(6, '0');
}

/**
 * Verify a TOTP token against a secret.
 * Allows a window of ±1 step for clock drift.
 */
export function verifyTotp(secretBase32: string, token: string): boolean {
  const currentStep = Math.floor(Date.now() / 30000);
  
  // Check current, previous, and next step to handle clock drift
  for (let offset = -1; offset <= 1; offset++) {
    const generated = generateTotp(secretBase32, currentStep + offset);
    if (generated === token) {
      return true;
    }
  }
  
  return false;
}

/**
 * Generate a new random base32 TOTP secret.
 */
export function generateTotpSecret(length: number = 20): string {
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
  const randomBytes = crypto.randomBytes(length);
  let secret = '';
  for (let i = 0; i < length; i++) {
    secret += alphabet[randomBytes[i] % alphabet.length];
  }
  return secret;
}

/**
 * Generate a list of backup codes (e.g. 10 codes of length 10).
 */
export function generateBackupCodes(count: number = 10): { raw: string[]; hashed: string[] } {
  const raw: string[] = [];
  const hashed: string[] = [];

  for (let i = 0; i < count; i++) {
    // 10 alphanumeric characters e.g. "x7a9k2m3p5"
    const code = crypto.randomBytes(5).toString('hex');
    raw.push(code);
    
    // Hash them using bcrypt (or standard SHA-256 for faster matching)
    // We will use SHA-256 to ensure quick matching during login
    const hash = crypto.createHash('sha256').update(code).digest('hex');
    hashed.push(hash);
  }

  return { raw, hashed };
}

/**
 * Verify if a code is a valid backup code, and if so, return its index so it can be consumed/removed.
 */
export function verifyAndConsumeBackupCode(rawCode: string, hashedCodes: string[]): { isValid: boolean; updatedCodes: string[] } {
  const hash = crypto.createHash('sha256').update(rawCode).digest('hex');
  const index = hashedCodes.indexOf(hash);

  if (index !== -1) {
    const updatedCodes = [...hashedCodes];
    updatedCodes.splice(index, 1); // remove/consume the code
    return { isValid: true, updatedCodes };
  }

  return { isValid: false, updatedCodes: hashedCodes };
}
