import React from "react";
import ReactDOMServer from "react-dom/server";
import { Router } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { SSRThemeProvider } from "@/components/SSRThemeProvider";
import { LanguageProvider } from "@/components/LanguageProvider";
import { TooltipProvider } from "@/components/ui/tooltip";
import App from "./App";
import { SSRDataLoader } from "@/utils/ssr-data-loader";

// Custom static router for wouter SSR
// Type assertion needed for SSR compatibility with wouter
const staticLocationHook = (path: string): any => {
  return () => [path, () => {}];
};

export async function render(url: string, ssrManifest?: any, headers: Record<string, string> = {}) {
  console.log('[SSR] Rendering URL:', url);
  
  // Create a new QueryClient for each request to avoid data leaking between requests
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 60 * 1000, // 1 minute
        retry: false, // Don't retry on server
      },
    },
  });

  // Load data for the current route
  const routeLoader = SSRDataLoader.getRouteLoader(url);
  console.log('[SSR] Route loader found:', !!routeLoader);
  if (routeLoader?.loader) {
    try {
      await routeLoader.loader({
        queryClient,
        url,
        headers,
      });
      console.log('[SSR] Data loaded successfully');
    } catch (error) {
      console.warn('SSR data loading failed for route:', url, error);
    }
  }

  console.log('[SSR] Starting React render...');
  const html = ReactDOMServer.renderToString(
    <QueryClientProvider client={queryClient}>
      <SSRThemeProvider defaultTheme="light">
        <LanguageProvider>
          <TooltipProvider>
            <Router hook={staticLocationHook(url)}>
              <App />
            </Router>
          </TooltipProvider>
        </LanguageProvider>
      </SSRThemeProvider>
    </QueryClientProvider>
  );
  console.log('[SSR] React render complete, HTML length:', html.length);

  // Return both the HTML and the dehydrated query state
  const queryState = queryClient.getQueryCache().getAll().reduce((acc, query) => {
    acc[JSON.stringify(query.queryKey)] = query.state.data;
    return acc;
  }, {} as Record<string, any>);
  
  console.log('[SSR] Query state keys:', Object.keys(queryState));
  return { html, queryState };
}
