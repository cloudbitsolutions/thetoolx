import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import type { Tool } from "@shared/schema";
import { useEffect, useState } from "react";
import { useLanguage } from "@/components/LanguageProvider";

// Map routes to tool slugs
const ROUTE_TO_SLUG_MAP: Record<string, string> = {
  "/tools/youtube-video-downloader": "youtube-video-downloader",
  "/tools/facebook-video-downloader": "facebook-video-downloader",
  "/tools/instagram-video-downloader": "instagram-video-downloader",
  "/tools/tiktok-video-downloader": "tiktok-video-downloader",
  "/tools/twitter-video-downloader": "twitter-video-downloader",
  "/tools/youtube-to-mp3-converter": "youtube-to-mp3-converter",
  "/tools/pdf-to-word-converter": "pdf-to-word-converter",
  "/tools/background-remover": "background-remover",
  "/tools/internet-speed-test": "internet-speed-test",
  "/tools/age-calculator": "age-calculator",
  "/tools/url-shortener": "url-shortener",
  "/tools/language-translator": "language-translator",
};

/**
 * Hook to get the current tool data based on the current route
 * Returns the tool information including the dynamic ID
 */
export function useCurrentTool() {
  const [location] = useLocation();

  // Get the tool slug from the current route
  const toolSlug = ROUTE_TO_SLUG_MAP[location];

  const { language } = useLanguage();

  // Fetch tool data by slug. When a non-default language is selected, use the
  // public `/api/tools?lang=...` endpoint which returns translatedName/translatedDescription
  // where available. This avoids calling the auth-only translate endpoint.
  const {
    data: tool,
    isLoading,
    error,
  } = useQuery<Tool | null>({
    queryKey: ["/api/tools/slug", toolSlug, language],
    enabled: !!toolSlug,
    queryFn: async () => {
      if (!toolSlug) return null;
      try {
        if (language && language !== 'en') {
          const params = new URLSearchParams();
          params.set('lang', language);
          const res = await fetch(`/api/tools?${params.toString()}`);
          if (!res.ok) throw new Error('Failed to fetch tools');
          const list = await res.json();
          return list.find((t: any) => t.slug === toolSlug) || null;
        }

        const res = await fetch(`/api/tools/${toolSlug}`);
        if (!res.ok) throw new Error('Failed to fetch tool');
        return res.json();
      } catch (e) {
        console.error('Failed to fetch tool by slug', e);
        return null;
      }
    },
  });

  return {
    tool,
    toolId: tool?.id,
    name: (tool as any)?.translatedName || tool?.name,
    description: (tool as any)?.translatedDescription || tool?.description,
    toolSlug: tool?.slug || toolSlug,
    // If we finished loading and the server returned no tool for a valid route,
    // treat the tool as inactive (so pages render NotFound). This avoids a blank
    // page when a slug doesn't exist or when the server returns 404.
    isActive: (!isLoading && !!toolSlug && tool === null)
      ? false
      : (typeof tool?.isActive === 'boolean' ? tool.isActive : true),
    isLoading,
    error,
    isValidRoute: !!toolSlug,
    isToolPremium: tool?.isPremium || false,
    isLoginRequired: tool?.isLoginRequired || false,
    isFeatured: tool?.isFeatured || false,
  };
}
