module.exports = {
  apps: [
    {
      name: "invenflow-production",
      script: "./packages/backend/dist/index.js",
      cwd: "./",
      instances: "max", // Use all CPU cores for production
      exec_mode: "cluster",

      // Environment configuration
      env: {
        NODE_ENV: "production",
        PORT: 3002,
      },
      env_production: {
        NODE_ENV: "production",
        ENV_FILE: ".env.production",
        UV_THREADPOOL_SIZE: 128,
        NODE_OPTIONS: "--enable-source-maps --unhandled-rejections=strict",
        FRONTEND_URL: "https://inventory.ptunicorn.id",
        CORS_ORIGIN: "https://inventory.ptunicorn.id",
      },

      // Error and output logging
      error_file: "./logs/invenflow-production-error.log",
      out_file: "./logs/invenflow-production-out.log",
      log_file: "./logs/invenflow-production-combined.log",
      time: true,
      log_date_format: "YYYY-MM-DD HH:mm:ss Z",
      merge_logs: true,

      // Process management - optimized for production
      max_memory_restart: "2048M", // 2GB for production
      min_uptime: "10s",
      max_restarts: 10,
      restart_delay: 1000,
      autorestart: true,
      watch: false,

      // Graceful shutdown - optimized for cluster
      kill_timeout: 15000,
      listen_timeout: 10000,

      // Performance optimization flags
      node_args: "--max-old-space-size=4096 --optimize-for-size",

      // Production optimizations
      instance_var: "INSTANCE_ID",
    },
    {
      name: "invenflow-staging",
      script: "./packages/backend/dist/index.js",
      cwd: "./",
      instances: 4, // Optimized for 4-8 core server (use 4 instances for better resource utilization)
      exec_mode: "cluster", // Enable cluster mode for better performance

      // Environment configuration
      env: {
        NODE_ENV: "production",
        PORT: 3001,
      },
      env_staging: {
        NODE_ENV: "production",
        ENV_FILE: ".env.staging", // Explicitly tell backend to use staging env file
        UV_THREADPOOL_SIZE: 128, // Increase thread pool size
        NODE_OPTIONS: "--enable-source-maps --unhandled-rejections=strict",
      },

      // Error and output logging
      error_file: "./logs/invenflow-staging-error.log",
      out_file: "./logs/invenflow-staging-out.log",
      log_file: "./logs/invenflow-staging-combined.log",
      time: true,
      log_date_format: "YYYY-MM-DD HH:mm:ss Z",
      merge_logs: true, // Merge logs from all instances

      // Process management - FIXED: Use MB format instead of G
      max_memory_restart: "1536M", // 1536MB = 1.5GB - Fixed format for PM2 compatibility
      min_uptime: "10s",
      max_restarts: 5, // Reduced restarts in cluster mode
      restart_delay: 2000, // Faster restart for cluster mode
      autorestart: true,
      watch: false,

      // Graceful shutdown - optimized for cluster
      kill_timeout: 10000, // Longer timeout for graceful shutdown
      listen_timeout: 8000, // Longer listen timeout

      // Performance optimization flags - SIMPLIFIED: Use string format
      node_args: "--max-old-space-size=2048 --optimize-for-size",

      // Production optimizations
      instance_var: "INSTANCE_ID",
    },
  ],

  // Deploy configuration (optional, for future CI/CD integration)
  deploy: {
    staging: {
      user: "deploy",
      host: "your-staging-server.com",
      ref: "origin/main",
      repo: "git@github.com:your-username/invenflow.git",
      path: "/var/www/invenflow-staging",
      "pre-deploy-local": "",
      "post-deploy":
        "pnpm install && pnpm run build-staging && pnpm run migrate-staging && pm2 reload ecosystem.config.cjs --env staging",
      "pre-setup": "",
      ssh_options: "StrictHostKeyChecking=no",
    },
  },
};
