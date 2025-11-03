import { z } from 'zod';

// Validation status types
export const ValidationStatusSchema = z.enum(['Received', 'Stored']);

// Form validation schema for "Received" status
export const ReceivedValidationSchema = z.object({
  columnStatus: z.literal('Received'),
  recipientName: z.string().min(1, 'Nama penerima harus diisi'),
  locationId: z.string().uuid('ID lokasi tidak valid').optional(),
  receivedImage: z.string().min(1, 'Gambar penerimaan harus diupload'),
  notes: z.string().optional(),
});

// Form validation schema for "Stored" status
export const StoredValidationSchema = z.object({
  columnStatus: z.literal('Stored'),
  recipientName: z.string().min(1, 'Nama penerima harus diisi'),
  locationId: z.string().uuid('ID lokasi tidak valid'),
  storagePhoto: z.string().min(1, 'Gambar storage harus diupload'),
  notes: z.string().optional(),
});

// Combined validation schema
export const ProductValidationSchema = z.discriminatedUnion('columnStatus', [
  ReceivedValidationSchema,
  StoredValidationSchema,
]);

// API response schemas
export const ProductValidationResponseSchema = z.object({
  id: z.string().uuid(),
  productId: z.string().uuid(),
  columnStatus: ValidationStatusSchema,
  recipientName: z.string(),
  locationId: z.string().uuid().optional(),
  receivedImage: z.string().optional(),
  storagePhoto: z.string().optional(),
  validatedBy: z.string(),
  notes: z.string().optional(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

// File upload schema
export const FileUploadSchema = z.object({
  filename: z.string(),
  originalname: z.string(),
  mimetype: z.string(),
  size: z.number(),
  path: z.string(),
  url: z.string(),
});

// Form data schema for API endpoints
export const CreateProductValidationSchema = z.object({
  productId: z.string().uuid(),
  columnStatus: ValidationStatusSchema,
  recipientName: z.string().min(1),
  locationId: z.string().uuid().nullable().optional(),
  receivedImage: z.string().nullable().optional(),
  storagePhoto: z.string().nullable().optional(),
  notes: z.string().nullable().optional(),
  validatedBy: z.string(),
});

// Type exports
export type ValidationStatus = z.infer<typeof ValidationStatusSchema>;
export type ReceivedValidation = z.infer<typeof ReceivedValidationSchema>;
export type StoredValidation = z.infer<typeof StoredValidationSchema>;
export type ProductValidation = z.infer<typeof ProductValidationSchema>;
export type ProductValidationResponse = z.infer<typeof ProductValidationResponseSchema>;
export type FileUpload = z.infer<typeof FileUploadSchema>;
export type CreateProductValidation = z.infer<typeof CreateProductValidationSchema>;