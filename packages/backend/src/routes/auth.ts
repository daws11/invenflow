import { Router } from 'express';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { db } from '../db';
import { users } from '../db/schema';
import { eq } from 'drizzle-orm';
import { createError } from '../middleware/errorHandler';
import { authenticateToken, AuthenticatedRequest } from '../middleware/auth';
import { env } from '../config/env';

const router = Router();

// Login route
router.post('/login', async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return next(createError('Email and password are required', 400));
    }

    // Find user by email
    const user = await db
      .select()
      .from(users)
      .where(eq(users.email, email))
      .limit(1);

    if (user.length === 0) {
      return next(createError('Invalid credentials', 401));
    }

    const foundUser = user[0];

    // Verify password
    const isValidPassword = bcrypt.compareSync(password, foundUser.passwordHash);
    if (!isValidPassword) {
      return next(createError('Invalid credentials', 401));
    }

    // Generate JWT token
    const token = jwt.sign(
      {
        id: foundUser.id,
        email: foundUser.email,
        name: foundUser.name,
        role: foundUser.role,
      },
      env.JWT_SECRET,
      { expiresIn: env.JWT_EXPIRES_IN }
    ) as string;

    res.json({
      message: 'Login successful',
      token,
      user: {
        id: foundUser.id,
        email: foundUser.email,
        name: foundUser.name,
        role: foundUser.role,
      },
    });
  } catch (error) {
    next(error);
  }
});

// Register route
router.post('/register', async (req, res, next) => {
  try {
    const { email, password, name, role } = req.body;

    if (!email || !password || !name) {
      return next(createError('Email, password, and name are required', 400));
    }

    // Check if user already exists
    const existingUser = await db
      .select()
      .from(users)
      .where(eq(users.email, email))
      .limit(1);

    if (existingUser.length > 0) {
      return next(createError('User already exists', 409));
    }

    // Hash password
    const passwordHash = bcrypt.hashSync(password, 10);

    // Create user
    const newUser = await db
      .insert(users)
      .values({
        email,
        passwordHash,
        name,
        role: role || 'user',
      })
      .returning();

    const { passwordHash: _, ...userWithoutPassword } = newUser[0];

    // Generate JWT token
    const token = jwt.sign(
      {
        id: userWithoutPassword.id,
        email: userWithoutPassword.email,
        name: userWithoutPassword.name,
        role: userWithoutPassword.role,
      },
      env.JWT_SECRET,
      { expiresIn: env.JWT_EXPIRES_IN }
    ) as string;

    res.status(201).json({
      message: 'User registered successfully',
      token,
      user: userWithoutPassword,
    });
  } catch (error) {
    next(error);
  }
});

// Get current user profile
router.get('/me', authenticateToken, async (req: AuthenticatedRequest, res, next) => {
  try {
    const user = req.user;
    if (!user) {
      return next(createError('User not found', 404));
    }

    // Fetch fresh user data from database
    const userData = await db
      .select({
        id: users.id,
        email: users.email,
        name: users.name,
        role: users.role,
        createdAt: users.createdAt,
        updatedAt: users.updatedAt,
      })
      .from(users)
      .where(eq(users.id, user.id))
      .limit(1);

    if (userData.length === 0) {
      return next(createError('User not found', 404));
    }

    res.json({
      user: userData[0],
    });
  } catch (error) {
    next(error);
  }
});

// Logout route (client-side token invalidation)
router.post('/logout', authenticateToken, (req, res) => {
  // In a JWT-based system, logout is typically handled client-side
  // by removing the token from storage
  res.json({
    message: 'Logout successful',
  });
});

export { router as authRouter };