#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

async function copyAssets() {
  const root = path.resolve(__dirname, '..');
  const srcDir = path.join(root, 'public');
  const destDir = path.join(root, 'dist', 'public');

  if (!fs.existsSync(srcDir)) {
    console.warn('No public/ directory found, skipping asset copy.');
    return;
  }

  // Ensure destination exists
  fs.mkdirSync(destDir, { recursive: true });

  const entries = fs.readdirSync(srcDir, { withFileTypes: true });
  for (const ent of entries) {
    if (ent.isFile()) {
      const src = path.join(srcDir, ent.name);
      const dest = path.join(destDir, ent.name);
      fs.copyFileSync(src, dest);
      console.log(`Copied ${ent.name} -> dist/public/${ent.name}`);
    }
  }
}

copyAssets().catch((err) => {
  console.error('Failed to copy assets:', err);
  process.exit(1);
});
