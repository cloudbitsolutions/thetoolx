import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import dotenv from 'dotenv';

// Load environment variables from .env file
dotenv.config({
  path: `.env`
});

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  define: {
    'process.env': {
      NODE_ENV: JSON.stringify(process.env.NODE_ENV) || 'production',
      VITE_API_BASE_URL: JSON.stringify(process.env.VITE_API_BASE_URL),
    },
  },
  build: {
    outDir: "dist/spa",
    rollupOptions: {
      input: {
        main: path.resolve(__dirname, "index.template.html"),
      },
    },
  },
  ssr: {
    noExternal: ["react-router-dom", "wouter"],
  },
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "client/src"),
      "@shared": path.resolve(__dirname, "shared"),
      "@assets": path.resolve(__dirname, "attached_assets"),
    },
  },
}));
