// Simple in-memory cache implementation for SSR
class SimpleCache {
  private cache: Map<string, { data: any; expires: number }> = new Map();
  private defaultTTL: number;

  constructor(defaultTTL: number = 300) {
    this.defaultTTL = defaultTTL * 1000; // Convert to milliseconds
    
    // Clean expired entries every minute
    setInterval(() => {
      this.cleanup();
    }, 60000);
  }

  set(key: string, value: any, ttl?: number): void {
    const expires = Date.now() + (ttl || this.defaultTTL) * 1000;
    this.cache.set(key, { data: value, expires });
  }

  get(key: string): any | undefined {
    const item = this.cache.get(key);
    if (!item) return undefined;
    
    if (Date.now() > item.expires) {
      this.cache.delete(key);
      return undefined;
    }
    
    return item.data;
  }

  has(key: string): boolean {
    return this.get(key) !== undefined;
  }

  delete(key: string): void {
    this.cache.delete(key);
  }

  clear(): void {
    this.cache.clear();
  }

  private cleanup(): void {
    const now = Date.now();
    for (const [key, item] of this.cache.entries()) {
      if (now > item.expires) {
        this.cache.delete(key);
      }
    }
  }
}

// Page cache for SSR responses
export const pageCache = new SimpleCache(300); // 5 minutes default TTL

// API response cache
export const apiCache = new SimpleCache(60); // 1 minute default TTL

// Cache configuration for different types of content
export const cacheConfig = {
  // Static pages - cache for longer
  static: {
    ttl: 3600, // 1 hour
    routes: ["/", "/pricing", "/about", "/contact", "/privacy", "/terms", "/support", "/help"]
  },
  
  // Tool pages - medium cache
  tools: {
    ttl: 1800, // 30 minutes
    routes: [
      "/tools",
      "/tools/youtube-video-downloader",
      "/tools/facebook-video-downloader",
      "/tools/instagram-video-downloader",
      "/tools/tiktok-video-downloader",
      "/tools/twitter-video-downloader",
      "/tools/youtube-to-mp3-converter",
      "/tools/pdf-to-word-converter",
      "/tools/background-remover",
      "/tools/internet-speed-test",
      "/tools/age-calculator",
      "/tools/url-shortener",
      "/tools/language-translator"
    ]
  },
  
  // Dynamic pages - shorter cache
  dynamic: {
    ttl: 300, // 5 minutes
    routes: ["/blog"]
  },
  
  // API responses
  api: {
    ttl: 60, // 1 minute
    endpoints: ["/api/tools", "/api/public/*"]
  },
  
  // User-specific content - no caching
  private: {
    ttl: 0,
    routes: ["/auth", "/dashboard", "/settings", "/url-analytics"]
  }
};

export function getCacheKey(req: any): string {
  const url = req.originalUrl || req.url;
  const userAgent = req.headers['user-agent'] || '';
  const acceptLanguage = req.headers['accept-language'] || '';
  
  // Include user agent and language for device/locale specific caching
  return `${url}:${userAgent.substring(0, 50)}:${acceptLanguage.substring(0, 20)}`;
}

export function getCacheTTL(pathname: string): number {
  // Check if it's a static route
  if (cacheConfig.static.routes.some(route => pathname === route)) {
    return cacheConfig.static.ttl;
  }
  
  // Check if it's a tool route
  if (cacheConfig.tools.routes.some(route => pathname === route || pathname.startsWith(route))) {
    return cacheConfig.tools.ttl;
  }
  
  // Check if it's a private route (no caching)
  if (cacheConfig.private.routes.some(route => {
    if (route.includes('*')) {
      const baseRoute = route.replace('/*', '');
      return pathname.startsWith(baseRoute);
    }
    return pathname === route;
  })) {
    return 0; // No caching
  }
  
  // Default to dynamic caching
  return cacheConfig.dynamic.ttl;
}

export function shouldCache(pathname: string, headers: Record<string, any>): boolean {
  // Don't cache if user is authenticated
  if (headers.authorization || headers.Authorization || headers.cookie?.includes('session')) {
    return false;
  }
  
  // Don't cache private routes
  if (getCacheTTL(pathname) === 0) {
    return false;
  }
  
  // Cache enabled routes
  return true;
}
