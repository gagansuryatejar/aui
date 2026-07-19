import type { Metadata } from 'next';
import './globals.css';
import 'highlight.js/styles/github-dark.css';

export const metadata: Metadata = {
  title: 'AUI 3.0 — AI Operating System',
  description:
    'AUI 3.0 is a next-generation AI Operating System featuring multi-agent collaboration, intelligent model routing, semantic memory, autonomous workflows, and a premium glass UI experience.',
  keywords: ['AUI', 'AUI AI', 'AI Operating System', 'Multi-Agent', 'AI Chat', 'Gemini', 'DeepSeek', 'Qwen'],
  authors: [{ name: 'AUI' }],
  viewport: 'width=device-width, initial-scale=1, maximum-scale=1',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" data-theme="dark" suppressHydrationWarning>
      <head>
        <link rel="icon" type="image/svg+xml" href="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'%3E%3ClinearGradient id='g' x1='0' y1='0' x2='1' y2='1'%3E%3Cstop offset='0%25' stop-color='%236C63FF'/%3E%3Cstop offset='100%25' stop-color='%2300E5FF'/%3E%3C/linearGradient%3E%3Crect width='100' height='100' rx='22' fill='url(%23g)'/%3E%3Cpath d='M35 70 L50 30 L65 70 M42 55 L58 55' fill='none' stroke='white' stroke-width='7' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&family=JetBrains+Mono:wght@400;500;600&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        {/* Aurora animated background layer */}
        <div className="aurora-bg" aria-hidden="true" />
        <div style={{ position: 'relative', zIndex: 1, height: '100vh' }}>
          {children}
        </div>
      </body>
    </html>
  );
}
