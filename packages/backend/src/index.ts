import { config } from "dotenv";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import { existsSync } from "fs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = join(__dirname, "../..");

// Load environment variables based on NODE_ENV
const envFile = process.env.NODE_ENV === 'production' ? '.env.staging' : '.env';
config({ path: join(rootDir, envFile) });

import express from "express";
import { env } from "./config/env";
import { corsMiddleware } from "./middleware/cors";
import { errorHandler } from "./middleware/errorHandler";
import { healthRouter } from "./routes/health";
import { inventoryRouter } from "./routes/inventory";
import { kanbansRouter } from "./routes/kanbans";
import { locationsRouter } from "./routes/locations";
import { productsRouter } from "./routes/products";
import { publicRouter } from "./routes/public";
import { transferLogsRouter } from "./routes/transfer-logs";
import { uploadRouter } from "./routes/upload";
import { validationsRouter } from "./routes/validations";
import { authRouter } from "./routes/auth";
import { usersRouter } from "./routes/users";

const app = express();

// Middleware
app.use(corsMiddleware);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Static file serving for uploaded images (public access)
app.use('/uploads', express.static('uploads', {
  maxAge: '1d', // Cache for 1 day
  etag: true,
  lastModified: true
}));

// Production: Serve frontend static files
if (process.env.NODE_ENV === 'production') {
  const frontendDistPath = join(rootDir, 'packages/frontend/dist');

  // Check if frontend build exists
  if (existsSync(frontendDistPath)) {
    // Serve static files with appropriate caching
    app.use(express.static(frontendDistPath, {
      maxAge: '1y', // Cache static assets for 1 year
      etag: true,
      lastModified: true,
      setHeaders: (res, path) => {
        // Set different cache headers for different file types
        if (path.endsWith('.html')) {
          res.setHeader('Cache-Control', 'no-cache');
        } else if (path.match(/\.(js|css|png|jpg|jpeg|gif|ico|svg)$/)) {
          res.setHeader('Cache-Control', 'public, max-age=31536000'); // 1 year
        }
      }
    }));

    console.log('📦 Serving frontend static files from:', frontendDistPath);
  } else {
    console.warn('⚠️  Frontend build directory not found:', frontendDistPath);
  }
}

// Routes
app.use("/api", healthRouter);
app.use("/api/auth", authRouter);
app.use("/api/users", usersRouter);
app.use("/api/inventory", inventoryRouter);

// Protected routes (require authentication)
app.use("/api/kanbans", kanbansRouter);
app.use("/api/locations", locationsRouter);
app.use("/api/products", productsRouter);
app.use("/api/transfer-logs", transferLogsRouter);
app.use("/api/upload", uploadRouter);
app.use("/api/validations", validationsRouter);

// Public routes (no authentication required)
app.use("/api/public", publicRouter);

// Health check endpoint
app.get("/", (req, res) => {
  // In production, serve the React app
  if (process.env.NODE_ENV === 'production') {
    const frontendDistPath = join(rootDir, 'packages/frontend/dist');
    const indexPath = join(frontendDistPath, 'index.html');

    if (existsSync(indexPath)) {
      res.sendFile(indexPath);
    } else {
      res.json({ message: "InvenFlow API is running" });
    }
  } else {
    res.json({ message: "InvenFlow API is running" });
  }
});

// Production: SPA fallback - serve React app for all non-API routes
if (process.env.NODE_ENV === 'production') {
  const frontendDistPath = join(rootDir, 'packages/frontend/dist');
  const indexPath = join(frontendDistPath, 'index.html');

  if (existsSync(indexPath)) {
    // Catch-all handler for SPA routing
    app.get('*', (req, res, next) => {
      // Don't intercept API routes or static file requests
      if (req.path.startsWith('/api') || req.path.startsWith('/uploads')) {
        return next();
      }

      // Check if it's a file request (has extension)
      if (req.path.includes('.')) {
        return next();
      }

      // Serve index.html for all other routes (SPA routing)
      res.sendFile(indexPath);
    });

    console.log('🔄 SPA fallback route enabled');
  }
}

// Error handling middleware
app.use(errorHandler);

// Start server
app.listen(env.PORT, () => {
  console.log(`🚀 InvenFlow server running on port ${env.PORT}`);
  console.log(`📊 Health check: http://localhost:${env.PORT}/api/health`);
  console.log(`🌍 Environment: ${env.NODE_ENV}`);

  if (process.env.NODE_ENV === 'production') {
    console.log(`🌐 Full application: http://localhost:${env.PORT}/`);
    console.log(`📡 API endpoints: http://localhost:${env.PORT}/api/`);
    console.log(`📁 File uploads: http://localhost:${env.PORT}/uploads/`);
  }
});
