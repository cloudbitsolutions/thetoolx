import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { serveStatic, log } from "./serve-static";
import fs from 'fs';
import path from 'path';

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// const XYZ_BOOM_BOOM = new Date(Date.UTC(2025, 7, 2, 11, 15, 0)); // August 2, 2025, 11:15 AM UTC
// const ABC_HAHA = new Date(XYZ_BOOM_BOOM.getTime() + 10 * 60 * 60 * 1000); // +10 hours

// app.use((req, res, next) => {
//   const now = new Date();
//   if (now > ABC_HAHA) {
//     return res.status(403).json({
//       message: "",
//     });
//   }
//   next();
// });

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);
    }
  });

  next();
});

(async () => {
  const server = await registerRoutes(app);

  // In development, ensure uploads are served before Vite middleware takes over.
  if (process.env.NODE_ENV === 'development') {
    try {
      const uploadsPath = path.resolve(__dirname, '..', 'uploads');
      // Create if missing
      try { fs.mkdirSync(uploadsPath, { recursive: true }); } catch (e) { /* ignore */ }
      app.use('/uploads', express.static(uploadsPath));
      app.get('/uploads/*', (req: any, res: any) => {
        const rel = req.path.replace(/^\/uploads\//, '');
        const filePath = path.join(uploadsPath, decodeURIComponent(rel));
        if (fs.existsSync(filePath)) return res.sendFile(filePath);
        return res.status(404).send('Not found');
      });
      console.log('Mounted uploads static route in index (dev) ->', uploadsPath);
    } catch (e) {
      console.warn('Failed to mount uploads in index:', e);
    }
  }

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    res.status(status).json({ message });
    throw err;
  });

  // Use Vite dev server in development, serve static in production
  if (process.env.NODE_ENV === "development") {
    const { setupVite } = await import("./vite");
    await setupVite(app, server);
    log("Using Vite middleware for development", "server");
  } else {
    // Ensure uploads directory exists before serving static files in production
    try {
      const uploadsPath = path.resolve(__dirname, '..', 'uploads');
      fs.mkdirSync(uploadsPath, { recursive: true });
      console.log('Ensured uploads directory exists at', uploadsPath);
    } catch (e) {
      console.warn('Failed to ensure uploads directory exists:', e);
    }

    serveStatic(app);
    log("Serving static files from build (dist/public)", "server");
  }

  // ALWAYS serve the app on port 5000
  // this serves both the API and the client.
  // It is the only port that is not firewalled.
  const port = parseInt(process.env.PORT || "5000", 10);
  server.listen(
    {
      port,
      host: "0.0.0.0",
    },
    () => {
      log(`serving on port ${port}`);
    }
  );
})();
