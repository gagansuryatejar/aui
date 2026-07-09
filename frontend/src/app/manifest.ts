import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: '/?source=pwa',
    name: 'auiai',
    short_name: 'aui',
    description: 'AUI (AUI AI) is an advanced multi-provider AI chat platform featuring smart automatic model routing, live interactive website preview sandbox, custom personas, and support for over 78 free models.',
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
