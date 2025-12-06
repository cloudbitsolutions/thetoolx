#!/usr/bin/env node

/**
 * Production Server Entry Point
 * Starts the bundled server from dist/server.js
 */

const dotenv = require('dotenv');
dotenv.config(); // Load variables from .env into process.env

console.log('Starting bundled server...');
console.log('PORT:', process.env.PORT); // Optional: confirm it's loaded

async function startServer() {
  try {
    // Import the bundled server directly (will have access to process.env)
    await import('./server.js');
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

// Start the server
startServer();
