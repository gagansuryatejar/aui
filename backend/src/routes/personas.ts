import type { FastifyInstance } from 'fastify';
import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Path to agency-agents repo (relative to backend root)
// Falls back to bundled minimal persona set if the directory doesn't exist
const AGENTS_DIR = path.resolve(__dirname, '../../../agency-agents');

interface PersonaMetadata {
  id: string;
  name: string;
  description: string;
  color: string;
  emoji: string;
  vibe?: string;
  category: string;
  filePath: string;
}

/**
 * Parse YAML-style frontmatter (---...---) from the start of a markdown file.
 */
function parseFrontmatter(content: string): Record<string, string> {
  const match = content.match(/^---\n([\s\S]*?)\n---/);
  if (!match) return {};
  const lines = match[1].split('\n');
  const result: Record<string, string> = {};
  for (const line of lines) {
    const colonIdx = line.indexOf(':');
    if (colonIdx === -1) continue;
    const key = line.slice(0, colonIdx).trim();
    const value = line.slice(colonIdx + 1).trim();
    result[key] = value;
  }
  return result;
}

/**
 * Load all persona markdown files from the agency-agents directory tree.
 */
async function loadPersonas(): Promise<PersonaMetadata[]> {
  const personas: PersonaMetadata[] = [];

  let categories: string[];
  try {
    const entries = await fs.readdir(AGENTS_DIR, { withFileTypes: true });
    categories = entries
      .filter((e) => e.isDirectory() && !e.name.startsWith('.') && !['examples', 'scripts', 'integrations', '.github'].includes(e.name))
      .map((e) => e.name);
  } catch {
    return getBuiltinPersonas();
  }

  for (const category of categories) {
    const catDir = path.join(AGENTS_DIR, category);
    let files: string[];
    try {
      files = (await fs.readdir(catDir)).filter((f) => f.endsWith('.md'));
    } catch {
      continue;
    }

    for (const file of files) {
      const filePath = path.join(catDir, file);
      try {
        const content = await fs.readFile(filePath, 'utf-8');
        const fm = parseFrontmatter(content);
        const id = file.replace('.md', '');

        personas.push({
          id,
          name: fm.name || formatName(id),
          description: fm.description || '',
          color: fm.color || 'blue',
          emoji: fm.emoji || '🤖',
          vibe: fm.vibe,
          category,
          filePath,
        });
      } catch {
        // skip unreadable files
      }
    }
  }

  // Fall back to built-in personas if no files were found
  return personas.length > 0 ? personas : getBuiltinPersonas();
}

function formatName(id: string): string {
  return id
    .replace(/^[a-z]+-/, '')
    .split('-')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

/**
 * Built-in minimal personas in case the agency-agents directory is unavailable.
 */
function getBuiltinPersonas(): PersonaMetadata[] {
  return [
    {
      id: 'engineering-senior-developer',
      name: 'Senior Developer',
      description: 'Full-stack expert – code quality, architecture, performance',
      color: 'green',
      emoji: '💎',
      vibe: 'Premium full-stack craftsperson',
      category: 'engineering',
      filePath: '',
    },
    {
      id: 'product-manager',
      name: 'Product Manager',
      description: 'Product strategy, roadmaps, and user needs',
      color: 'blue',
      emoji: '📋',
      category: 'product',
      filePath: '',
    },
    {
      id: 'design-ux-designer',
      name: 'UX Designer',
      description: 'User experience, accessibility, and visual design',
      color: 'purple',
      emoji: '🎨',
      category: 'design',
      filePath: '',
    },
    {
      id: 'security-expert',
      name: 'Security Expert',
      description: 'Cybersecurity, threat modeling, and best practices',
      color: 'red',
      emoji: '🔒',
      category: 'security',
      filePath: '',
    },
    {
      id: 'data-scientist',
      name: 'Data Scientist',
      description: 'ML, analytics, data pipelines, and insights',
      color: 'orange',
      emoji: '📊',
      category: 'academic',
      filePath: '',
    },
  ];
}

// ── Cache personas in memory to avoid reading disk on every request ────────
let cachedPersonas: PersonaMetadata[] | null = null;

export async function personaRoutes(app: FastifyInstance): Promise<void> {
  /**
   * GET /api/personas
   * Returns all available specialist personas grouped by category.
   */
  app.get('/api/personas', async (_request, reply) => {
    if (!cachedPersonas) {
      cachedPersonas = await loadPersonas();
    }

    // Group by category
    const grouped = cachedPersonas.reduce<Record<string, PersonaMetadata[]>>((acc, p) => {
      if (!acc[p.category]) acc[p.category] = [];
      acc[p.category].push(p);
      return acc;
    }, {});

    return reply.send({
      success: true,
      data: {
        personas: cachedPersonas.map(({ filePath: _fp, ...rest }) => rest), // strip file paths
        grouped: Object.fromEntries(
          Object.entries(grouped).map(([cat, items]) => [
            cat,
            items.map(({ filePath: _fp, ...rest }) => rest),
          ]),
        ),
        total: cachedPersonas.length,
      },
    });
  });

  /**
   * GET /api/personas/:id
   * Returns the full persona prompt content for injection into chat.
   */
  app.get<{ Params: { id: string } }>('/api/personas/:id', async (request, reply) => {
    if (!cachedPersonas) {
      cachedPersonas = await loadPersonas();
    }

    const persona = cachedPersonas.find((p) => p.id === request.params.id);
    if (!persona) {
      return reply.status(404).send({ success: false, error: 'Persona not found' });
    }

    let promptContent = '';
    if (persona.filePath) {
      try {
        promptContent = await fs.readFile(persona.filePath, 'utf-8');
        // Strip frontmatter
        promptContent = promptContent.replace(/^---\n[\s\S]*?\n---\n?/, '').trim();
      } catch {
        promptContent = `You are ${persona.name}. ${persona.description}`;
      }
    } else {
      promptContent = `You are ${persona.name}. ${persona.description}`;
    }

    return reply.send({
      success: true,
      data: {
        id: persona.id,
        name: persona.name,
        emoji: persona.emoji,
        category: persona.category,
        prompt: promptContent,
      },
    });
  });
}
