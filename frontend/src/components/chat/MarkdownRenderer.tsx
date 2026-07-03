'use client';

import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeHighlight from 'rehype-highlight';
import rehypeKatex from 'rehype-katex';
import rehypeRaw from 'rehype-raw';
import CodeBlock from './CodeBlock';

interface MarkdownRendererProps {
  content: string;
}

export default function MarkdownRenderer({ content }: MarkdownRendererProps) {
  return (
    <div className="markdown-content">
      <ReactMarkdown
        remarkPlugins={[remarkGfm, remarkMath]}
        rehypePlugins={[rehypeHighlight, rehypeKatex, rehypeRaw]}
        components={{
          // Custom code block rendering
          code({ className, children, ...props }) {
            const match = /language-(\w+)/.exec(className || '');
            const isInline = !match && !className;

            if (isInline) {
              return (
                <code style={{ background: 'var(--bg-code)', color: 'var(--brand-primary)', padding: '0.15em 0.4em', borderRadius: '4px', fontSize: '0.9em', fontFamily: "'JetBrains Mono', 'Fira Code', monospace" }} {...props}>
                  {children}
                </code>
              );
            }

            // Extract the original raw text from highlighted children
            const extractText = (nodes: React.ReactNode): string => {
              if (!nodes) return '';
              if (typeof nodes === 'string' || typeof nodes === 'number') return String(nodes);
              if (Array.isArray(nodes)) return nodes.map(extractText).join('');
              if (React.isValidElement(nodes) && nodes.props && (nodes.props as any).children) {
                return extractText((nodes.props as any).children);
              }
              return '';
            };
            const codeText = extractText(children).replace(/\n$/, '');

            return (
              <CodeBlock language={match?.[1]} codeText={codeText}>
                {children}
              </CodeBlock>
            );
          },

          // Custom pre to prevent double-wrapping
          pre({ children }) {
            // If child is already our CodeBlock, just render it
            const child = React.Children.toArray(children)[0];
            if (React.isValidElement(child) && child.type === CodeBlock) {
              return <>{children}</>;
            }
            return <pre>{children}</pre>;
          },

          // Links open in new tab
          a({ href, children, ...props }) {
            return (
              <a
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                style={{ color: 'var(--text-link)', textDecoration: 'underline' }}
                {...props}
              >
                {children}
              </a>
            );
          },

          // Images with click-to-expand
          img({ src, alt, ...props }) {
            return (
              <span style={{ display: 'block', margin: '0.75rem 0' }}>
                <img
                  src={src}
                  alt={alt || ''}
                  style={{
                    maxWidth: '100%',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--border-primary)',
                    cursor: 'pointer',
                  }}
                  loading="lazy"
                  {...props}
                />
              </span>
            );
          },

          // Styled blockquote
          blockquote({ children, ...props }) {
            return (
              <blockquote
                style={{
                  borderLeft: '4px solid var(--brand-primary)',
                  padding: '0.75rem 1rem',
                  margin: '1rem 0',
                  background: 'var(--bg-tertiary)',
                  borderRadius: '0 var(--radius-sm) var(--radius-sm) 0',
                  color: 'var(--text-secondary)',
                }}
                {...props}
              >
                {children}
              </blockquote>
            );
          },

          // Task list items
          li({ children, ...props }) {
            const className = (props as Record<string, unknown>).className as string | undefined;
            if (className?.includes('task-list-item')) {
              return (
                <li
                  style={{
                    listStyle: 'none',
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '8px',
                  }}
                  {...props}
                >
                  {children}
                </li>
              );
            }
            return <li {...props}>{children}</li>;
          },
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
