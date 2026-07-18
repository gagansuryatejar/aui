import { prisma } from '../database/client.js';
import { logger } from './logger.js';

const PREFERENCE_EXTRACTOR_PROMPT = `You are a User Behavior Analyst.
Review the following user queries and extract general preferences, favorites, habits, styles, schedules, or favorite frameworks.
Return JSON array of {key, value, description} objects. Only extract clear, recurring preferences.

EXAMPLE output:
[
  {"key": "coding_style", "value": "TypeScript with functional programming rules", "description": "Prefers writing functional TS code"},
  {"key": "framework", "value": "Next.js App Router", "description": "Uses Next.js for web projects"}
]

CONVERSATIONS CONTENT:
`;

const WEEKLY_REPORT_PROMPT = `You are the AUI Continuous Learning Coach.
Review the user's weekly interactions summary, preferences, task evaluations, and optimizations.
Generate a structured, inspiring, and professional weekly progress report in Markdown format.

Sections:
1. **Summary of Skills Improved**: highlight coding, logical reasoning, GIS, healthcare etc.
2. **Productivity Insights**: average latency, success rates, completed milestones.
3. **Suggested Optimizations**: detail prompt recommendations or routing rules they should approve.
4. **Security & Privacy Log**: active devices, logins, data integrity check.

METRICS SUMMARY:
`;

/**
 * Continuous Learning & Report Service – handles user preference tracking, report compilation, and prompt A/B benchmarks.
 */

/**
 * Scan conversations list, identify preference patterns, and upsert to UserPreference.
 * Throttled background execution.
 */
export async function learnPreferences(userId: string): Promise<void> {
  setImmediate(async () => {
    try {
      // Find last 15 messages of this user
      const messages = await prisma.message.findMany({
        where: { conversation: { userId }, role: 'user' },
        orderBy: { createdAt: 'desc' },
        take: 15,
      });

      if (messages.length < 5) return;

      const { getProvider } = await import('../providers/index.js');
      const provider = getProvider('google') || getProvider('groq');
      if (!provider) return;

      const modelId = provider.models[0]?.id;
      if (!modelId) return;

      const messageBlock = messages.map((m) => m.content).join('\n---\n');
      const result = await provider.chat(
        [
          {
            id: 'pref-extractor',
            role: 'user',
            content: PREFERENCE_EXTRACTOR_PROMPT + messageBlock + '\n\nOnly return JSON array, no wrap markdown.',
            timestamp: Date.now(),
          },
        ],
        modelId,
      );

      let preferences: Array<{ key: string; value: string; description?: string }> = [];
      try {
        const cleaned = result.content.replace(/```(?:json)?/g, '').trim();
        preferences = JSON.parse(cleaned);
      } catch {
        return; // JSON error
      }

      // Upsert preferences
      for (const pref of preferences) {
        await prisma.userPreference.upsert({
          where: { userId_key: { userId, key: pref.key } },
          update: { value: pref.value },
          create: {
            userId,
            key: pref.key,
            value: pref.value,
            source: 'inferred',
          },
        });
      }

      logger.info(`🧠 Learning Engine: Updated ${preferences.length} preferences for user ${userId}`);
    } catch (err) {
      logger.warn(`⚠️ Preference learning failed (non-fatal): ${err instanceof Error ? err.message : String(err)}`);
    }
  });
}

/**
 * Compile metrics and compile the weekly improvement report.
 */
export async function compileWeeklyReport(userId: string): Promise<any> {
  try {
    const evaluations = await prisma.taskEvaluation.findMany({
      where: { userId, createdAt: { gt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } },
    });

    const preferences = await prisma.userPreference.findMany({
      where: { userId },
    });

    const suggestionsCount = await prisma.improvementSuggestion.count({
      where: { userId, status: 'pending' },
    });

    // Compile aggregate metrics
    const totalRuns = evaluations.length;
    const avgLatency = totalRuns > 0 ? Math.round(evaluations.reduce((acc, curr) => acc + curr.latencyMs, 0) / totalRuns) : 0;
    const cleanRuns = evaluations.filter((e) => e.accuracy >= 4).length;
    const successRate = totalRuns > 0 ? Math.round((cleanRuns / totalRuns) * 100) : 100;

    const summaryBlock = `
    - Total AI interactions this week: ${totalRuns}
    - Average Response Latency: ${avgLatency}ms
    - Quality Success Rate: ${successRate}%
    - Learned Preferences: ${preferences.map((p) => `${p.key}=${p.value}`).join(', ')}
    - Pending Optimizations: ${suggestionsCount}
    `;

    const { getProvider } = await import('../providers/index.js');
    const provider = getProvider('google') || getProvider('groq');
    if (!provider) throw new Error('No AI provider available');

    const modelId = provider.models[0]?.id;
    if (!modelId) throw new Error('No model available');

    const result = await provider.chat(
      [
        {
          id: 'report-builder',
          role: 'user',
          content: WEEKLY_REPORT_PROMPT + summaryBlock + '\n\nGenerate report now.',
          timestamp: Date.now(),
        },
      ],
      modelId,
    );

    // Save report in Database
    const report = await prisma.weeklyReport.create({
      data: {
        userId,
        content: result.content,
        skillsImproved: JSON.stringify(['general-assistance']),
        optimizationsCount: suggestionsCount,
      },
    });

    return report;
  } catch (err) {
    logger.error(`Failed to compile report: ${err instanceof Error ? err.message : String(err)}`);
    throw err;
  }
}

/**
 * Experiment Benchmarks (Mock runner to compare prompts).
 */
export async function runPromptBenchmark(
  userId: string,
  name: string,
  promptName: string,
  testPrompt: string,
  basePrompt: string,
): Promise<any> {
  // Simulate prompt performance test
  const testLatencyAvg = Math.round(1500 + Math.random() * 800);
  const baseLatencyAvg = Math.round(1800 + Math.random() * 800);
  
  const testAccuracy = parseFloat((0.85 + Math.random() * 0.1).toFixed(2));
  const baseAccuracy = parseFloat((0.75 + Math.random() * 0.15).toFixed(2));

  const run = await prisma.experimentRun.create({
    data: {
      userId,
      name,
      promptName,
      testPrompt,
      basePrompt,
      testAccuracy,
      baseAccuracy,
      testLatencyAvg,
      baseLatencyAvg,
      approved: false,
    },
  });

  return run;
}
