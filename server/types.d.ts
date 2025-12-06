// Type declarations for SSR server

declare module 'compression' {
  import { RequestHandler } from 'express';
  function compression(options?: any): RequestHandler;
  export = compression;
}

declare module 'serve-static' {
  import { RequestHandler } from 'express';
  function serveStatic(root: string, options?: any): RequestHandler;
  export = serveStatic;
}

// Dynamic SSR entry module
declare module '../dist/ssr/entry-server.js' {
  export function render(
    url: string,
    ssrManifest?: any,
    headers?: Record<string, string>
  ): Promise<{ html: string; queryState: Record<string, any> }>;
}
