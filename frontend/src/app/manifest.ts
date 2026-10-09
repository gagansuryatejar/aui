import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: '/?source=pwa',
    name: 'AUI AI — Intelligent AI Operating System',
    short_name: 'AUI AI',
    description: 'AUI AI is an advanced AI Operating System with smart automatic model routing across 78+ models, live code preview sandbox, and persistent memory. Created and developed by R. Gagan Surya Teja.',
    dir: 'auto',
    display: 'standalone',
    orientation: 'any',
    scope: '/',
    start_url: '/?source=pwa',
    background_color: '#ffffff',
    theme_color: '#ffffff',
    icons: [
      {
        src: '/icon-192.png',
        sizes: '192x192',
        type: 'image/png',
      },
      {
        src: '/icon-512.png',
        sizes: '512x512',
        type: 'image/png',
      },
    ],
  };
}
