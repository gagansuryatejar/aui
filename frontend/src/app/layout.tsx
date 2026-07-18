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
        <link rel="icon" type="image/svg+xml" href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><linearGradient id='g' x1='0' y1='0' x2='1' y2='1'><stop offset='0%' stop-color='%236366f1'/><stop offset='50%' stop-color='%238b5cf6'/><stop offset='100%' stop-color='%2306b6d4'/></linearGradient><rect width='100' height='100' rx='25' fill='url(%23g)'/><path d='M35 70 L50 30 L65 70 M42 55 L58 55' fill='none' stroke='white' stroke-width='8' stroke-linecap='round' stroke-linejoin='round'/><circle cx='50' cy='30' r='6' fill='%2306b6d4' stroke='white' stroke-width='2'/></svg>" />
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
