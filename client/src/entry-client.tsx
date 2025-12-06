import "./index.css";
import React from "react";
import ReactDOM from "react-dom/client";
import { Router } from "wouter";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { SSRThemeProvider } from "@/components/SSRThemeProvider";
import { LanguageProvider } from "@/components/LanguageProvider";
import { AuthProvider } from "@/components/AuthProvider"; // ✅ IMPORT AUTH PROVIDER
import App from "./App";

// // Create a new QueryClient instance
// const queryClient = new QueryClient({
//   defaultOptions: {
//     queries: {
//       staleTime: 60 * 1000, // 1 minute
//     },
//   },
// });

// Hydrate with server-side data if available
declare global {
  interface Window {
    __INITIAL_QUERY_STATE__?: Record<string, any>;
    __INITIAL_USER__?: any; // ✅ ADD THIS
  }
}

if (typeof window !== "undefined" && window.__INITIAL_QUERY_STATE__) {
  Object.entries(window.__INITIAL_QUERY_STATE__).forEach(([key, data]) => {
    try {
      const queryKey = JSON.parse(key);
      queryClient.setQueryData(queryKey, data);
    } catch (error) {
      console.warn("Failed to hydrate query state for key:", key, error);
    }
  });
}

// Determine initialUser from the hydrated queryClient (prefetched /api/user)
let initialUser: any = null;
if (typeof window !== "undefined") {
  try {
    // Prefer the prefetched query state for /api/user if present
    initialUser = queryClient.getQueryData(["/api/user"]) ?? null;
  } catch (e) {
    initialUser = null;
  }
}

const AppWrapper = () => (
  <QueryClientProvider client={queryClient}>
    <SSRThemeProvider>
      <LanguageProvider>
        <TooltipProvider>
          <Toaster />
          {/* ✅ Inject AuthProvider to preserve logged-in state */}
          <AuthProvider initialUser={initialUser}>
            <Router>
              <App />
            </Router>
          </AuthProvider>
        </TooltipProvider>
      </LanguageProvider>
    </SSRThemeProvider>
  </QueryClientProvider>
);

// Hydrate the app on the client
ReactDOM.hydrateRoot(document.getElementById("root")!, <AppWrapper />);
