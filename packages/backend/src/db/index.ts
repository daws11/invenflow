import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';
import { env } from '../config/env';

const connectionString = env.DATABASE_URL;

if (!connectionString) {
  throw new Error('DATABASE_URL environment variable is not set');
}

// Optimized connection pool configuration for production performance
const client = postgres(connectionString, {
  // Connection pool settings
  max: process.env.NODE_ENV === 'production' ? 20 : 10, // Maximum connections in pool
  idle_timeout: 20, // Close idle connections after 20 seconds
  connect_timeout: 10, // Connection timeout in seconds
  
  // Performance optimizations
  prepare: false, // Disable prepared statements for better compatibility with connection pooling
  transform: {
    undefined: null, // Transform undefined values to null for PostgreSQL compatibility
  },
  
  // Connection management
  connection: {
    application_name: 'invenflow-backend',
    statement_timeout: 30000, // 30 second statement timeout
    idle_in_transaction_session_timeout: 60000, // 1 minute idle transaction timeout
  },
  
  // Error handling and debugging
  onnotice: process.env.NODE_ENV === 'development' ? console.log : undefined,
  debug: process.env.NODE_ENV === 'development',
  
  // SSL configuration for production
  ssl: process.env.NODE_ENV === 'production' ? 'require' : false,
});

export const db = drizzle(client, { 
  schema,
  logger: process.env.NODE_ENV === 'development',
});

// Graceful shutdown handling
const gracefulShutdown = async () => {
  console.log('Closing database connections...');
  try {
    await client.end();
    console.log('Database connections closed successfully.');
  } catch (error) {
    console.error('Error closing database connections:', error);
  }
};

process.on('SIGINT', gracefulShutdown);
process.on('SIGTERM', gracefulShutdown);

// Health check function for monitoring
export const checkDatabaseHealth = async (): Promise<boolean> => {
  try {
    await client`SELECT 1 as health_check`;
    return true;
  } catch (error) {
    console.error('Database health check failed:', error);
    return false;
  }
};

// Connection pool statistics for monitoring
export const getConnectionStats = () => {
  return {
    totalConnections: client.options.max || 10,
    // Note: postgres-js doesn't expose detailed pool stats
    // These would need to be tracked manually if needed
    configured: true,
    healthy: true, // Would need actual health check
  };
};