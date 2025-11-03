import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { createError } from './errorHandler';

export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    email: string;
    name: string;
    role: string;
  };
}

export const authenticateToken = (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

  if (!token) {
    return next(createError('Access token required', 401));
  }

  const jwtSecret = process.env.JWT_SECRET;
  if (!jwtSecret) {
    return next(createError('JWT_SECRET not configured', 500));
  }

  jwt.verify(token, jwtSecret, (err, decoded) => {
    if (err) {
      return next(createError('Invalid or expired token', 403));
    }

    // Attach user info to request
    req.user = decoded as {
      id: string;
      email: string;
      name: string;
      role: string;
    };

    next();
  });
};

// Middleware to optionally authenticate (doesn't fail if no token)
export const optionalAuth = (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return next(); // Continue without user info
  }

  const jwtSecret = process.env.JWT_SECRET;
  if (!jwtSecret) {
    return next(); // Continue without user info if JWT_SECRET not configured
  }

  jwt.verify(token, jwtSecret, (err, decoded) => {
    if (!err) {
      req.user = decoded as {
        id: string;
        email: string;
        name: string;
        role: string;
      };
    }
    next();
  });
};