import type { Metadata } from 'next';
import './globals.css';
import 'highlight.js/styles/github-dark.css';

export const metadata: Metadata = {
  title: 'AUI – Intelligent AI Chat',
  description:
    'An intelligent AI chat platform with multi-provider support, automatic model routing, streaming responses, and seamless fallbacks.',
  keywords: ['AI', 'chat', 'GPT', 'Claude', 'Gemini', 'assistant'],
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
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
