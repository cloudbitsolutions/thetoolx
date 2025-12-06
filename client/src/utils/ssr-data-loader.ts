import { QueryClient } from "@tanstack/react-query";

export interface SSRContext {
  queryClient: QueryClient;
  user?: any;
  url: string;
  headers: Record<string, string>;
}

export interface RouteLoader {
  loader?: (context: SSRContext) => Promise<void>;
  errorBoundary?: (error: Error) => React.ReactNode;
}

// Server-side data fetching utilities
export class SSRDataLoader {
  private queryClient: QueryClient;
  private baseURL: string;

  constructor(queryClient: QueryClient, baseURL: string = process.env.VITE_API_BASE_URL || 'http://localhost:3000') {
    this.queryClient = queryClient;
    this.baseURL = baseURL;
  }

  // Fetch with authentication headers
  private async fetchWithAuth(url: string, options: RequestInit = {}, headers: Record<string, string> = {}) {
    const authToken = headers.authorization || headers.Authorization;

    // Build a safe headers object: only forward a small whitelist from incoming headers
    // and ensure all values are strings (undici rejects non-string header values or arrays).
    const forwarded: Record<string, string> = {};
    const whitelist = [
      'cookie',
      'authorization',
      'user-agent',
      'accept-language',
      'referer',
      'x-forwarded-for',
      'x-forwarded-host',
      'x-forwarded-proto',
    ];

    for (const key of whitelist) {
      const v = headers[key as keyof typeof headers] || headers[key.toLowerCase() as keyof typeof headers];
      if (!v) continue;
      // If header value is array-like or not a string, coerce to a string safely
      try {
        const maybe = v as unknown;
        if (Array.isArray(maybe)) {
          forwarded[key] = (maybe as any[]).join(', ');
        } else {
          forwarded[key] = String(maybe as string);
        }
      } catch (e) {
        // ignore problematic header values
      }
    }

    const finalHeaders: Record<string, string> = {
      'Content-Type': 'application/json',
      ...forwarded,
      ...(authToken ? { Authorization: authToken } : {}),
      ...(options.headers as Record<string, string> | undefined),
    };

    return fetch(`${this.baseURL}${url}`, {
      ...options,
      headers: finalHeaders,
    });
  }

  // Prefetch user data if authenticated
  async prefetchUserData(headers: Record<string, string>) {
    try {
      const response = await this.fetchWithAuth('/api/user', { method: 'GET' }, headers);
      if (response.ok) {
        const user = await response.json();
        // Seed both the app's canonical key and a secondary key
        // so both `useAuth` (["/api/user"]) and any other code
        // that expects ['auth','user'] will find the data.
        this.queryClient.setQueryData(['/api/user'], user);
        this.queryClient.setQueryData(['auth', 'user'], user);
        return user;
      }
    } catch (error) {
      console.warn('Failed to prefetch user data:', error);
    }
    return null;
  }

  // Prefetch tools data
  async prefetchToolsData(headers: Record<string, string>) {
    try {
      const response = await this.fetchWithAuth('/api/tools', { method: 'GET' }, headers);
      if (response.ok) {
        const tools = await response.json();
        this.queryClient.setQueryData(['/api/tools', 'en'], tools);
        return tools;
      }
    } catch (error) {
      console.warn('Failed to prefetch tools data:', error);
    }
    return [];
  }

  // Prefetch blog posts
  async prefetchBlogData(headers: Record<string, string>) {
    try {
      const response = await this.fetchWithAuth('/api/blog/posts', { method: 'GET' }, headers);
      if (response.ok) {
        const posts = await response.json();
        this.queryClient.setQueryData(['blog', 'posts'], posts);
        return posts;
      }
    } catch (error) {
      console.warn('Failed to prefetch blog data:', error);
    }
    return [];
  }

  // Route-specific data loaders
  static getRouteLoader(pathname: string): RouteLoader | null {
    const routeLoaders: Record<string, RouteLoader> = {
      '/': {
        loader: async (context: SSRContext) => {
          const loader = new SSRDataLoader(context.queryClient);
          // Prefetch tools for landing page
          await Promise.all([
            loader.prefetchToolsData(context.headers),
            loader.prefetchUserData(context.headers).catch(() => null),
          ]);
        }
      },
      
      '/tools': {
        loader: async (context: SSRContext) => {
          const loader = new SSRDataLoader(context.queryClient);
          // Prefetch all tools
          await loader.prefetchToolsData(context.headers);
        }
      },

      '/blog': {
        loader: async (context: SSRContext) => {
          const loader = new SSRDataLoader(context.queryClient);
          // Prefetch blog posts
          await loader.prefetchBlogData(context.headers);
        }
      },

      '/dashboard': {
        loader: async (context: SSRContext) => {
          const loader = new SSRDataLoader(context.queryClient);
          // Prefetch user data for dashboard
          await loader.prefetchUserData(context.headers);
        }
      }
    };

    // Check for exact match
    if (routeLoaders[pathname]) {
      return routeLoaders[pathname];
    }

    // Check for pattern matches
    if (pathname.startsWith('/tools/')) {
      return {
        loader: async (context: SSRContext) => {
          const loader = new SSRDataLoader(context.queryClient);
          // Extract tool slug from pathname (e.g., /tools/youtube-video-downloader -> youtube-video-downloader)
          const toolSlug = pathname.replace('/tools/', '');
          // Prefetch all tools first
          const tools = await loader.prefetchToolsData(context.headers);
          // Also set the specific tool data with the queryKey that useCurrentTool expects
          if (tools && tools.length > 0) {
            const tool = tools.find((t: any) => t.slug === toolSlug);
            if (tool) {
              // Set data for the specific tool slug queryKey that useCurrentTool uses
              context.queryClient.setQueryData(["/api/tools/slug", toolSlug, "en"], tool);
            }
          }
        }
      };
    }

    if (pathname.startsWith('/blog/')) {
      return {
        loader: async (context: SSRContext) => {
          const loader = new SSRDataLoader(context.queryClient);
          await loader.prefetchBlogData(context.headers);
        }
      };
    }

    // Fallback: prefetch core data (tools and user) for any unmatched route
    return {
      loader: async (context: SSRContext) => {
        const loader = new SSRDataLoader(context.queryClient);
        // Best-effort prefetches; failures are non-fatal
        await Promise.all([
          loader.prefetchToolsData(context.headers),
          loader.prefetchUserData(context.headers).catch(() => null),
        ]);
      }
    };
  }
}
