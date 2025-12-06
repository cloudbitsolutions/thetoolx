import React, { useEffect, useState } from "react";
import { ThemeProvider as NextThemeProvider, useTheme as useNextTheme } from "next-themes";

type Theme = "dark" | "light" | "system";

type ThemeProviderProps = {
  children: React.ReactNode;
  defaultTheme?: Theme;
  storageKey?: string;
};

/**
 * SSRThemeProvider
 *
 * Wrap next-themes' ThemeProvider but keep the initial mount gating to avoid
 * hydration mismatches. This ensures components using `useTheme` from
 * `next-themes` work correctly while preserving the project's SSR safety.
 */
export function SSRThemeProvider({
  children,
  defaultTheme = "system",
  storageKey = "thetoolx-theme",
  ...props
}: ThemeProviderProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    // Only mount on client to avoid hydration flash
    setMounted(true);
  }, []);

  // Apply stored theme early on mount to keep document.documentElement in sync
  useEffect(() => {
    if (!mounted) return;
    try {
      const stored = localStorage.getItem(storageKey);
      if (stored) {
        const root = window.document.documentElement;
        root.classList.remove("light", "dark");
        if (stored === "system") {
          const sys = window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
          root.classList.add(sys);
        } else {
          root.classList.add(stored);
        }
      }
    } catch (e) {
      /* ignore localStorage errors */
    }
  }, [mounted, storageKey]);

  // While not mounted, render a neutral wrapper to avoid DOM differences
  if (!mounted) {
    return (
      <NextThemeProvider attribute="class" defaultTheme={defaultTheme} enableSystem>
        <div className="light">{children}</div>
      </NextThemeProvider>
    );
  }

  return (
    <NextThemeProvider attribute="class" defaultTheme={defaultTheme} enableSystem enableColorScheme {...props}>
      {children}
    </NextThemeProvider>
  );
}

// Re-export next-themes' useTheme so imports across the app remain consistent.
export const useTheme = useNextTheme;
