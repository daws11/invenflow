import { config } from "dotenv";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = join(__dirname, "../..");

// Load environment variables based on NODE_ENV
const envFile = process.env.NODE_ENV === 'production' ? '.env.staging' : '.env';
const result = config({ path: join(rootDir, envFile) });

if (result.error) {
  console.warn('⚠️  Warning: Could not load .env file:', result.error.message);
  console.warn('📁 Tried to load from:', join(rootDir, envFile));
} else {
  console.log('✅ Environment variables loaded from:', join(rootDir, envFile));
}

// Export to ensure this module is imported first
export const dotenvConfigured = true;

