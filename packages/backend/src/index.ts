import express from 'express';
import { env } from './config/env';
import { corsMiddleware } from './middleware/cors';
import { errorHandler } from './middleware/errorHandler';
import { healthRouter } from './routes/health';
import { kanbansRouter } from './routes/kanbans';
import { locationsRouter } from './routes/locations';
import { productsRouter } from './routes/products';
import { publicRouter } from './routes/public';
import { transferLogsRouter } from './routes/transfer-logs';
import { uploadRouter } from './routes/upload';
import { validationsRouter } from './routes/validations';
import { authRouter } from './routes/auth';
import { usersRouter } from './routes/users';

const app = express();

// Middleware
app.use(corsMiddleware);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes
app.use('/api', healthRouter);
app.use('/api/auth', authRouter);
app.use('/api/users', usersRouter);

// Protected routes (require authentication)
app.use('/api/kanbans', kanbansRouter);
app.use('/api/locations', locationsRouter);
app.use('/api/products', productsRouter);
app.use('/api/transfer-logs', transferLogsRouter);
app.use('/api/upload', uploadRouter);
app.use('/api/validations', validationsRouter);

// Public routes (no authentication required)
app.use('/api/public', publicRouter);

// Health check endpoint
app.get('/', (req, res) => {
  res.json({ message: 'InvenFlow API is running' });
});

// Error handling middleware
app.use(errorHandler);

// Start server
app.listen(env.PORT, () => {
  console.log(`🚀 Server running on port ${env.PORT}`);
  console.log(`📊 Health check: http://localhost:${env.PORT}/api/health`);
  console.log(`🌍 Environment: ${env.NODE_ENV}`);
});