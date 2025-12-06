import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

// SSR entry build configuration (entry-server.tsx)
export default defineConfig({
  build: {
    outDir: "dist/ssr",
    ssr: true,
    rollupOptions: {
      input: "client/src/entry-server.tsx",
      output: {
        format: "esm",
      },
    },
  },
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "client/src"),
      "@shared": path.resolve(__dirname, "shared"),
      "@assets": path.resolve(__dirname, "attached_assets"),
    },
  },
  ssr: {
    noExternal: ["react-router-dom", "wouter"],
  },
  optimizeDeps: {
    include: ["react-router-dom"],
  },
});
