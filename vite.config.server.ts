import { defineConfig } from "vite";
import path from "path";

// Server build configuration (non-SSR API server)
export default defineConfig({
  build: {
    lib: {
      entry: path.resolve(__dirname, "server/server.ts"),
      name: "server",
      fileName: "server",
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
        "net",
        "tls",
        "zlib",
        // External dependencies that should not be bundled
        "express",
        "cors",
        "dotenv",
        "drizzle-orm",
        "pg",
        "@neondatabase/serverless",
        "passport",
        "passport-google-oauth20",
        "passport-local",
        "express-session",
        "connect-pg-simple",
        "memorystore",
        "multer",
        "stripe",
        "razorpay",
        "axios",
        "ws",
        "fluent-ffmpeg",
        "mammoth",
        "pdf-poppler",
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
    "process.env.NODE_ENV": process.env.NODE_ENV ? JSON.stringify(process.env.NODE_ENV) : '"production"',
  },
});
