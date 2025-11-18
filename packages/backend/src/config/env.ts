// Load dotenv configuration first
import './dotenv';

export const env = {
  PORT: parseInt(process.env.PORT || "3001", 10),
  NODE_ENV: process.env.NODE_ENV || "development",
  DATABASE_URL: process.env.DATABASE_URL!,
  JWT_SECRET: process.env.JWT_SECRET || "your-secret-key-change-in-production",
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || "24h",
  STORED_SWEEP_ENABLED: process.env.STORED_SWEEP_ENABLED !== "false",
  STORED_SWEEP_INTERVAL_MINUTES: Math.max(
    5,
    parseInt(process.env.STORED_SWEEP_INTERVAL_MINUTES || "30", 10),
  ),
  STORED_SWEEP_BATCH_LIMIT: Math.max(
    10,
    parseInt(process.env.STORED_SWEEP_BATCH_LIMIT || "100", 10),
  ),
};
