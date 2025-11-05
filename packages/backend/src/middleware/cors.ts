import cors from 'cors';

/**
 * Get allowed CORS origins based on environment
 */
const getAllowedOrigins = (): (string | RegExp)[] => {
  // Production mode: use FRONTEND_URL or CORS_ORIGIN from env
  if (process.env.NODE_ENV === 'production') {
    const origins: string[] = [];
    
    if (process.env.FRONTEND_URL) {
      origins.push(process.env.FRONTEND_URL);
    }
    
    if (process.env.CORS_ORIGIN) {
      origins.push(process.env.CORS_ORIGIN);
    }
    
    // Default fallback
    if (origins.length === 0) {
      origins.push('http://localhost:3001');
    }
    
    return origins;
  }
  
  // Development/Staging mode: Allow localhost and staging domains
  const origins: (string | RegExp)[] = [
    /localhost:\d+/, // Accept any localhost port for local development
  ];
  
  // Add staging domain if provided
  if (process.env.STAGING_DOMAIN) {
    origins.push(process.env.STAGING_DOMAIN);
  }
  
  // Add CORS_ORIGIN if provided (for reverse proxy setups)
  if (process.env.CORS_ORIGIN) {
    const corsOrigins = process.env.CORS_ORIGIN.split(',').map(s => s.trim());
    origins.push(...corsOrigins);
  }
  
  // Add FRONTEND_URL if provided
  if (process.env.FRONTEND_URL) {
    origins.push(process.env.FRONTEND_URL);
  }
  
  return origins;
};

export const corsMiddleware = cors({
  origin: (origin, callback) => {
    const allowedOrigins = getAllowedOrigins();
    
    // Allow requests with no origin (like mobile apps, Postman, curl, etc.)
    if (!origin) {
      return callback(null, true);
    }
    
    // Check if origin matches any allowed pattern
    const isAllowed = allowedOrigins.some(allowed => {
      if (typeof allowed === 'string') {
        return origin === allowed;
      }
      if (allowed instanceof RegExp) {
        return allowed.test(origin);
      }
      return false;
    });
    
    if (isAllowed) {
      callback(null, true);
    } else {
      // In development/staging, be more permissive for debugging
      if (process.env.NODE_ENV !== 'production') {
        console.warn(`⚠️  CORS: Origin "${origin}" not in allowed list, but allowing in ${process.env.NODE_ENV} mode`);
        callback(null, true); // Allow in dev/staging for easier debugging
      } else {
        console.error(`❌ CORS: Origin "${origin}" not allowed`);
        callback(new Error('Not allowed by CORS'));
      }
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
});