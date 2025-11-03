import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { db } from '../db';
import { users } from '../db/schema';
import { eq } from 'drizzle-orm';
import { createError } from '../middleware/errorHandler';
import { authenticateToken, AuthenticatedRequest } from '../middleware/auth';

const router = Router();

// Apply authentication middleware to all routes
router.use(authenticateToken);

// Get all users
router.get('/', async (req: AuthenticatedRequest, res, next) => {
  try {
    const allUsers = await db
      .select({
        id: users.id,
        email: users.email,
        name: users.name,
        role: users.role,
        createdAt: users.createdAt,
        updatedAt: users.updatedAt,
      })
      .from(users)
      .orderBy(users.createdAt);

    res.json(allUsers);
  } catch (error) {
    next(error);
  }
});

// Get user by ID
router.get('/:id', async (req: AuthenticatedRequest, res, next) => {
  try {
    const { id } = req.params;

    const user = await db
      .select({
        id: users.id,
        email: users.email,
        name: users.name,
        role: users.role,
        createdAt: users.createdAt,
        updatedAt: users.updatedAt,
      })
      .from(users)
      .where(eq(users.id, id))
      .limit(1);

    if (user.length === 0) {
      return next(createError('User not found', 404));
    }

    res.json(user[0]);
  } catch (error) {
    next(error);
  }
});

// Create new user
router.post('/', async (req: AuthenticatedRequest, res, next) => {
  try {
    const { email, password, name, role = 'user' } = req.body;

    // Validation
    if (!email || !password || !name) {
      return next(createError('Email, password, and name are required', 400));
    }

    if (!email.includes('@')) {
      return next(createError('Invalid email format', 400));
    }

    if (password.length < 6) {
      return next(createError('Password must be at least 6 characters', 400));
    }

    // Check if user already exists
    const existingUser = await db
      .select()
      .from(users)
      .where(eq(users.email, email))
      .limit(1);

    if (existingUser.length > 0) {
      return next(createError('User with this email already exists', 409));
    }

    // Hash password
    const passwordHash = bcrypt.hashSync(password, 12);

    // Create user
    const newUsers = await db
      .insert(users)
      .values({
        email,
        passwordHash,
        name,
        role,
      })
      .returning({
        id: users.id,
        email: users.email,
        name: users.name,
        role: users.role,
        createdAt: users.createdAt,
        updatedAt: users.updatedAt,
      });

    res.status(201).json({
      message: 'User created successfully',
      user: newUsers[0],
    });
  } catch (error) {
    next(error);
  }
});

// Update user
router.put('/:id', async (req: AuthenticatedRequest, res, next) => {
  try {
    const { id } = req.params;
    const { email, name, role, password } = req.body;

    // Check if user exists
    const existingUser = await db
      .select()
      .from(users)
      .where(eq(users.id, id))
      .limit(1);

    if (existingUser.length === 0) {
      return next(createError('User not found', 404));
    }

    // Prepare update data
    const updateData: any = {
      updatedAt: new Date(),
    };

    if (email) {
      if (!email.includes('@')) {
        return next(createError('Invalid email format', 400));
      }

      // Check if email is already used by another user
      const emailCheck = await db
        .select()
        .from(users)
        .where(eq(users.email, email))
        .limit(1);

      if (emailCheck.length > 0 && emailCheck[0].id !== id) {
        return next(createError('Email already in use', 409));
      }

      updateData.email = email;
    }

    if (name) {
      updateData.name = name;
    }

    if (role) {
      updateData.role = role;
    }

    if (password) {
      if (password.length < 6) {
        return next(createError('Password must be at least 6 characters', 400));
      }
      updateData.passwordHash = bcrypt.hashSync(password, 12);
    }

    // Update user
    const updatedUsers = await db
      .update(users)
      .set(updateData)
      .where(eq(users.id, id))
      .returning({
        id: users.id,
        email: users.email,
        name: users.name,
        role: users.role,
        createdAt: users.createdAt,
        updatedAt: users.updatedAt,
      });

    res.json({
      message: 'User updated successfully',
      user: updatedUsers[0],
    });
  } catch (error) {
    next(error);
  }
});

// Delete user
router.delete('/:id', async (req: AuthenticatedRequest, res, next) => {
  try {
    const { id } = req.params;

    // Check if user exists
    const existingUser = await db
      .select()
      .from(users)
      .where(eq(users.id, id))
      .limit(1);

    if (existingUser.length === 0) {
      return next(createError('User not found', 404));
    }

    // Prevent deletion of self
    if (req.user?.id === id) {
      return next(createError('Cannot delete your own account', 400));
    }

    // Delete user
    await db.delete(users).where(eq(users.id, id));

    res.json({
      message: 'User deleted successfully',
    });
  } catch (error) {
    next(error);
  }
});

export { router as usersRouter };