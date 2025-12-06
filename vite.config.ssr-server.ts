import { defineConfig } from "vite";
import path from "path";

// SSR Server build configuration (ssr-server.ts)
export default defineConfig({
  build: {
    lib: {
      entry: path.resolve(__dirname, "server/ssr-server.ts"),
      name: "ssr-server",
      fileName: "ssr-server",
      formats: ["es"],
    },
    outDir: "dist/server",
    target: "node22",
    ssr: true,
    rollupOptions: {
      external: [
        // Node.js built-ins
        "fs",
        "path",
        "url",
        "http",
        "https",
        "os",
        "crypto",
        "stream",
        "util",
        "events",
        "buffer",
        "querystring",
        "child_process",
        "node:fs",
        "node:path",
        "node:url",
        "net",
        "tls",
        "zlib",
        // External dependencies that should not be bundled
        "express",
        "cors",
        "compression",
        "serve-static",
        "dotenv",
        "drizzle-orm",
        "pg",
        "@neondatabase/serverless",
      ],
      output: {
        format: "es",
        entryFileNames: "[name].mjs",
      },
    },
    minify: false, // Keep readable for debugging
    sourcemap: true,
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "client/src"),
      "@shared": path.resolve(__dirname, "shared"),
    },
  },
  define: {
    "process.env.NODE_ENV": JSON.stringify(process.env.NODE_ENV || "production"),
  },
});
