import { config } from "dotenv";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const backendDir = join(__dirname, "../..");
// Root project directory (3 levels up from config/dotenv.ts)
const rootDir = join(__dirname, "../../../..");

// Load environment variables based on NODE_ENV or explicit ENV_FILE
const envFile = process.env.ENV_FILE 
  ? process.env.ENV_FILE 
  : process.env.NODE_ENV === 'production' 
    ? '.env.staging' 
    : '.env';
  
// Try root directory first (for .env.staging), then backend directory (for .env)
const envPath = envFile === '.env.staging' 
  ? join(rootDir, envFile)
  : join(backendDir, envFile);
  
const result = config({ path: envPath });

if (result.error) {
  console.warn('⚠️  Warning: Could not load .env file:', result.error.message);
  console.warn('📁 Tried to load from:', envPath);
} else {
  console.log('✅ Environment variables loaded from:', envPath);
}

// Export to ensure this module is imported first
export const dotenvConfigured = true;

