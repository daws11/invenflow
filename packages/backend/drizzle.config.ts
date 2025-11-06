import { config } from "dotenv";
import { defineConfig } from 'drizzle-kit';

// Load environment variables from .env file
config({ path: './.env' });

export default defineConfig({
  schema: './src/db/schema/index.ts',
  out: './src/db/migrations',
  dialect: 'postgresql',
  driver: 'pg',
  dbCredentials: {
    connectionString: process.env.DATABASE_URL || "postgresql://yanuar@localhost:5432/invenflow",
  },
  verbose: true,
  strict: true,
});