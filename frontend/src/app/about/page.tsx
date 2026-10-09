import type { Metadata } from 'next';
import Link from 'next/link';
import { 
  Sparkles, 
  Code2, 
  ExternalLink, 
  ArrowLeft, 
  Cpu, 
  Layers, 
  Terminal, 
  FolderGit2, 
  CheckCircle2, 
  Globe2,
  Compass,
  Zap,
  Bot
} from 'lucide-react';
import { GithubIcon } from '@/components/common/Icons';

export const metadata: Metadata = {
  title: 'About Creator — R. Gagan Surya Teja',
  description:
    'Learn about R. Gagan Surya Teja, an Intermediate 1st year student and developer of AUI AI and 5+ other projects. Discover the architecture and vision behind AUI AI.',
  alternates: {
    canonical: 'https://www.auiai.online/about',
  },
  openGraph: {
    title: 'About Creator — R. Gagan Surya Teja | AUI AI',
    description:
      'Meet R. Gagan Surya Teja, an Intermediate 1st year student and developer who created AUI AI along with 5+ other software projects.',
    url: 'https://www.auiai.online/about',
    siteName: 'AUI AI',
    type: 'profile',
    locale: 'en_US',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'About Creator — R. Gagan Surya Teja | AUI AI',
    description:
      'Meet R. Gagan Surya Teja, an Intermediate 1st year student and developer who created AUI AI along with 5+ other software projects.',
  },
};

export default function AboutPage() {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'AboutPage',
        '@id': 'https://www.auiai.online/about#webpage',
        url: 'https://www.auiai.online/about',
        name: 'About R. Gagan Surya Teja & AUI AI',
        description:
          'Official About & Creator page for AUI AI, detailing creator R. Gagan Surya Teja, an Intermediate first year student and developer of 5+ projects.',
        breadcrumb: {
          '@type': 'BreadcrumbList',
          itemListElement: [
            {
              '@type': 'ListItem',
              position: 1,
              name: 'Home',
              item: 'https://www.auiai.online',
            },
            {
              '@type': 'ListItem',
              position: 2,
              name: 'About Creator',
              item: 'https://www.auiai.online/about',
            },
          ],
        },
      },
      {
        '@type': 'Person',
        '@id': 'https://www.auiai.online/about#creator',
        name: 'R. Gagan Surya Teja',
        jobTitle: 'Software Developer & Student',
        description:
          'Creator and developer of AUI AI and 5+ projects. Intermediate 1st year student passionate about fullstack web systems and AI orchestration.',
        url: 'https://www.auiai.online/about',
        sameAs: [
          'https://github.com/gagansuryatejar',
          'https://github.com/gaganzxy-eng',
        ],
      },
      {
        '@type': 'SoftwareApplication',
        '@id': 'https://www.auiai.online/#software',
        name: 'AUI AI',
        applicationCategory: 'UtilitiesApplication',
        operatingSystem: 'Web',
        url: 'https://www.auiai.online',
        author: {
          '@type': 'Person',
          name: 'R. Gagan Surya Teja',
        },
        creator: {
          '@type': 'Person',
          name: 'R. Gagan Surya Teja',
        },
        codeRepository: 'https://github.com/gagansuryatejar/aui',
        description:
          'An intelligent multi-provider AI Operating System featuring smart fallback routing across 78+ models, live sandbox preview, and autonomous workflows.',
        offers: {
          '@type': 'Offer',
          price: '0',
          priceCurrency: 'USD',
        },
      },
    ],
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <main
        style={{
          minHeight: '100vh',
          width: '100%',
          overflowY: 'auto',
          background: 'var(--bg-deepest)',
          color: 'var(--text-primary)',
          padding: '2rem 1.25rem 4rem 1.25rem',
        }}
      >
        <div
          style={{
            maxWidth: '52rem',
            margin: '0 auto',
            display: 'flex',
            flexDirection: 'column',
            gap: '2rem',
          }}
        >
          {/* Top navigation */}
          <header
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              paddingBottom: '1rem',
              borderBottom: '1px solid var(--glass-border)',
            }}
          >
            <Link
              href="/"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                color: 'var(--text-secondary)',
                fontSize: '0.875rem',
                textDecoration: 'none',
                padding: '8px 14px',
                borderRadius: 'var(--radius-md)',
                background: 'var(--glass)',
                border: '1px solid var(--glass-border)',
                transition: 'all 0.2s ease',
              }}
            >
              <ArrowLeft size={16} />
              <span>Back to Workspace</span>
            </Link>

            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <a
                href="https://github.com/gagansuryatejar/aui"
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px',
                  color: 'var(--text-primary)',
                  fontSize: '0.875rem',
                  textDecoration: 'none',
                  padding: '8px 14px',
                  borderRadius: 'var(--radius-md)',
                  background: 'var(--glass)',
                  border: '1px solid var(--glass-border)',
                }}
              >
                <GithubIcon size={16} />
                <span>GitHub Repo</span>
              </a>
            </div>
          </header>

          {/* Hero Creator Card */}
          <section
            style={{
              position: 'relative',
              borderRadius: 'var(--radius-xl)',
              background: 'linear-gradient(135deg, rgba(108, 99, 255, 0.12), rgba(0, 229, 255, 0.06))',
              border: '1px solid var(--glass-border-hover)',
              padding: '2.5rem 2rem',
              backdropFilter: 'blur(20px)',
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                padding: '6px 12px',
                borderRadius: 'var(--radius-full)',
                background: 'var(--brand-muted)',
                color: 'var(--text-brand)',
                fontSize: '0.8125rem',
                fontWeight: 600,
                marginBottom: '1rem',
              }}
            >
              <Sparkles size={14} />
              <span>Official Creator &amp; Lead Developer</span>
            </div>

            <h1
              style={{
                fontSize: '2.5rem',
                fontWeight: 800,
                letterSpacing: '-0.03em',
                lineHeight: 1.15,
                margin: '0 0 1rem 0',
              }}
            >
              R. Gagan Surya Teja
            </h1>

            <p
              style={{
                fontSize: '1.125rem',
                color: 'var(--text-secondary)',
                lineHeight: 1.6,
                maxWidth: '42rem',
                margin: '0 0 1.5rem 0',
              }}
            >
              Developer and creator of <strong>AUI AI</strong>. Currently an <strong>Intermediate 1st Year student</strong> (Inter first year) with a strong drive for systems engineering, fullstack architectures, and AI model orchestration. In addition to AUI AI, Gagan has built <strong>5+ other software projects</strong> spanning automation, web tooling, and developer utilities.
            </p>

            <div
              style={{
                display: 'flex',
                flexWrap: 'wrap',
                gap: '10px',
                marginTop: '1.25rem',
              }}
            >
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '6px 12px',
                  borderRadius: 'var(--radius-md)',
                  background: 'var(--glass)',
                  border: '1px solid var(--glass-border)',
                  fontSize: '0.8125rem',
                  color: 'var(--text-secondary)',
                }}
              >
                🎓 Inter First Year Student
              </span>
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '6px 12px',
                  borderRadius: 'var(--radius-md)',
                  background: 'var(--glass)',
                  border: '1px solid var(--glass-border)',
                  fontSize: '0.8125rem',
                  color: 'var(--text-secondary)',
                }}
              >
                🚀 Creator of 5+ Software Projects
              </span>
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '6px 12px',
                  borderRadius: 'var(--radius-md)',
                  background: 'var(--glass)',
                  border: '1px solid var(--glass-border)',
                  fontSize: '0.8125rem',
                  color: 'var(--text-secondary)',
                }}
              >
                ⚡ Fullstack &amp; AI Routing Architect
              </span>
            </div>
          </section>

          {/* About The Project Section */}
          <section
            style={{
              borderRadius: 'var(--radius-xl)',
              background: 'var(--bg-elevated)',
              border: '1px solid var(--glass-border)',
              padding: '2rem',
              display: 'flex',
              flexDirection: 'column',
              gap: '1.25rem',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: '8px',
                  background: 'linear-gradient(135deg, var(--brand), var(--accent))',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Cpu size={18} color="white" />
              </div>
              <h2 style={{ fontSize: '1.5rem', fontWeight: 700, margin: 0 }}>
                About AUI AI
              </h2>
            </div>

            <p style={{ color: 'var(--text-secondary)', lineHeight: 1.7, margin: 0 }}>
              <strong>AUI AI</strong> (<a href="https://www.auiai.online" style={{ color: 'var(--text-brand)' }}>www.auiai.online</a>) is an open and agile AI Operating System created by R. Gagan Surya Teja. Designed to transcend single-model limitations, AUI AI unites <strong>78+ artificial intelligence models</strong> across leading providers like Google, Meta, DeepSeek, Alibaba, Nvidia, Cerebras, and Mistral through an autonomous smart fallback routing layer.
            </p>

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
                gap: '14px',
                marginTop: '0.5rem',
              }}
            >
              <div
                style={{
                  padding: '16px',
                  borderRadius: 'var(--radius-lg)',
                  background: 'var(--glass)',
                  border: '1px solid var(--glass-border)',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                  <Zap size={16} color="var(--accent)" />
                  <strong style={{ fontSize: '0.9rem' }}>Smart Fallback Router</strong>
                </div>
                <p style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', lineHeight: 1.5, margin: 0 }}>
                  Automatically reroutes requests when upstream rate limits or outages happen, maintaining continuous uptime across free &amp; high-tier endpoints.
                </p>
              </div>

              <div
                style={{
                  padding: '16px',
                  borderRadius: 'var(--radius-lg)',
                  background: 'var(--glass)',
                  border: '1px solid var(--glass-border)',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                  <Terminal size={16} color="var(--brand)" />
                  <strong style={{ fontSize: '0.9rem' }}>Live Sandbox Preview</strong>
                </div>
                <p style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', lineHeight: 1.5, margin: 0 }}>
                  Real-time interactive code execution side-panel that renders generated HTML, CSS, and JavaScript with active console capture.
                </p>
              </div>

              <div
                style={{
                  padding: '16px',
                  borderRadius: 'var(--radius-lg)',
                  background: 'var(--glass)',
                  border: '1px solid var(--glass-border)',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                  <Globe2 size={16} color="var(--success)" />
                  <strong style={{ fontSize: '0.9rem' }}>Real-Time Web Search</strong>
                </div>
                <p style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', lineHeight: 1.5, margin: 0 }}>
                  Context-aware internet search integration queries live documentation and news to supply factual context to model prompts.
                </p>
              </div>

              <div
                style={{
                  padding: '16px',
                  borderRadius: 'var(--radius-lg)',
                  background: 'var(--glass)',
                  border: '1px solid var(--glass-border)',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                  <Bot size={16} color="#FACC15" />
                  <strong style={{ fontSize: '0.9rem' }}>Specialist Personas &amp; Memory</strong>
                </div>
                <p style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', lineHeight: 1.5, margin: 0 }}>
                  Curated operational personas tailored for coding, brainstorming, and research with semantic memory storage across conversations.
                </p>
              </div>
            </div>
          </section>

          {/* Creator Journey & Projects */}
          <section
            style={{
              borderRadius: 'var(--radius-xl)',
              background: 'var(--bg-elevated)',
              border: '1px solid var(--glass-border)',
              padding: '2rem',
              display: 'flex',
              flexDirection: 'column',
              gap: '1.25rem',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: '8px',
                  background: 'rgba(0, 229, 255, 0.15)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <FolderGit2 size={18} color="var(--accent)" />
              </div>
              <h2 style={{ fontSize: '1.5rem', fontWeight: 700, margin: 0 }}>
                Creator Journey &amp; Other Projects
              </h2>
            </div>

            <p style={{ color: 'var(--text-secondary)', lineHeight: 1.7, margin: 0 }}>
              As an <strong>Intermediate first-year student</strong>, R. Gagan Surya Teja started building real-world software by self-learning modern web architecture, cloud deployment, and fullstack TypeScript development. Rather than focusing on theory alone, Gagan prioritizes shipping functional, user-centric tools.
            </p>

            <p style={{ color: 'var(--text-secondary)', lineHeight: 1.7, margin: 0 }}>
              Beyond AUI AI, Gagan has independently designed and built <strong>5+ other projects</strong>, focusing on:
            </p>

            <ul
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '8px',
                color: 'var(--text-secondary)',
                lineHeight: 1.6,
                paddingLeft: '1.25rem',
                margin: 0,
              }}
            >
              <li>
                <strong style={{ color: 'var(--text-primary)' }}>Fullstack Web Applications:</strong> High-performance Next.js and Fastify platforms with modern reactive state management.
              </li>
              <li>
                <strong style={{ color: 'var(--text-primary)' }}>AI API Orchestration &amp; Middleware:</strong> Custom rate-limit mitigators and multi-vendor fallback routers.
              </li>
              <li>
                <strong style={{ color: 'var(--text-primary)' }}>Developer Utilities &amp; Live Sandboxes:</strong> Browser-based code evaluation environments with real-time feedback.
              </li>
              <li>
                <strong style={{ color: 'var(--text-primary)' }}>Automation &amp; Workflow Bots:</strong> Scripting systems for productivity, data processing, and workflow management.
              </li>
              <li>
                <strong style={{ color: 'var(--text-primary)' }}>Modern UI/UX Design Systems:</strong> Zero-dependency dark-mode first design languages with fluid glassmorphism.
              </li>
            </ul>

            <div
              style={{
                marginTop: '0.5rem',
                padding: '14px 18px',
                borderRadius: 'var(--radius-lg)',
                background: 'var(--glass)',
                border: '1px solid var(--glass-border)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '12px',
              }}
            >
              <div>
                <div style={{ fontWeight: 600, fontSize: '0.9rem', color: 'var(--text-primary)' }}>
                  Explore Open Source Repositories
                </div>
                <div style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>
                  All code, architectures, and updates are publicly accessible on GitHub.
                </div>
              </div>
              <a
                href="https://github.com/gagansuryatejar"
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  color: 'var(--text-brand)',
                  fontSize: '0.85rem',
                  fontWeight: 600,
                  textDecoration: 'none',
                }}
              >
                <span>github.com/gagansuryatejar</span>
                <ExternalLink size={14} />
              </a>
            </div>
          </section>

          {/* Verification & Transparency */}
          <section
            style={{
              borderRadius: 'var(--radius-xl)',
              background: 'var(--bg-elevated)',
              border: '1px solid var(--glass-border)',
              padding: '2rem',
              display: 'flex',
              flexDirection: 'column',
              gap: '1rem',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <CheckCircle2 size={18} color="var(--success)" />
              <h2 style={{ fontSize: '1.25rem', fontWeight: 700, margin: 0 }}>
                Authenticity &amp; Attribution Guarantee
              </h2>
            </div>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', lineHeight: 1.6, margin: 0 }}>
              This page represents the official public record of creation for <strong>AUI AI</strong>. The system was designed, structured, and implemented by <strong>R. Gagan Surya Teja</strong>. No external endorsements, exaggerated metrics, or artificial accolades are claimed. All intellectual property, repository commits, and release history can be verified through the official GitHub repositories:
            </p>
            <div
              style={{
                display: 'flex',
                flexWrap: 'wrap',
                gap: '12px',
                marginTop: '0.5rem',
              }}
            >
              <a
                href="https://github.com/gagansuryatejar/aui"
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  color: 'var(--text-brand)',
                  fontSize: '0.8125rem',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                }}
              >
                <span>Backend &amp; Core Repository (gagansuryatejar/aui)</span>
                <ExternalLink size={12} />
              </a>
              <a
                href="https://github.com/gaganzxy-eng/aui"
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  color: 'var(--text-brand)',
                  fontSize: '0.8125rem',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                }}
              >
                <span>Frontend Repository (gaganzxy-eng/aui)</span>
                <ExternalLink size={12} />
              </a>
            </div>
          </section>

          {/* Footer Call to Action */}
          <footer
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              paddingTop: '1rem',
              borderTop: '1px solid var(--glass-border)',
              fontSize: '0.8125rem',
              color: 'var(--text-tertiary)',
              flexWrap: 'wrap',
              gap: '12px',
            }}
          >
            <div>
              &copy; {new Date().getFullYear()} AUI AI. Created by R. Gagan Surya Teja.
            </div>
            <div style={{ display: 'flex', gap: '16px' }}>
              <Link href="/" style={{ color: 'var(--text-secondary)', textDecoration: 'none' }}>
                Workspace
              </Link>
              <Link href="/dashboard" style={{ color: 'var(--text-secondary)', textDecoration: 'none' }}>
                Dashboard
              </Link>
              <a
                href="https://www.auiai.online"
                style={{ color: 'var(--text-secondary)', textDecoration: 'none' }}
              >
                auiai.online
              </a>
            </div>
          </footer>
        </div>
      </main>
    </>
  );
}
