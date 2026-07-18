import { logger } from './logger.js';
import { prisma } from '../database/client.js';

// Common prompt injection and jailbreak signatures
const JAILBREAK_PATTERNS = [
  /ignore.?(?:all.?)?previous.?(?:instructions|prompts|directions)/i,
  /you.?(?:are|must).?(?:now|hereby).?(?:play|act|be|become).?(?:as.?)?(?:dan|jailbroken|unfiltered|developer.?(?:mode|settings))/i,
  /bypass.?(?:all.?)?(?:safety|policy|restrictions|filters)/i,
  /system.?(?:prompt|role).?(?:overrides|reset|clear)/i,
  /do.?(?:not|never).?(?:refuse|explain|comply|apply.?(?:safety|guidelines))/i,
  /read.?(?:the.?)?above.?(?:and.?)?(?:forget|disregard|ignore)/i,
  /new.?(?:rule|instruction|protocol|override)\b/i,
  /unrestricted.?(?:access|responses|mode)/i,
];

// PII regex patterns
const PII_PATTERNS = {
  CREDIT_CARD: /\b(?:4[0-9]{12}(?:[0-9]{3})?|[56][0-9]{15}|3[47][0-9]{13}|30[0-5][0-9]{11})\b/g,
  US_SSN: /\b\d{3}-\d{2}-\d{4}\b/g,
  EMAIL: /\b[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}\b/g,
  PHONE: /\b(?:\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}\b/g,
};

export interface ShieldResult {
  isSafe: boolean;
  blockedReason?: string;
  cleanedText: string;
  piiDetected: boolean;
}

/**
 * AI Shield Service – scans and sanitizes inputs before sending to AI providers,
 * and redacts outputs for PII data leakages.
 */

/**
 * Scans an incoming user message for prompt injection or jailbreak attempts.
 */
export function detectPromptInjection(content: string): { isInjected: boolean; pattern?: string } {
  for (const pattern of JAILBREAK_PATTERNS) {
    if (pattern.test(content)) {
      return { isInjected: true, pattern: pattern.source };
    }
  }
  return { isInjected: false };
}

/**
 * Redacts PII (Emails, Credit Cards, Phone numbers, SSNs) from text content.
 */
export function redactPII(text: string): { cleaned: string; detected: boolean } {
  let cleaned = text;
  let detected = false;

  for (const [key, pattern] of Object.entries(PII_PATTERNS)) {
    if (pattern.test(cleaned)) {
      detected = true;
      cleaned = cleaned.replace(pattern, `[REDACTED ${key}]`);
    }
  }

  return { cleaned, detected };
}

/**
 * Combined Shield pipeline for user inputs.
 */
export async function scanUserInput(
  userId: string | undefined,
  content: string,
  conversationId?: string,
): Promise<ShieldResult> {
  // 1. Detect Injection
  const injection = detectPromptInjection(content);
  if (injection.isInjected) {
    logger.warn(`🛡️ AI Shield: Prompt injection BLOCKED for user ${userId || 'guest'}. Query: "${content.slice(0, 100)}..."`);
    
    // Log security alert in DB
    if (userId) {
      await prisma.auditEvent.create({
        data: {
          userId,
          action: 'security.prompt_injection',
          status: 'failure',
          details: JSON.stringify({
            conversationId,
            detectedPattern: injection.pattern,
            snippet: content.slice(0, 200),
          }),
        },
      });
    }

    return {
      isSafe: false,
      blockedReason: 'Jailbreak or prompt injection patterns detected. Request refused.',
      cleanedText: content,
      piiDetected: false,
    };
  }

  // 2. Redact PII
  const pii = redactPII(content);

  return {
    isSafe: true,
    cleanedText: pii.cleaned,
    piiDetected: pii.detected,
  };
}

/**
 * Scans output coming from AI provider before streaming to the client.
 */
export function scanAiOutput(content: string): string {
  const pii = redactPII(content);
  if (pii.detected) {
    logger.info(`🛡️ AI Shield: Redacted outgoing PII from AI response.`);
  }
  return pii.cleaned;
}

/**
 * Validates tool/function execution rights.
 * Standard users can run basic search/files; developer commands require Developer role.
 */
export async function authorizeToolExecution(
  userId: string | undefined,
  toolName: string,
  role: string = 'user',
): Promise<boolean> {
  const adminTools = ['terminal', 'exec_code', 'write_system_files'];
  
  if (adminTools.includes(toolName)) {
    const isAuthorized = role === 'admin' || role === 'developer';
    if (!isAuthorized) {
      logger.warn(`🛡️ AI Shield: Unauthorized tool execution blocked: ${toolName} requested by user role ${role}`);
      if (userId) {
        await prisma.auditEvent.create({
          data: {
            userId,
            action: 'security.tool_unauthorized',
            status: 'failure',
            details: JSON.stringify({ toolName, role }),
          },
        });
      }
      return false;
    }
  }

  return true;
}
