import { promises as fs } from 'fs';
import path from 'path';
import { prisma } from '../database/client.js';
import { logger } from './logger.js';
import { encryptBuffer, decryptBuffer } from './security-encryption.js';

const DANGEROUS_EXTENSIONS = ['.exe', '.bat', '.cmd', '.sh', '.msi', '.vbs', '.js', '.scr', '.pif'];
const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024; // 10 MB

// File type headers (magic numbers) hex values mapping
const FILE_SIGNATURES: Record<string, string[]> = {
  'image/png': ['89504e47'],
  'image/jpeg': ['ffd8ff'],
  'image/gif': ['47494638'],
  'application/pdf': ['25504446'],
  'application/zip': ['504b0304', '504b0506', '504b0708'],
};

export interface FileScanResult {
  isSafe: boolean;
  reason?: string;
  mimeType: string;
}

/**
 * File Security Service – manages uploaded files, virus checking, size limits,
 * encypted storage, and quarantining.
 */

/**
 * Perform static analysis on file buffer to ensure it isn't malicious.
 */
export function inspectFileBuffer(
  buffer: Buffer,
  filename: string,
  declaredMimeType: string,
): FileScanResult {
  // 1. Double extension check (e.g. image.png.exe)
  const ext = path.extname(filename).toLowerCase();
  const base = path.basename(filename, ext);
  const secondaryExt = path.extname(base).toLowerCase();
  
  if (secondaryExt && DANGEROUS_EXTENSIONS.includes(ext)) {
    return { isSafe: false, reason: 'Malicious double extension detected.', mimeType: declaredMimeType };
  }

  if (DANGEROUS_EXTENSIONS.includes(ext)) {
    return { isSafe: false, reason: 'Executable extension prohibited.', mimeType: declaredMimeType };
  }

  // 2. Validate magic numbers if signature check is mapped
  const hex = buffer.subarray(0, 8).toString('hex').toLowerCase();
  const signatures = FILE_SIGNATURES[declaredMimeType];
  
  if (signatures) {
    const matched = signatures.some((sig) => hex.startsWith(sig));
    if (!matched) {
      return { isSafe: false, reason: 'MIME type signature mismatch. File header tampered.', mimeType: declaredMimeType };
    }
  }

  // 3. Scan contents for shellcode/script injections (heuristics)
  const contentString = buffer.toString('utf8', 0, Math.min(buffer.length, 10000)).toLowerCase();
  const dangerousKeywords = [
    '<script',
    'javascript:',
    'eval(base64',
    'powershell -',
    '/bin/bash',
    'chmod +x',
    'cmd.exe /c',
  ];

  const foundKeyword = dangerousKeywords.find((keyword) => contentString.includes(keyword));
  if (foundKeyword) {
    return { isSafe: false, reason: `Suspicious executable payload found: "${foundKeyword}"`, mimeType: declaredMimeType };
  }

  return { isSafe: true, mimeType: declaredMimeType };
}

/**
 * Safely processes and encrypts an uploaded file.
 * Saves to quarantine if suspicious, otherwise saves to secure upload dir.
 */
export async function uploadSecureFile(
  userId: string,
  filename: string,
  mimeType: string,
  buffer: Buffer,
  uploadDir: string,
): Promise<any> {
  // 1. Size constraint
  if (buffer.length > MAX_FILE_SIZE_BYTES) {
    throw new Error('File exceeds max size limits of 10MB.');
  }

  // 2. Run heuristic inspection
  const scan = inspectFileBuffer(buffer, filename, mimeType);
  const isQuarantine = !scan.isSafe;
  const scanStatus = isQuarantine ? 'infected' : 'clean';

  // Make directories if not exist
  const folder = isQuarantine ? 'quarantine' : 'secure';
  const targetDir = path.join(uploadDir, folder);
  await fs.mkdir(targetDir, { recursive: true });

  const storageFilename = `${crypto.randomUUID()}-${filename}`;
  const storagePath = path.join(targetDir, storageFilename);

  // 3. Cryptographically encrypt file buffer if clean, save as-is if quarantined
  let finalBuffer = buffer;
  let isEncrypted = false;

  if (!isQuarantine) {
    finalBuffer = encryptBuffer(buffer);
    isEncrypted = true;
  }

  // Save buffer
  await fs.writeFile(storagePath, finalBuffer);
  logger.info(`💾 File saved to: ${storagePath} (encrypted: ${isEncrypted}, quarantine: ${isQuarantine})`);

  // 4. Save file metadata in database
  const fileRecord = await prisma.fileRecord.create({
    data: {
      userId,
      filename,
      mimeType,
      sizeBytes: buffer.length,
      isEncrypted,
      quarantine: isQuarantine,
      scanStatus,
      storagePath,
    },
  });

  // Log audit event
  await prisma.auditEvent.create({
    data: {
      userId,
      action: isQuarantine ? 'file.quarantined' : 'file.upload',
      status: isQuarantine ? 'failure' : 'success',
      details: JSON.stringify({
        fileId: fileRecord.id,
        filename,
        reason: scan.reason,
      }),
    },
  });

  return fileRecord;
}

/**
 * Downloads a file, decrypting it if it was encrypted.
 */
export async function downloadSecureFile(fileId: string, userId: string): Promise<{ buffer: Buffer; filename: string; mimeType: string }> {
  const file = await prisma.fileRecord.findFirst({
    where: { id: fileId },
  });

  if (!file) {
    throw new Error('File not found');
  }

  // Authorize ownership (or check if user is admin)
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (file.userId !== userId && user?.role !== 'admin') {
    throw new Error('Unauthorized access to file.');
  }

  if (file.quarantine) {
    throw new Error('Access blocked: File is in quarantine due to suspected malware threat.');
  }

  // Read buffer
  const rawBuffer = await fs.readFile(file.storagePath);
  
  // Decrypt if needed
  const finalBuffer = file.isEncrypted ? decryptBuffer(rawBuffer) : rawBuffer;

  return {
    buffer: finalBuffer,
    filename: file.filename,
    mimeType: file.mimeType,
  };
}
