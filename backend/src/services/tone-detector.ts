import { logger } from './logger.js';

/**
 * Tone Detector – analyzes user messages for emotional signals.
 *
 * The detected tone is used to adjust the system prompt dynamically:
 * - frustrated → more patient, empathetic, step-by-step responses
 * - confused → simpler explanations, more examples
 * - excited → match energy, be enthusiastic
 * - urgent → concise, direct answers
 * - neutral/positive → standard helpful tone
 *
 * IMPORTANT: AUI does not claim to have emotions.
 * It responds *appropriately* to the user's emotional state.
 */

export type EmotionalTone =
  | 'neutral'
  | 'positive'
  | 'frustrated'
  | 'confused'
  | 'urgent'
  | 'excited'
  | 'sad'
  | 'curious';

interface ToneAnalysis {
  tone: EmotionalTone;
  confidence: number; // 0-1
  signals: string[];  // what triggered the detection
}

// ── Pattern-based tone detection (fast, no LLM needed) ────────

const TONE_PATTERNS: Array<{
  tone: EmotionalTone;
  patterns: RegExp[];
  weight: number;
}> = [
  {
    tone: 'frustrated',
    patterns: [
      /\b(doesn'?t work|not working|broken|fail|error|bug|wrong|issue|problem)\b/i,
      /\b(frustrated|annoying|annoyed|angry|ugh|wtf|damn|hell)\b/i,
      /\b(still|again|keep|keeps|kept)\s+(getting|having|seeing|failing)/i,
      /!{2,}/,
      /\b(why (won'?t|doesn'?t|isn'?t|can'?t))\b/i,
      /\b(tried everything|nothing works|give up)\b/i,
    ],
    weight: 0.8,
  },
  {
    tone: 'confused',
    patterns: [
      /\b(confused|confusing|don'?t understand|makes? no sense)\b/i,
      /\b(what does|what is|how does|how do|why does|why is)\b.*\?/i,
      /\b(unclear|lost|huh|wat|wut)\b/i,
      /\b(can you explain|please explain|help me understand)\b/i,
      /\?{2,}/,
    ],
    weight: 0.6,
  },
  {
    tone: 'urgent',
    patterns: [
      /\b(urgent|asap|immediately|right now|hurry|deadline)\b/i,
      /\b(need this|have to|must|critical|emergency|today|tonight)\b/i,
      /\b(boss|client|presentation|meeting|interview)\s+(is|in|at)\b/i,
      /\b(due (in|by|today|tomorrow|tonight))\b/i,
    ],
    weight: 0.7,
  },
  {
    tone: 'excited',
    patterns: [
      /\b(awesome|amazing|incredible|fantastic|perfect|excellent|love|great)\b/i,
      /\b(excited|can'?t wait|so cool|wow|omg)\b/i,
      /!{1,}/,
      /\b(just (got|did|made|built|finished|completed|launched))\b/i,
      /🎉|🚀|🔥|💯|❤️|😍|🙌/,
    ],
    weight: 0.5,
  },
  {
    tone: 'positive',
    patterns: [
      /\b(thanks|thank you|appreciate|helpful|worked|solved|fixed)\b/i,
      /\b(nice|good|cool|neat|sweet)\b/i,
      /👍|😊|🙂|✅/,
    ],
    weight: 0.4,
  },
  {
    tone: 'sad',
    patterns: [
      /\b(sad|depressed|lonely|hopeless|miserable|overwhelmed)\b/i,
      /\b(lost my|passed away|broke up|fired|laid off)\b/i,
      /😢|😭|💔|😔/,
    ],
    weight: 0.7,
  },
  {
    tone: 'curious',
    patterns: [
      /\b(curious|wondering|interested|fascinated|intrigued)\b/i,
      /\b(how (would|could|might|can))\b/i,
      /\b(what if|is it possible|tell me (about|more))\b/i,
      /🤔|💭/,
    ],
    weight: 0.4,
  },
];

export function detectTone(message: string): ToneAnalysis {
  const scores: Record<EmotionalTone, { score: number; signals: string[] }> = {
    neutral: { score: 0.3, signals: [] },
    positive: { score: 0, signals: [] },
    frustrated: { score: 0, signals: [] },
    confused: { score: 0, signals: [] },
    urgent: { score: 0, signals: [] },
    excited: { score: 0, signals: [] },
    sad: { score: 0, signals: [] },
    curious: { score: 0, signals: [] },
  };

  for (const { tone, patterns, weight } of TONE_PATTERNS) {
    for (const pattern of patterns) {
      if (pattern.test(message)) {
        scores[tone].score += weight;
        scores[tone].signals.push(pattern.source.slice(0, 40));
      }
    }
  }

  // Additional heuristics
  const capsRatio = (message.match(/[A-Z]/g) || []).length / Math.max(message.length, 1);
  if (capsRatio > 0.5 && message.length > 10) {
    scores.frustrated.score += 0.3;
    scores.frustrated.signals.push('high caps ratio');
  }

  // Short, terse messages might indicate frustration
  if (message.length < 20 && /[.!?]$/.test(message)) {
    scores.frustrated.score += 0.1;
  }

  // Find the dominant tone
  let bestTone: EmotionalTone = 'neutral';
  let bestScore = scores.neutral.score;

  for (const [tone, { score }] of Object.entries(scores)) {
    if (score > bestScore) {
      bestTone = tone as EmotionalTone;
      bestScore = score;
    }
  }

  const result: ToneAnalysis = {
    tone: bestTone,
    confidence: Math.min(1, bestScore),
    signals: scores[bestTone].signals.slice(0, 3),
  };

  if (bestTone !== 'neutral') {
    logger.debug(`🎭 Tone detected: ${bestTone} (confidence: ${result.confidence.toFixed(2)})`);
  }

  return result;
}

// ── System prompt modifiers based on tone ────────────────────

const TONE_INSTRUCTIONS: Record<EmotionalTone, string> = {
  neutral: '',
  positive: 'The user seems in a good mood. Match their positive energy while staying helpful.',
  frustrated:
    'The user appears frustrated. Be extra patient, empathetic, and clear. Break down your response into simple steps. Acknowledge their difficulty before jumping into solutions.',
  confused:
    'The user seems confused. Use simpler language, provide clear examples, and explain concepts step-by-step. Avoid jargon unless they\'re clearly technical.',
  urgent:
    'The user has an urgent need. Be concise and direct. Lead with the answer, then explain. Skip unnecessary preamble.',
  excited:
    'The user is excited! Match their enthusiasm while keeping your response accurate and helpful. Celebrate their wins.',
  sad:
    'The user may be going through a difficult time. Be warm, supportive, and empathetic. Offer practical help where appropriate. Do NOT diagnose or provide therapy — suggest professional resources if needed.',
  curious:
    'The user is in an exploratory, curious mood. Provide thorough, interesting responses. Include fascinating details and connections they might not have considered.',
};

export function getToneInstruction(tone: EmotionalTone): string {
  return TONE_INSTRUCTIONS[tone] || '';
}

/**
 * Analyze the last few user messages to get an aggregate tone.
 * Considers the most recent message most heavily.
 */
export function analyzeConversationTone(
  messages: Array<{ role: string; content: string }>,
): ToneAnalysis {
  const userMessages = messages.filter((m) => m.role === 'user');
  if (userMessages.length === 0) {
    return { tone: 'neutral', confidence: 0, signals: [] };
  }

  // Weight recent messages more heavily
  const recentMessages = userMessages.slice(-3);
  const toneScores: Record<EmotionalTone, number> = {
    neutral: 0.2,
    positive: 0,
    frustrated: 0,
    confused: 0,
    urgent: 0,
    excited: 0,
    sad: 0,
    curious: 0,
  };

  const allSignals: string[] = [];

  recentMessages.forEach((msg, i) => {
    const weight = (i + 1) / recentMessages.length; // More recent = higher weight
    const analysis = detectTone(msg.content);
    toneScores[analysis.tone] += analysis.confidence * weight;
    allSignals.push(...analysis.signals);
  });

  let bestTone: EmotionalTone = 'neutral';
  let bestScore = toneScores.neutral;

  for (const [tone, score] of Object.entries(toneScores)) {
    if (score > bestScore) {
      bestTone = tone as EmotionalTone;
      bestScore = score;
    }
  }

  return {
    tone: bestTone,
    confidence: Math.min(1, bestScore),
    signals: [...new Set(allSignals)].slice(0, 5),
  };
}
