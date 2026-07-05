import { prisma } from '../database/client.js';
import { logger } from './logger.js';

/**
 * Memory Service – extracts and persists facts about users across conversations.
 *
 * On every assistant reply, this service runs a lightweight LLM extraction call
 * to pull out key facts (name, preferences, skills, etc.) and upserts them into
 * the Memory table.  On each new chat request, the stored memories are injected
 * as a system context block.
 */

const EXTRACTION_PROMPT = `You are a memory extraction system. Given a conversation, extract any permanent personal facts about the user (not the AI assistant).

RULES:
- Only extract concrete, durable facts (name, language, profession, hobbies, preferences, goals)
- Skip temporary info (what they're asking about right now)
- Skip facts about the AI itself
- Be concise – each fact should be ≤ 80 characters
- Return JSON array of {key, content} pairs
- If nothing to extract, return []

Examples:
[
  {"key": "user_name", "content": "Gagan"},
  {"key": "preferred_language", "content": "JavaScript / TypeScript"},
  {"key": "goal", "content": "Building an AI chat platform called AUI"}
]

CONVERSATION:
`;

/**
 * Extract memories from a conversation and upsert them into the database.
 * Runs as a background job – does not block the chat response.
 */
export async function extractAndSaveMemories(
  userId: string,
  conversationId: string,
  messages: Array<{ role: string; content: string }>,
): Promise<void> {
  try {
    // Only extract when there are at least 2 exchanges
    const userMsgs = messages.filter((m) => m.role === 'user');
    if (userMsgs.length < 1) return;

    // Build a compact conversation summary for extraction
    const conversationText = messages
      .slice(-6) // last 6 messages
      .map((m) => `${m.role.toUpperCase()}: ${m.content.slice(0, 300)}`)
      .join('\n');

    const { getProvider } = await import('../providers/index.js');
    const provider = getProvider('google') || getProvider('groq') || getProvider('openrouter');
    if (!provider) return;

    // Use a fast model for extraction
    const primaryModelId = provider.models[0]?.id;
    if (!primaryModelId) return;

    const result = await provider.chat(
      [
        {
          id: 'memory-extractor',
          role: 'user',
          content: EXTRACTION_PROMPT + conversationText + '\n\nReturn only the JSON array, no explanation.',
          timestamp: Date.now(),
        },
      ],
      primaryModelId,
    );

    let facts: Array<{ key: string; content: string }> = [];
    try {
      // Strip markdown code fences if present
      const cleaned = result.content.replace(/```(?:json)?/g, '').trim();
      const parsed = JSON.parse(cleaned);
      if (Array.isArray(parsed)) facts = parsed;
    } catch {
      return; // Extraction didn't return valid JSON
    }

    if (facts.length === 0) return;

    // Upsert all facts
    await Promise.all(
      facts.map((fact) =>
        prisma.memory.upsert({
          where: { userId_key: { userId, key: fact.key } },
          update: { content: fact.content, source: conversationId },
          create: { userId, key: fact.key, content: fact.content, source: conversationId },
        }),
      ),
    );

    logger.info(`🧠 Memory: saved ${facts.length} fact(s) for user ${userId}`);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    logger.warn(`⚠️ Memory extraction failed (non-fatal): ${msg}`);
  }
}

/**
 * Retrieve a user's stored memories and format them as a system context block.
 * Returns an empty string if the user has no memories.
 */
export async function getMemoryContext(userId: string): Promise<string> {
  try {
    const memories = await prisma.memory.findMany({
      where: { userId },
      orderBy: { updatedAt: 'desc' },
      take: 30, // Cap at 30 facts
    });

    if (memories.length === 0) return '';

    const lines = memories.map((m) => `- ${m.key}: ${m.content}`).join('\n');
    return `\n\n--- USER MEMORY & PROFILE ---\n${lines}\n--- END MEMORY ---\n\nUse the above facts to personalize your responses. Do not reveal that you have a stored memory system unless asked.`;
  } catch {
    return '';
  }
}
