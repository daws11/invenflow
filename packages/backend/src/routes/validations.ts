import express from 'express';
import { db } from '../db';
import { productValidations } from '../db/schema';
import { eq } from 'drizzle-orm';
import { z } from 'zod';
import { authenticateToken } from '../middleware/auth';
import {
  CreateProductValidationSchema,
  ProductValidationResponseSchema,
  ValidationStatusSchema
} from '@invenflow/shared';

const router = express.Router();

// Apply authentication middleware to all routes
router.use(authenticateToken);

// POST /api/validations/validate - Create product validation
router.post('/validate', async (req, res) => {
  try {
    // Validate request body
    const validatedData = CreateProductValidationSchema.parse(req.body);

    // Check if validation already exists for this product and status
    const existingValidation = await db
      .select()
      .from(productValidations)
      .where(eq(productValidations.productId, validatedData.productId))
      .limit(1);

    const hasExistingValidation = existingValidation.some(
      validation => validation.columnStatus === validatedData.columnStatus
    );

    if (hasExistingValidation) {
      return res.status(400).json({
        error: 'Validasi untuk status ini sudah ada',
        details: `Product sudah memiliki validasi untuk status ${validatedData.columnStatus}`
      });
    }

    // Validate required fields based on status
    if (validatedData.columnStatus === 'Received') {
      if (!validatedData.receivedImage) {
        return res.status(400).json({
          error: 'Validasi gagal',
          details: 'Gambar penerimaan wajib diisi untuk status Received'
        });
      }
    }

    if (validatedData.columnStatus === 'Stored') {
      if (!validatedData.locationId) {
        return res.status(400).json({
          error: 'Validasi gagal',
          details: 'Lokasi wajib dipilih untuk status Stored'
        });
      }
      if (!validatedData.storagePhoto) {
        return res.status(400).json({
          error: 'Validasi gagal',
          details: 'Gambar storage wajib diisi untuk status Stored'
        });
      }
    }

    // Create new validation record
    const [newValidation] = await db
      .insert(productValidations)
      .values({
        ...validatedData,
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .returning();

    // Return response with proper schema
    const response = ProductValidationResponseSchema.parse({
      ...newValidation,
      createdAt: newValidation.createdAt.toISOString(),
      updatedAt: newValidation.updatedAt.toISOString(),
    });

    res.status(201).json({
      success: true,
      validation: response,
    });
  } catch (error) {
    console.error('Validation creation error:', error);

    if (error instanceof z.ZodError) {
      return res.status(400).json({
        error: 'Data validasi tidak valid',
        details: error.errors.map(err => ({
          field: err.path.join('.'),
          message: err.message,
        })),
      });
    }

    res.status(500).json({
      error: 'Gagal membuat validasi',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// GET /api/validations/product/:productId - Get validation history for a product
router.get('/product/:productId', async (req, res) => {
  try {
    const productId = req.params.productId;

    // Validate productId format
    try {
      z.string().uuid().parse(productId);
    } catch {
      return res.status(400).json({
        error: 'Product ID tidak valid'
      });
    }

    // Get all validations for this product
    const validations = await db
      .select()
      .from(productValidations)
      .where(eq(productValidations.productId, productId))
      .orderBy(productValidations.createdAt);

    // Format response
    const response = validations.map(validation => ({
      ...validation,
      createdAt: validation.createdAt.toISOString(),
      updatedAt: validation.updatedAt.toISOString(),
    }));

    res.json({
      success: true,
      validations,
    });
  } catch (error) {
    console.error('Get validations error:', error);
    res.status(500).json({
      error: 'Gagal mengambil data validasi',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// GET /api/validations/product/:productId/status/:status - Get specific validation for product and status
router.get('/product/:productId/status/:status', async (req, res) => {
  try {
    const productId = req.params.productId;
    const status = req.params.status;

    // Validate parameters
    try {
      z.string().uuid().parse(productId);
      ValidationStatusSchema.parse(status);
    } catch (error) {
      return res.status(400).json({
        error: 'Parameter tidak valid',
        details: 'Product ID atau status tidak valid'
      });
    }

    // Get specific validation
    const [validation] = await db
      .select()
      .from(productValidations)
      .where(eq(productValidations.productId, productId))
      .where(eq(productValidations.columnStatus, status))
      .limit(1);

    if (!validation) {
      return res.status(404).json({
        error: 'Validasi tidak ditemukan',
        details: `Tidak ada validasi untuk product ${productId} dengan status ${status}`
      });
    }

    // Format response
    const response = {
      ...validation,
      createdAt: validation.createdAt.toISOString(),
      updatedAt: validation.updatedAt.toISOString(),
    };

    res.json({
      success: true,
      validation: response,
    });
  } catch (error) {
    console.error('Get validation error:', error);
    res.status(500).json({
      error: 'Gagal mengambil data validasi',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// DELETE /api/validations/:id - Delete a validation (admin only)
router.delete('/:id', async (req, res) => {
  try {
    const validationId = req.params.id;

    // Validate validationId format
    try {
      z.string().uuid().parse(validationId);
    } catch {
      return res.status(400).json({
        error: 'Validation ID tidak valid'
      });
    }

    // Check if validation exists
    const [existingValidation] = await db
      .select()
      .from(productValidations)
      .where(eq(productValidations.id, validationId))
      .limit(1);

    if (!existingValidation) {
      return res.status(404).json({
        error: 'Validasi tidak ditemukan'
      });
    }

    // Delete validation
    await db
      .delete(productValidations)
      .where(eq(productValidations.id, validationId));

    res.json({
      success: true,
      message: 'Validasi berhasil dihapus',
    });
  } catch (error) {
    console.error('Delete validation error:', error);
    res.status(500).json({
      error: 'Gagal menghapus validasi',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

export { router as validationsRouter };