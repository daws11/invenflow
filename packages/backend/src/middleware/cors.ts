import cors from 'cors';

export const corsMiddleware = cors({
  origin: process.env.NODE_ENV === 'production'
    ? process.env.FRONTEND_URL
    : /localhost:\d+/, // Accept any localhost port for development
  credentials: true,
});