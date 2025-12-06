import { Request, Response } from 'express';

interface SitemapRoute {
  url: string;
  lastmod?: string;
  changefreq?: 'always' | 'hourly' | 'daily' | 'weekly' | 'monthly' | 'yearly' | 'never';
  priority?: number;
}

export function generateSitemap(req: Request, res: Response) {
  const baseUrl = process.env.CLIENT_URL || `${req.protocol}://${req.get('host')}`;
  
  const routes: SitemapRoute[] = [
    // Main pages
    {
      url: '/',
      lastmod: new Date().toISOString(),
      changefreq: 'daily',
      priority: 1.0
    },
    {
      url: '/tools',
      lastmod: new Date().toISOString(),
      changefreq: 'daily',
      priority: 0.9
    },
    {
      url: '/about',
      lastmod: new Date().toISOString(),
      changefreq: 'monthly',
      priority: 0.7
    },
    {
      url: '/contact',
      lastmod: new Date().toISOString(), 
      changefreq: 'monthly',
      priority: 0.7
    },
    {
      url: '/pricing',
      lastmod: new Date().toISOString(),
      changefreq: 'weekly',
      priority: 0.8
    },
    {
      url: '/blog',
      lastmod: new Date().toISOString(),
      changefreq: 'daily',
      priority: 0.8
    },
    {
      url: '/privacy',
      lastmod: new Date().toISOString(),
      changefreq: 'yearly',
      priority: 0.3
    },
    {
      url: '/terms',
      lastmod: new Date().toISOString(),
      changefreq: 'yearly',
      priority: 0.3
    },
    {
      url: '/support',
      lastmod: new Date().toISOString(),
      changefreq: 'monthly',
      priority: 0.6
    },
    {
      url: '/help',
      lastmod: new Date().toISOString(),
      changefreq: 'monthly',
      priority: 0.6
    },
    
    // Tool pages - High priority for SEO
    {
      url: '/tools/youtube-video-downloader',
      lastmod: new Date().toISOString(),
      changefreq: 'weekly',
      priority: 0.95
    },
    {
      url: '/tools/facebook-video-downloader',
      lastmod: new Date().toISOString(),
      changefreq: 'weekly',
      priority: 0.95
    },
    {
      url: '/tools/instagram-video-downloader',
      lastmod: new Date().toISOString(),
      changefreq: 'weekly',
      priority: 0.95
    },
    {
      url: '/tools/tiktok-video-downloader',
      lastmod: new Date().toISOString(),
      changefreq: 'weekly',
      priority: 0.95
    },
    {
      url: '/tools/twitter-video-downloader',
      lastmod: new Date().toISOString(),
      changefreq: 'weekly',
      priority: 0.95
    },
    {
      url: '/tools/youtube-to-mp3-converter',
      lastmod: new Date().toISOString(),
      changefreq: 'weekly',
      priority: 0.95
    },
    {
      url: '/tools/pdf-to-word-converter',
      lastmod: new Date().toISOString(),
      changefreq: 'weekly',
      priority: 0.95
    },
    {
      url: '/tools/background-remover',
      lastmod: new Date().toISOString(),
      changefreq: 'weekly',
      priority: 0.95
    },
    {
      url: '/tools/internet-speed-test',
      lastmod: new Date().toISOString(),
      changefreq: 'weekly',
      priority: 0.95
    },
    {
      url: '/tools/age-calculator',
      lastmod: new Date().toISOString(),
      changefreq: 'weekly',
      priority: 0.95
    },
    {
      url: '/tools/url-shortener',
      lastmod: new Date().toISOString(),
      changefreq: 'weekly',
      priority: 0.95
    },
    {
      url: '/tools/language-translator',
      lastmod: new Date().toISOString(),
      changefreq: 'weekly',
      priority: 0.95
    }
  ];

  const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:image="http://www.google.com/schemas/sitemap-image/1.1"
        xmlns:video="http://www.google.com/schemas/sitemap-video/1.1">
${routes.map(route => `
  <url>
    <loc>${baseUrl}${route.url}</loc>
    ${route.lastmod ? `<lastmod>${route.lastmod}</lastmod>` : ''}
    ${route.changefreq ? `<changefreq>${route.changefreq}</changefreq>` : ''}
    ${route.priority ? `<priority>${route.priority}</priority>` : ''}
  </url>
`).join('')}
</urlset>`;

  res.header('Content-Type', 'application/xml');
  res.send(sitemap);
}
