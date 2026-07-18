import { prisma } from '../database/client.js';
import { logger } from './logger.js';
import type { ChatMessage } from '../types/index.js';
import { encryptTextPayload, decryptTextPayload } from './security-encryption.js';

/**
 * Enhanced Memory Engine – extracts, stores, retrieves, and manages user memories.
 *
 * Improvements over v1:
 *   - Category-aware extraction (fact, preference, personality, skill, goal)
 *   - Importance scoring (1-5)
 *   - Conversation summaries with emotional tone
 *   - User profile learning (communication style, expertise)
 *   - Expired memory cleanup
 *   - Relevance-weighted retrieval
 */

// ── Extraction prompt ────────────────────────────────────────

const EXTRACTION_PROMPT = `You are an advanced memory extraction system. Analyze the conversation and extract permanent facts about the USER (not the AI).

CATEGORIES:
- fact: concrete info (name, age, location, job, family)
- preference: likes, dislikes, preferred tools, languages, styles
- personality: communication traits, humor style, patience level
- skill: programming languages, expertise areas, skill levels
- goal: projects, ambitions, deadlines, milestones
- context: current situation, ongoing projects, recent events

RULES:
- Only extract durable, reusable information
- Skip ephemeral questions or temporary context
- Each fact ≤ 100 characters
- Assign importance 1-5 (5 = critical identity info like name, 1 = minor detail)
- Return a JSON array of {key, content, category, importance}
- If nothing to extract, return []

EXAMPLES:
[
  {"key": "user_name", "content": "Gagan", "category": "fact", "importance": 5},
  {"key": "primary_language", "content": "TypeScript", "category": "skill", "importance": 4},
  {"key": "current_project", "content": "Building AI chat platform AUI", "category": "goal", "importance": 4},
  {"key": "prefers_dark_mode", "content": "Prefers dark theme interfaces", "category": "preference", "importance": 2}
]

CONVERSATION:
`;

const SUMMARY_PROMPT = `Analyze this conversation and provide:
1. A concise 2-3 sentence summary
2. Key topics discussed (as a JSON array of strings)
3. The user's emotional tone: one of [neutral, positive, frustrated, confused, urgent, excited]

Return ONLY valid JSON:
{"summary": "...", "keyTopics": ["topic1", "topic2"], "emotionalTone": "neutral"}

CONVERSATION:
`;

const PROFILE_PROMPT = `Based on these conversation patterns, analyze the user's:
1. communicationStyle: formal | casual | technical | balanced
2. expertiseAreas: array of expertise domains
3. personalityTraits: array of personality traits (e.g., "detail-oriented", "prefers examples")
4. preferredResponseLength: brief | medium | detailed

Return ONLY valid JSON matching that schema. If uncertain about a field, use the default.

USER MESSAGES:
`;

// ── Memory extraction ────────────────────────────────────────

export async function extractAndSaveMemories(
  userId: string,
  conversationId: string,
  messages: Array<{ role: string; content: string }>,
): Promise<void> {
  try {
    const userMsgs = messages.filter((m) => m.role === 'user');
    if (userMsgs.length < 1) return;

    // Build compact conversation text (last 8 messages)
    const conversationText = messages
      .slice(-8)
      .map((m) => `${m.role.toUpperCase()}: ${m.content.slice(0, 400)}`)
      .join('\n');

    const { getProvider } = await import('../providers/index.js');
    const provider = getProvider('google') || getProvider('groq') || getProvider('openrouter');
    if (!provider) return;

    const modelId = provider.models[0]?.id;
    if (!modelId) return;

    const result = await provider.chat(
      [
        {
          id: 'memory-extractor-v2',
          role: 'user',
          content: EXTRACTION_PROMPT + conversationText + '\n\nReturn only the JSON array.',
          timestamp: Date.now(),
        },
      ],
      modelId,
    );

    let facts: Array<{ key: string; content: string; category?: string; importance?: number }> = [];
    try {
      const cleaned = result.content.replace(/```(?:json)?/g, '').trim();
      const parsed = JSON.parse(cleaned);
      if (Array.isArray(parsed)) facts = parsed;
    } catch {
      return;
    }

    if (facts.length === 0) return;

    // Upsert memories with enhanced fields
    await Promise.all(
      facts.map((fact) =>
        prisma.memory.upsert({
          where: { userId_key: { userId, key: fact.key } },
          update: {
            content: encryptTextPayload(fact.content),
            category: fact.category || 'fact',
            importance: Math.min(5, Math.max(1, fact.importance || 3)),
            source: conversationId,
          },
          create: {
            userId,
            key: fact.key,
            content: encryptTextPayload(fact.content),
            category: fact.category || 'fact',
            importance: Math.min(5, Math.max(1, fact.importance || 3)),
            source: conversationId,
          },
        })
      )
    );

    logger.info(`🧠 Memory Engine: saved ${facts.length} fact(s) for user ${userId}`);

    // Trigger profile learning in background
    setImmediate(() => {
      updateUserProfile(userId, messages).catch(() => {});
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    logger.warn(`⚠️ Memory extraction failed (non-fatal): ${msg}`);
  }
}

// ── Conversation summary ────────────────────────────────────

export async function generateConversationSummary(
  userId: string,
  conversationId: string,
  messages: Array<{ role: string; content: string }>,
): Promise<void> {
  try {
    if (messages.length < 6) return; // Only summarize substantial conversations

    const conversationText = messages
      .slice(-20)
      .map((m) => `${m.role.toUpperCase()}: ${m.content.slice(0, 300)}`)
      .join('\n');

    const { getProvider } = await import('../providers/index.js');
    const provider = getProvider('google') || getProvider('groq');
    if (!provider) return;

    const modelId = provider.models[0]?.id;
    if (!modelId) return;

    const result = await provider.chat(
      [
        {
          id: 'summarizer',
          role: 'user',
          content: SUMMARY_PROMPT + conversationText + '\n\nReturn only valid JSON.',
          timestamp: Date.now(),
        },
      ],
      modelId,
    );

    let parsed: { summary: string; keyTopics: string[]; emotionalTone: string };
    try {
      const cleaned = result.content.replace(/```(?:json)?/g, '').trim();
      parsed = JSON.parse(cleaned);
    } catch {
      return;
    }

    await prisma.conversationSummary.upsert({
      where: { conversationId },
      update: {
        summary: parsed.summary || '',
        keyTopics: JSON.stringify(parsed.keyTopics || []),
        emotionalTone: parsed.emotionalTone || 'neutral',
        messageCount: messages.length,
      },
      create: {
        conversationId,
        userId,
        summary: parsed.summary || '',
        keyTopics: JSON.stringify(parsed.keyTopics || []),
        emotionalTone: parsed.emotionalTone || 'neutral',
        messageCount: messages.length,
      },
    });

    logger.info(`📝 Summary generated for conversation ${conversationId}`);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    logger.warn(`⚠️ Summary generation failed (non-fatal): ${msg}`);
  }
}

// ── User profile learning ────────────────────────────────────

async function updateUserProfile(
  userId: string,
  messages: Array<{ role: string; content: string }>,
): Promise<void> {
  try {
    // Only update profile every ~20 messages
    const existing = await prisma.userProfile.findUnique({ where: { userId } });
    if (existing) {
      const hoursSinceUpdate = (Date.now() - existing.updatedAt.getTime()) / (1000 * 60 * 60);
      if (hoursSinceUpdate < 2) return; // Don't update too frequently
    }

    const userMessages = messages
      .filter((m) => m.role === 'user')
      .slice(-10)
      .map((m) => m.content.slice(0, 200))
      .join('\n');

    if (userMessages.length < 100) return; // Not enough data

    const { getProvider } = await import('../providers/index.js');
    const provider = getProvider('google') || getProvider('groq');
    if (!provider) return;

    const modelId = provider.models[0]?.id;
    if (!modelId) return;

    const result = await provider.chat(
      [
        {
          id: 'profile-learner',
          role: 'user',
          content: PROFILE_PROMPT + userMessages + '\n\nReturn only valid JSON.',
          timestamp: Date.now(),
        },
      ],
      modelId,
    );

    let parsed: {
      communicationStyle?: string;
      expertiseAreas?: string[];
      personalityTraits?: string[];
      preferredResponseLength?: string;
    };
    try {
      const cleaned = result.content.replace(/```(?:json)?/g, '').trim();
      parsed = JSON.parse(cleaned);
    } catch {
      return;
    }

    const validStyles = ['formal', 'casual', 'technical', 'balanced'];
    const validLengths = ['brief', 'medium', 'detailed'];

    await prisma.userProfile.upsert({
      where: { userId },
      update: {
        communicationStyle: validStyles.includes(parsed.communicationStyle || '')
          ? parsed.communicationStyle!
          : 'balanced',
        expertiseAreas: JSON.stringify(parsed.expertiseAreas || []),
        personalityTraits: JSON.stringify(parsed.personalityTraits || []),
        preferredResponseLength: validLengths.includes(parsed.preferredResponseLength || '')
          ? parsed.preferredResponseLength!
          : 'medium',
      },
      create: {
        userId,
        communicationStyle: validStyles.includes(parsed.communicationStyle || '')
          ? parsed.communicationStyle!
          : 'balanced',
        expertiseAreas: JSON.stringify(parsed.expertiseAreas || []),
        personalityTraits: JSON.stringify(parsed.personalityTraits || []),
        preferredResponseLength: validLengths.includes(parsed.preferredResponseLength || '')
          ? parsed.preferredResponseLength!
          : 'medium',
      },
    });

    logger.info(`👤 User profile updated for ${userId}`);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    logger.warn(`⚠️ Profile update failed (non-fatal): ${msg}`);
  }
}

// ── Memory retrieval (enhanced) ──────────────────────────────

export async function getMemoryContext(userId: string): Promise<string> {
  try {
    // Clean up expired memories first
    await prisma.memory.deleteMany({
      where: {
        userId,
        expiresAt: { not: null, lt: new Date() },
      },
    });

    // Fetch memories sorted by importance, then recency
    const memories = await prisma.memory.findMany({
      where: { userId },
      orderBy: [{ importance: 'desc' }, { updatedAt: 'desc' }],
      take: 40,
    });

    if (memories.length === 0) return '';

    // Group by category for cleaner context
    const grouped: Record<string, string[]> = {};
    for (const m of memories) {
      const cat = m.category || 'fact';
      if (!grouped[cat]) grouped[cat] = [];
      const decryptedContent = decryptTextPayload(m.content);
      grouped[cat].push(`- ${m.key}: ${decryptedContent}`);
    }

    const categoryLabels: Record<string, string> = {
      fact: '📋 Facts',
      preference: '⭐ Preferences',
      personality: '🎭 Personality',
      skill: '💡 Skills',
      goal: '🎯 Goals',
      context: '📌 Current Context',
    };

    let context = '\n\n--- USER MEMORY & PROFILE ---\n';
    for (const [cat, items] of Object.entries(grouped)) {
      context += `\n${categoryLabels[cat] || cat}:\n${items.join('\n')}\n`;
    }

    // Add user profile if available
    const profile = await prisma.userProfile.findUnique({ where: { userId } });
    if (profile) {
      context += `\n🧑 Communication Style: ${profile.communicationStyle}`;
      context += `\n📏 Preferred Response Length: ${profile.preferredResponseLength}`;
      const expertise = JSON.parse(profile.expertiseAreas || '[]');
      if (expertise.length > 0) {
        context += `\n🏆 Expertise: ${expertise.join(', ')}`;
      }
    }

    context += '\n--- END MEMORY ---\n';
    context += '\nUse the above to personalize your responses. Adapt your tone, depth, and style to match the user\'s profile. Do not reveal the memory system unless asked.';

    return context;
  } catch {
    return '';
  }
}

// ── Memory search ────────────────────────────────────────────

export async function searchMemories(
  userId: string,
  query: string,
  category?: string,
): Promise<Array<{
  id: string;
  key: string;
  content: string;
  category: string;
  importance: number;
  source: string | null;
  createdAt: Date;
  updatedAt: Date;
}>> {
  const where: any = { userId };

  if (category) {
    where.category = category;
  }

  if (query) {
    where.OR = [
      { key: { contains: query } },
      { content: { contains: query } },
    ];
  }

  // Fetch all user memories for this category (usually small <= few hundred)
  const allMemories = await prisma.memory.findMany({
    where,
    orderBy: [{ importance: 'desc' }, { updatedAt: 'desc' }],
  });

  // Decrypt and filter in memory
  const decryptedMemories = allMemories.map((m) => ({
    ...m,
    content: decryptTextPayload(m.content),
  }));

  if (query) {
    const lowerQuery = query.toLowerCase();
    return decryptedMemories.filter(
      (m) =>
        m.key.toLowerCase().includes(lowerQuery) ||
        m.content.toLowerCase().includes(lowerQuery),
    );
  }

  return decryptedMemories.slice(0, 50);
}

// ── Memory stats ─────────────────────────────────────────────

export async function getMemoryStats(userId: string) {
  const [total, byCategory] = await Promise.all([
    prisma.memory.count({ where: { userId } }),
    prisma.memory.groupBy({
      by: ['category'],
      where: { userId },
      _count: { id: true },
    }),
  ]);

  const profile = await prisma.userProfile.findUnique({ where: { userId } });

  return {
    totalMemories: total,
    byCategory: byCategory.map((c) => ({
      category: c.category,
      count: c._count.id,
    })),
    hasProfile: !!profile,
    profile: profile
      ? {
          communicationStyle: profile.communicationStyle,
          preferredResponseLength: profile.preferredResponseLength,
          expertiseAreas: JSON.parse(profile.expertiseAreas || '[]'),
          personalityTraits: JSON.parse(profile.personalityTraits || '[]'),
        }
      : null,
  };
}
