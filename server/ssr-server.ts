import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import express from "express";
import compression from "compression";
import serveStatic from "serve-static";
import dotenv from "dotenv";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '../.env') });

// Verify environment variables are loaded
console.log('Environment variables loaded for SSR server');

// Import server and utilities after env is loaded
const { registerRoutes } = await import("./routes.js");
const { generateSitemap } = await import("./utils/sitemap.js");
const { SEOManager } = await import("../client/src/utils/seo-manager.js");
const { pageCache, getCacheKey, getCacheTTL, shouldCache } = await import("./utils/cache.js");

const isProduction = process.env.NODE_ENV === "production";
const port = process.env.PORT || 3000;
const base = process.env.BASE || "/";

// Create Express app
const app = express();

// Parse JSON and urlencoded bodies for API routes (important for register/login)
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Add compression middleware
app.use(compression());

// Mount API server
await registerRoutes(app);

// SEO routes
app.get("/sitemap.xml", generateSitemap);
app.get("/robots.txt", (req, res) => {
  res.type("text/plain");
  res.send(`User-agent: *
Allow: /
Sitemap: ${process.env.CLIENT_URL || 'https://thetoolx.com'}/sitemap.xml

# Disallow admin routes
User-agent: *
Disallow: /toolx-adminUser-auth/
Disallow: /dashboard
Disallow: /settings
Disallow: /api/
`);
});

// Cached production assets
// Resolve index.template.html from a few candidate locations so the server
// works both when running from source (server/) and from built output (dist/server/)
let templateHtml = "";
let templatePathFound: string | undefined;
if (isProduction) {
  const templateCandidates = [
    // Vite in this project emits index.template.html into dist/spa
    path.resolve(__dirname, "../dist/spa/index.template.html"),
    path.resolve(process.cwd(), "dist/spa/index.template.html"),
    path.resolve(__dirname, "../spa/index.template.html"),
    path.resolve(process.cwd(), "spa/index.template.html")
  ];
  for (const p of templateCandidates) {
    if (fs.existsSync(p)) {
      templateHtml = fs.readFileSync(p, "utf-8");
      templatePathFound = p;
      break;
    }
  }
  if (!templateHtml) {
    throw new Error("No index.html or index.template.html found. Tried: " + templateCandidates.join(", "));
  }
  console.log('Using template file for SSR:', templatePathFound);
  // Resolve ssr-manifest.json if present
}
const ssrManifest = isProduction ? (() => {
  const manifestCandidates = [
    path.resolve(__dirname, "../dist/spa/ssr-manifest.json"),
    path.resolve(__dirname, "../spa/ssr-manifest.json"),
    path.resolve(process.cwd(), "dist/spa/ssr-manifest.json")
  ];
  for (const p of manifestCandidates) {
    if (fs.existsSync(p)) {
      return fs.readFileSync(p, "utf-8");
    }
  }
  return undefined;
})() : undefined;

// Add Vite or respective production middlewares
let vite: any;
if (!isProduction) {
  const { createServer } = await import("vite");
  vite = await createServer({
    server: { middlewareMode: true },
    appType: "custom",
    base,
  });
  app.use(vite.middlewares);
} else {
  // Production: serve static files - try multiple candidate directories
  const spaDirCandidates = [
    path.resolve(__dirname, "../dist/spa"),
    path.resolve(__dirname, "../spa"),
    path.resolve(process.cwd(), "dist/spa"),
    path.resolve(process.cwd(), "spa")
  ];
  let spaDir = spaDirCandidates[0];
  for (const d of spaDirCandidates) {
    if (fs.existsSync(d)) {
      spaDir = d;
      break;
    }
  }
  console.log('Serving static SPA from', spaDir);
  app.use(base, serveStatic(spaDir, { index: false }));
}

// SSR middleware - handle all routes not handled by API or static files
app.use(async (req, res, next) => {
  // Only handle GET requests for SSR
  if (req.method !== 'GET') {
    return next();
  }
  
  // Skip API routes, sitemap, robots, and static files
  if (req.path.startsWith('/api') || req.path.startsWith('/sitemap') || req.path.startsWith('/robots') || req.path.startsWith('/uploads')) {
    return next();
  }
  
  try {
    let url = req.originalUrl.replace(base, "");
    // Ensure URL starts with / for proper routing
    if (!url.startsWith('/')) {
      url = '/' + url;
    }
    
    // Check cache first
    const cacheKey = getCacheKey(req);
    const ttl = getCacheTTL(url);
    
    if (shouldCache(url, req.headers) && ttl > 0) {
      const cachedResponse = pageCache.get(cacheKey);
      if (cachedResponse) {
        res.status(200).set({ 
          "Content-Type": "text/html",
          "X-Cache": "HIT",
          "Cache-Control": `public, max-age=${ttl}`
        }).end(cachedResponse);
        return;
      }
    }

    let template: string;
    let render: (url: string, ssrManifest?: any, headers?: Record<string, string>) => Promise<{ html: string; queryState: Record<string, any> }>;

    if (!isProduction) {
      // Development: load template and render function
      template = fs.readFileSync(path.resolve(__dirname, "../index.template.html"), "utf-8");
      template = await vite.transformIndexHtml(url, template);
      render = (await vite.ssrLoadModule("/client/src/entry-server.tsx")).render;
    } else {
      // Production: use cached template and render function
      template = templateHtml;
      // Dynamic import - file created during build process
      // @ts-expect-error - Module exists after build
      const ssrModule = await import("../dist/ssr/entry-server.js");
      render = ssrModule.render;
    }

    // Generate SEO data for this route
    const seoManager = new SEOManager();
    const seoData = seoManager.generateSEOData(url);
    const structuredData = seoManager.generateStructuredData(url, seoData);
    const breadcrumbData = seoManager.generateBreadcrumbStructuredData(url);
    const faqData = seoManager.generateFAQStructuredData(url);

    // Combine all structured data
    const allStructuredData = [structuredData];
    if (breadcrumbData) allStructuredData.push(breadcrumbData);
    if (faqData) allStructuredData.push(faqData);

    // Render the app HTML
    const { html: appHtml, queryState } = await render(url, ssrManifest, req.headers as Record<string, string>);

    // Replace template placeholders with actual SEO data
    const html = template
      .replace(/<!--ssr-outlet-->/g, appHtml)
      .replace(/<!--ssr-title-->/g, seoData.title)
      .replace(/<!--ssr-description-->/g, seoData.description)
      .replace(/<!--ssr-keywords-->/g, seoData.keywords)
      .replace(/<!--ssr-url-->/g, seoData.url)
      .replace(/<!--ssr-image-->/g, seoData.image)
      .replace(/<!--ssr-canonical-->/g, seoData.canonical)
      .replace(/<!--ssr-structured-data-->/g, JSON.stringify(allStructuredData))
      .replace(/<!--ssr-head-->/g, `<script>window.__INITIAL_QUERY_STATE__ = ${JSON.stringify(queryState)};</script>`);

    res.status(200).set({ 
      "Content-Type": "text/html",
      "X-Cache": shouldCache(url, req.headers) && ttl > 0 ? "MISS" : "BYPASS",
      "Cache-Control": ttl > 0 ? `public, max-age=${ttl}` : 'no-cache'
    }).end(html);
    
    // Cache the response if applicable
    if (shouldCache(url, req.headers) && ttl > 0) {
      pageCache.set(cacheKey, html, ttl);
    }
  } catch (e: any) {
    if (!isProduction) {
      vite?.ssrFixStacktrace(e);
    }
    console.error("SSR rendering failed:", e);
    res.status(500).end(e.stack);
  }
});

// Start server
app.listen(port, () => {
  console.log(`🚀 SSR Server running at http://localhost:${port}`);
});

// Graceful shutdown
process.on("SIGTERM", async () => {
  console.log("🛑 Received SIGTERM, shutting down gracefully");
  process.exit(0);
});

process.on("SIGINT", async () => {
  console.log("🛑 Received SIGINT, shutting down gracefully");
  process.exit(0);
});
