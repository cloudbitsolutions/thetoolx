module.exports = {
  apps: [
    {
      name: 'thetoolx-ssr',
      script: './dist/server/ssr-server.mjs',
      instances: 'max', // Use all available CPU cores
      exec_mode: 'cluster',
      watch: false,
      max_memory_restart: '1G',
      env: {
        NODE_ENV: 'production',
        PORT: 3000,
      },
      env_development: {
        NODE_ENV: 'development',
        PORT: 3000,
        LOG_LEVEL: 'debug',
      },
      env_staging: {
        NODE_ENV: 'staging',
        PORT: 3000,
      },
      // Logging configuration
      error_file: './logs/pm2-error.log',
      out_file: './logs/pm2-out.log',
      log_file: './logs/pm2-combined.log',
      time: true,
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true,
      
      // Advanced PM2 features
      min_uptime: '10s',
      max_restarts: 10,
      autorestart: true,
      restart_delay: 4000,
      
      // Graceful shutdown
      kill_timeout: 5000,
      listen_timeout: 3000,
      shutdown_with_message: true,
      
      // Process monitoring
      instance_var: 'INSTANCE_ID',
      
      // Health monitoring
      health_check: {
        enabled: true,
        interval: 30000, // Check every 30 seconds
        path: '/api/health',
        port: 3000,
      },
    },
  ],
  
  // Deploy configuration (optional)
  deploy: {
    production: {
      user: 'deploy',
      host: ['server.thetoolx.com'],
      ref: 'origin/main',
      repo: 'git@github.com:yourusername/thetoolx.git',
      path: '/var/www/thetoolx',
      'post-deploy': 'npm install && npm run build && pm2 reload ecosystem.config.js --env production',
      'pre-deploy-local': 'echo "Deploying TheToolX to production..."',
    },
    staging: {
      user: 'deploy',
      host: ['staging.thetoolx.com'],
      ref: 'origin/develop',
      repo: 'git@github.com:yourusername/thetoolx.git',
      path: '/var/www/thetoolx-staging',
      'post-deploy': 'npm install && npm run build && pm2 reload ecosystem.config.js --env staging',
    },
  },
};
