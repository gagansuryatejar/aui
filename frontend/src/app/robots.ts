import { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: ['/', '/about', '/dashboard'],
        disallow: ['/api/'],
      },
      {
        userAgent: 'Googlebot',
        allow: ['/', '/about', '/dashboard'],
        disallow: ['/api/'],
      },
      {
        userAgent: 'OAI-SearchBot',
        allow: ['/', '/about', '/dashboard'],
        disallow: ['/api/'],
      },
    ],
    sitemap: 'https://www.auiai.online/sitemap.xml',
    host: 'https://www.auiai.online',
  };
}
