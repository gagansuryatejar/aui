import type { Metadata } from 'next';
import './globals.css';
import 'highlight.js/styles/github-dark.css';

export const metadata: Metadata = {
  title: 'AUI | AUI AI Chat – Next-Gen Multi-Model Intelligence',
  description:
    'AUI (AUI AI) is an advanced multi-provider AI chat platform featuring smart automatic model routing, live interactive website preview sandbox, custom personas, and support for over 78 free models.',
  keywords: ['AUI', 'AUI AI', 'auiai', 'auiai.online', 'AI Chat', 'Multi-Model', 'Gemini', 'Groq', 'Nvidia'],
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
