import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { prisma } from '../database/client.js';
import { logger } from './logger.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const AGENTS_DIR = path.resolve(__dirname, '../../../agency-agents');

/**
 * Prompt Manager Service – retrieves, versions, and manages system and agent prompts.
 * If a prompt is in the database and active, we use it. Else, we fall back to filesystem templates.
 */

/**
 * Retrieve the active prompt content by name.
 * Falls back to reading from the agency-agents folder.
 */
export async function getPrompt(name: string): Promise<string> {
  try {
    // 1. Check database for active version
    const dbPrompt = await prisma.promptVersion.findFirst({
      where: { name, active: true },
    });

    if (dbPrompt) {
      return dbPrompt.content;
    }

    // 2. Fallback to filesystem
    return await readPromptFromFile(name);
  } catch (err) {
    logger.warn(`Failed to retrieve prompt "${name}" from DB or file, using hardcoded default: ${err instanceof Error ? err.message : String(err)}`);
    return `You are AUI, a helpful AI assistant specialized in ${name}.`;
  }
}

/**
 * Creates a new version of a prompt in the database.
 */
export async function createPromptVersion(
  name: string,
  content: string,
  description?: string,
  userId?: string,
): Promise<any> {
  // Find highest version number
  const lastVersion = await prisma.promptVersion.findFirst({
    where: { name },
    orderBy: { version: 'desc' },
  });

  const nextVersion = lastVersion ? lastVersion.version + 1 : 1;

  const newPrompt = await prisma.promptVersion.create({
    data: {
      name,
      content,
      version: nextVersion,
      active: false, // requires explicit activation or approval
      description: description || `Version ${nextVersion}`,
      ...(userId && { userId }),
    },
  });

  logger.info(`📝 Created prompt version: ${name} v${nextVersion}`);
  return newPrompt;
}

/**
 * Activates a specific version of a prompt, deactivating all others of the same name.
 */
export async function activatePromptVersion(name: string, version: number): Promise<any> {
  // Verify version exists
  const target = await prisma.promptVersion.findUnique({
    where: { name_version: { name, version } },
  });

  if (!target) {
    throw new Error(`Prompt version ${name} v${version} not found`);
  }

  // Deactivate all others of this name
  await prisma.promptVersion.updateMany({
    where: { name, active: true },
    data: { active: false },
  });

  // Activate target
  const updated = await prisma.promptVersion.update({
    where: { id: target.id },
    data: { active: true },
  });

  logger.info(`🔌 Activated prompt: ${name} v${version}`);
  return updated;
}

/**
 * Helper to read agent prompt from markdown files in agency-agents
 */
async function readPromptFromFile(name: string): Promise<string> {
  try {
    const entries = await fs.readdir(AGENTS_DIR, { withFileTypes: true });
    const categories = entries
      .filter((e) => e.isDirectory() && !e.name.startsWith('.'))
      .map((e) => e.name);

    let foundPath = '';
    for (const category of categories) {
      const catDir = path.join(AGENTS_DIR, category);
      try {
        const files = await fs.readdir(catDir);
        const matched = files.find((f) => f.replace('.md', '').toLowerCase() === name.toLowerCase());
        if (matched) {
          foundPath = path.join(catDir, matched);
          break;
        }
      } catch {}
    }

    if (!foundPath) {
      throw new Error(`File template not found for agent: ${name}`);
    }

    const rawContent = await fs.readFile(foundPath, 'utf-8');
    // Strip markdown frontmatter if present
    const cleanContent = rawContent.replace(/^---\n[\s\S]*?\n---\n?/, '').trim();
    return cleanContent;
  } catch (err) {
    throw new Error(`Filesystem read failed: ${err instanceof Error ? err.message : String(err)}`);
  }
}

/**
 * Retrieve prompt version history.
 */
export async function getPromptHistory(name: string) {
  return prisma.promptVersion.findMany({
    where: { name },
    orderBy: { version: 'desc' },
  });
}
