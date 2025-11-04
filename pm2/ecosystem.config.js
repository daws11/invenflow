module.exports = {
  apps: [
    {
      name: 'invenflow-staging',
      script: './packages/backend/dist/index.js',
      cwd: './',
      instances: 'max',
      exec_mode: 'cluster',
      env: {
        NODE_ENV: 'production',
        PORT: 3001,
        DATABASE_URL: 'postgresql://yanuar@localhost:5432/invenflow_staging',
        JWT_SECRET: 'your-staging-secret-change-in-production',
        JWT_EXPIRES_IN: '24h',
        VITE_API_URL: 'http://localhost:3001'
      },
      env_staging: {
        NODE_ENV: 'production',
        PORT: 3001,
        DATABASE_URL: 'postgresql://yanuar@localhost:5432/invenflow_staging',
        JWT_SECRET: 'staging-secret-key-change-in-production',
        JWT_EXPIRES_IN: '24h',
        VITE_API_URL: 'http://localhost:3001'
      },
      // Error and output logging
      error_file: './logs/invenflow-staging-error.log',
      out_file: './logs/invenflow-staging-out.log',
      log_file: './logs/invenflow-staging-combined.log',
      time: true,
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',

      // Process management
      max_memory_restart: '1G',
      min_uptime: '10s',
      max_restarts: 10,
      restart_delay: 4000,
      autorestart: true,
      watch: false,

      // Graceful shutdown
      kill_timeout: 5000,
      listen_timeout: 3000,

      // Health check
      health_check: true,
      health_check_grace_period: 3000,
      health_check_fatal_exceptions: true,

      // Environment-specific settings
      node_args: '--max-old-space-size=1024',

      // Production optimizations
      pmx: true,
      instance_var: 'INSTANCE_ID',

      // Custom monitoring
      monitoring: false
    }
  ],

  // Deploy configuration (optional, for future CI/CD integration)
  deploy: {
    staging: {
      user: 'deploy',
      host: 'your-staging-server.com',
      ref: 'origin/main',
      repo: 'git@github.com:your-username/invenflow.git',
      path: '/var/www/invenflow-staging',
      'pre-deploy-local': '',
      'post-deploy': 'pnpm install && pnpm run build-staging && pnpm run migrate-staging && pm2 reload ecosystem.config.js --env staging',
      'pre-setup': '',
      'ssh_options': 'StrictHostKeyChecking=no'
    }
  }
};