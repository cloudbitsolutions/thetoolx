#!/usr/bin/env node

/**
 * Production Server Entry Point
 * Simply starts the main server in production mode
 */

// Set production environment
console.log('Starting server...');

// Import and start the main server
async function startServer() {
  const { spawn } = await import('child_process');
  
  const serverProcess = spawn('npx', ['tsx', 'server/index.ts'], {
    stdio: 'inherit',
    shell: true,
    env: {
      ...process.env,
      PORT: process.env.PORT || '5000'
    }
  });

  serverProcess.on('error', (error) => {
    console.error('Production server error:', error.message);
    process.exit(1);
  });

  process.on('SIGTERM', () => serverProcess.kill('SIGTERM'));
  process.on('SIGINT', () => serverProcess.kill('SIGINT'));
}

startServer();