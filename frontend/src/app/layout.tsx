import type { Metadata, Viewport } from 'next';
import './globals.css';
import 'highlight.js/styles/github-dark.css';

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  themeColor: '#05070D',
};

export const metadata: Metadata = {
  metadataBase: new URL('https://www.auiai.online'),
  title: {
    default: 'AUI AI — Next-Gen AI Operating System | Created by R. Gagan Surya Teja',
    template: '%s | AUI AI',
  },
  description:
    'AUI AI is an advanced AI Operating System with smart multi-model routing across 78+ models, live sandbox code preview, autonomous workflows, and persistent memory. Created and developed by R. Gagan Surya Teja.',
  keywords: [
    'AUI AI',
    'AUI',
    'R. Gagan Surya Teja',
    'Gagan Surya Teja',
    'AI Operating System',
    'Multi-Agent AI',
    'Smart Router',
    'Live Code Sandbox',
    'DeepSeek',
    'Gemini',
    'Qwen',
    'Llama 3.3',
    'Free AI Models',
    'auiai.online',
  ],
  authors: [{ name: 'R. Gagan Surya Teja', url: 'https://github.com/gagansuryatejar' }],
  creator: 'R. Gagan Surya Teja',
  publisher: 'R. Gagan Surya Teja',
  applicationName: 'AUI AI',
  alternates: {
    canonical: 'https://www.auiai.online',
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  openGraph: {
    title: 'AUI AI — Next-Gen AI Operating System | Created by R. Gagan Surya Teja',
    description:
      'AUI AI is a unified AI platform featuring smart automatic model fallback across 78+ models, live sandbox code execution, and autonomous workflows. Created by R. Gagan Surya Teja.',
    url: 'https://www.auiai.online',
    siteName: 'AUI AI',
    locale: 'en_US',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'AUI AI — Next-Gen AI Operating System | Created by R. Gagan Surya Teja',
    description:
      'AUI AI is a unified AI platform featuring smart automatic model fallback across 78+ models, live sandbox preview, and autonomous workflows. Created by R. Gagan Surya Teja.',
  },
};

const rootJsonLd = {
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': 'WebSite',
      '@id': 'https://www.auiai.online/#website',
      url: 'https://www.auiai.online',
      name: 'AUI AI',
      description: 'Next-Generation AI Operating System with Smart Multi-Model Routing and Live Code Sandbox',
      publisher: {
        '@id': 'https://www.auiai.online/about#creator',
      },
    },
    {
      '@type': 'Person',
      '@id': 'https://www.auiai.online/about#creator',
      name: 'R. Gagan Surya Teja',
      jobTitle: 'Software Developer & Student',
      description:
        'Creator and developer of AUI AI and 5+ projects, currently an Intermediate first year student.',
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
      operatingSystem: 'Web, Windows, macOS, Linux, iOS, Android',
      url: 'https://www.auiai.online',
      author: {
        '@id': 'https://www.auiai.online/about#creator',
      },
      creator: {
        '@id': 'https://www.auiai.online/about#creator',
      },
      codeRepository: 'https://github.com/gagansuryatejar/aui',
      description:
        'AUI AI is an advanced AI Operating System with smart automatic model routing, live interactive website preview sandbox, custom personas, and support for over 78 free models.',
      offers: {
        '@type': 'Offer',
        price: '0',
        priceCurrency: 'USD',
      },
    },
  ],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" data-theme="dark" suppressHydrationWarning>
      <head>
        <link
          rel="icon"
          type="image/svg+xml"
          href="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'%3E%3ClinearGradient id='g' x1='0' y1='0' x2='1' y2='1'%3E%3Cstop offset='0%25' stop-color='%236C63FF'/%3E%3Cstop offset='100%25' stop-color='%2300E5FF'/%3E%3C/linearGradient%3E%3Crect width='100' height='100' rx='22' fill='url(%23g)'/%3E%3Cpath d='M35 70 L50 30 L65 70 M42 55 L58 55' fill='none' stroke='white' stroke-width='7' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E"
        />
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
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(rootJsonLd) }}
        />
      </head>
      <body>
        {/* Aurora animated background layer */}
        <div className="aurora-bg" aria-hidden="true" />
        <div style={{ position: 'relative', zIndex: 1, minHeight: '100vh' }}>
          {children}
        </div>
      </body>
    </html>
  );
}
