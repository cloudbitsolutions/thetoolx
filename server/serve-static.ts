import express, { type Express } from "express";
import fs from "fs";
import path from "path";

export function log(message: string, source = "express") {
  const formattedTime = new Date().toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });

  console.log(`${formattedTime} [${source}] ${message}`);
}

export function serveStatic(app: Express) {
  const distPath = path.resolve(__dirname, 'public');

  if (!fs.existsSync(distPath)) {
    throw new Error(
      `Could not find the build directory: ${distPath}, make sure to build the client first`,
    );
  }

  app.use(express.static(distPath));

  // Serve uploaded files from the uploads folder (publicly)
  const uploadsPath = path.resolve(__dirname, '..', 'uploads');
  if (fs.existsSync(uploadsPath)) {
    app.use('/uploads', express.static(uploadsPath));
    log(`Serving uploads from ${uploadsPath}`, 'serve-static');
  } else {
    // create uploads directory for production if missing
    try {
      fs.mkdirSync(uploadsPath, { recursive: true });
      app.use('/uploads', express.static(uploadsPath));
      log(`Created and serving uploads from ${uploadsPath}`, 'serve-static');
    } catch (e) {
      console.warn('Failed to create uploads directory:', e);
    }
  }

  // fall through to index.html if the file doesn't exist
  app.use("*", (_req, res) => {
    res.sendFile(path.resolve(distPath, "index.html"));
  });
}
