# TheToolX - SSR & SEO Configuration Guide

This document describes the complete Server-Side Rendering (SSR) and SEO optimization setup for TheToolX platform.

## 🎯 Overview

TheToolX now features full SSR support with advanced SEO optimization, including:
- ✅ Server-Side Rendering for all pages and tools
- ✅ Dynamic SEO meta tags for each route
- ✅ JSON-LD structured data for search engines
- ✅ Automatic sitemap generation
- ✅ Page caching for optimal performance
- ✅ SSR-safe theme provider (no hydration mismatch)
- ✅ Pre-fetching data on server-side
- ✅ PM2 cluster mode for production

## 📁 Project Structure

```
thetoolx/
├── client/src/
│   ├── entry-client.tsx          # Client-side hydration entry
│   ├── entry-server.tsx          # Server-side rendering entry
│   ├── App.tsx                   # Main application component
│   ├── components/
│   │   └── SSRThemeProvider.tsx  # SSR-safe theme provider
│   └── utils/
│       ├── seo-manager.ts        # SEO data generator for all pages/tools
│       └── ssr-data-loader.ts    # Server-side data pre-fetching
├── server/
│   ├── ssr-server.ts             # SSR server with Express
│   ├── server.ts                 # API-only server
│   ├── routes.ts                 # API routes
│   └── utils/
│       ├── cache.ts              # Page and API caching
│       └── sitemap.ts            # Dynamic sitemap generator
├── index.template.html           # HTML template with SEO placeholders
├── vite.config.ssr.ts           # Client SSR build config
├── vite.config.server.ts        # API server build config
├── vite.config.server-ssr.ts    # SSR entry build config
├── vite.config.ssr-server.ts    # SSR server build config
└── ecosystem.config.js           # PM2 configuration
```

## 🚀 Getting Started

### Development

Run the SSR development server:
```bash
npm run dev:ssr
```

This will start:
- SSR server with hot module replacement on port 3000
- API routes available at `/api/*`
- Client-side code with HMR

### Production Build

Build for production:
```bash
npm run build
```

This executes:
1. `build:client` - Builds the client-side SPA
2. `build:server` - Builds the API server
3. `build:ssr` - Builds the SSR entry point
4. `build:ssr-server` - Builds the SSR server
5. `build:copy-index` - Copies HTML template

### Production Deployment

#### Option 1: Node.js (Single Process)
```bash
npm run start
```

#### Option 2: PM2 (Recommended - Cluster Mode)
```bash
npm run start:pm2
```

PM2 provides:
- Automatic clustering (uses all CPU cores)
- Auto-restart on crashes
- Zero-downtime reloads
- Process monitoring
- Log management

Monitor with PM2:
```bash
npm run monitor:pm2  # Real-time monitoring
npm run logs:pm2     # View logs
```

## 🔍 SEO Features

### 1. SEO Manager (`client/src/utils/seo-manager.ts`)

Generates comprehensive SEO data for each route:

- **Meta Tags**: Title, description, keywords, author
- **Open Graph**: For Facebook, LinkedIn sharing
- **Twitter Cards**: For Twitter sharing
- **Structured Data**: JSON-LD for search engines
- **Breadcrumbs**: Navigation structured data
- **FAQ Schema**: For tool pages

Example usage in code:
```typescript
import { SEOManager } from '@/utils/seo-manager';

const seoManager = new SEOManager();
const seoData = seoManager.generateSEOData('/tools/youtube-video-downloader');
const structuredData = seoManager.generateStructuredData(url, seoData);
```

### 2. Tool-Specific SEO

Each tool has optimized SEO:
- YouTube Downloader: Targets keywords like "download youtube videos free"
- PDF to Word: Targets "pdf to word converter online free"
- Background Remover: Targets "remove background ai free"
- And more...

### 3. Sitemap Generation

Automatic sitemap at `/sitemap.xml` includes:
- All static pages (home, about, pricing, etc.)
- All tool pages with high priority (0.95)
- Blog posts (dynamic)
- Proper change frequency and last modified dates

### 4. Robots.txt

Located at `/robots.txt`, configured to:
- Allow all search engines
- Point to sitemap
- Disallow admin routes
- Disallow API routes

## ⚡ Performance Optimizations

### Page Caching (`server/utils/cache.ts`)

Smart caching strategy:
- **Static pages**: 1 hour cache (home, pricing, about)
- **Tool pages**: 30 minutes cache
- **Dynamic pages**: 5 minutes cache (blog)
- **Private pages**: No cache (dashboard, settings)

Cache is automatically invalidated for authenticated users.

### SSR Data Pre-fetching

Server-side data loading for instant page loads:
```typescript
// Automatically pre-fetches tools data for /tools route
const routeLoader = SSRDataLoader.getRouteLoader('/tools');
await routeLoader.loader({ queryClient, url, headers });
```

## 🎨 Theme Provider

SSR-safe theme provider prevents hydration mismatch:
```tsx
import { SSRThemeProvider } from '@/components/SSRThemeProvider';

<SSRThemeProvider defaultTheme="light">
  {children}
</SSRThemeProvider>
```

Features:
- No flash of unstyled content (FOUC)
- Respects user's system preferences
- Syncs with localStorage
- Handles SSR gracefully

## 📊 Monitoring & Logging

### PM2 Logs
```bash
npm run logs:pm2
```

Logs are stored in:
- `logs/pm2-error.log` - Error logs
- `logs/pm2-out.log` - Standard output
- `logs/pm2-combined.log` - Combined logs

### Health Checks

PM2 health checks every 30 seconds:
- Endpoint: `/api/health`
- Auto-restart on failure
- Max 10 restarts with 4s delay

## 🔧 Configuration

### Environment Variables

Create `.env` file:
```env
NODE_ENV=production
PORT=3000
CLIENT_URL=https://thetoolx.com
DATABASE_URL=your_database_url
```

### Vite Configs

Four separate Vite configurations:
1. **vite.config.ssr.ts** - Client SPA build
2. **vite.config.server.ts** - API server build
3. **vite.config.server-ssr.ts** - SSR entry build
4. **vite.config.ssr-server.ts** - SSR server build

## 🧪 Testing SSR

Test SSR locally:
```bash
# Build the project
npm run build

# Run production server
npm run start

# Visit http://localhost:3000
# View page source - you should see rendered HTML content
```

Verify SEO:
1. View page source (Ctrl+U)
2. Check meta tags are populated
3. Check for `<!--ssr-outlet-->` replacement
4. Check JSON-LD structured data

## 📈 SEO Best Practices Implemented

- ✅ Semantic HTML structure
- ✅ Proper heading hierarchy (H1, H2, H3)
- ✅ Alt text for images
- ✅ Descriptive URLs
- ✅ Mobile-responsive design
- ✅ Fast page load times (<2s)
- ✅ HTTPS (configure in production)
- ✅ Structured data markup
- ✅ XML sitemap
- ✅ Robots.txt
- ✅ Canonical URLs
- ✅ Open Graph tags
- ✅ Twitter Cards

## 🔄 Deployment Workflow

1. **Development**
   ```bash
   npm run dev:ssr
   ```

2. **Build**
   ```bash
   npm run build
   ```

3. **Test Production Build**
   ```bash
   npm run start
   ```

4. **Deploy with PM2**
   ```bash
   npm run start:pm2
   ```

5. **Monitor**
   ```bash
   npm run monitor:pm2
   ```

## 🐛 Troubleshooting

### SSR Hydration Mismatch
- Ensure ThemeProvider is SSR-safe
- Check for client-only code in components
- Use `useEffect` for browser-only operations

### Cache Issues
- Clear cache: `pageCache.clear()` in code
- Restart PM2: `npm run restart:pm2`

### Build Failures
- Clear `dist/` folder
- Run `npm install` to ensure dependencies
- Check TypeScript errors: `npm run check`

## 📚 Additional Resources

- [Vite SSR Guide](https://vitejs.dev/guide/ssr.html)
- [React Hydration](https://react.dev/reference/react-dom/client/hydrateRoot)
- [PM2 Documentation](https://pm2.keymetrics.io/docs/usage/quick-start/)
- [Google SEO Guidelines](https://developers.google.com/search/docs)
- [Schema.org Documentation](https://schema.org/)

## 🤝 Contributing

When adding new tools or pages:
1. Add SEO configuration to `seo-manager.ts`
2. Add route to `sitemap.ts`
3. Configure cache TTL in `cache.ts`
4. Create SSR data loader if needed

---

**Built with ❤️ by TheToolX Team**
