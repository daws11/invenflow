module.exports = {
  apps: [
    {
      name: 'invenflow-staging',
      script: './packages/backend/dist/index.js',
      cwd: './',
      instances: 4, // Optimized for 4-8 core server (use 4 instances for better resource utilization)
      exec_mode: 'cluster', // Enable cluster mode for better performance
      // Note: env_file is supported in PM2 5.0+, but we also load via dotenv in backend
      env_file: './.env.staging', // PM2 will load this file automatically (PM2 5.0+)
      env: {
        NODE_ENV: 'production',
        PORT: 3001,
      },
      env_staging: {
        NODE_ENV: 'production',
        ENV_FILE: '.env.staging', // Explicitly tell backend to use staging env file
        // Additional env vars can be added here if needed
        // Most values come from .env.staging file via env_file or backend dotenv loader
      },
      // Error and output logging
      error_file: './logs/invenflow-staging-error.log',
      out_file: './logs/invenflow-staging-out.log',
      log_file: './logs/invenflow-staging-combined.log',
      time: true,
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',

      // Process management - optimized for cluster mode
      max_memory_restart: '1.5G', // Increased memory limit for better performance
      min_uptime: '10s',
      max_restarts: 5, // Reduced restarts in cluster mode
      restart_delay: 2000, // Faster restart for cluster mode
      autorestart: true,
      watch: false,

      // Graceful shutdown - optimized for cluster
      kill_timeout: 10000, // Longer timeout for graceful shutdown
      listen_timeout: 8000, // Longer listen timeout
      wait_ready: true, // Wait for ready signal

      // Health check
      health_check: true,
      health_check_grace_period: 5000, // Longer grace period for cluster
      health_check_fatal_exceptions: true,

      // Performance optimization flags
      node_args: [
        '--max-old-space-size=2048', // Increased heap size
        '--optimize-for-size', // Optimize for memory usage
        '--gc-interval=100', // More frequent GC
        '--max-semi-space-size=128' // Optimize young generation
      ].join(' '),

      // Production optimizations
      pmx: true,
      instance_var: 'INSTANCE_ID',

      // Cluster-specific optimizations
      merge_logs: true, // Merge logs from all instances
      log_type: 'json', // Structured logging
      
      // Performance monitoring
      monitoring: true, // Enable monitoring for performance tracking
      
      // Environment variables for performance
      env_production: {
        NODE_ENV: 'production',
        UV_THREADPOOL_SIZE: 128, // Increase thread pool size
        NODE_OPTIONS: '--enable-source-maps --unhandled-rejections=strict'
      }
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
      'post-deploy': 'pnpm install && pnpm run build-staging && pnpm run migrate-staging && pm2 reload ecosystem.config.cjs --env staging',
      'pre-setup': '',
      'ssh_options': 'StrictHostKeyChecking=no'
    }
  }
};