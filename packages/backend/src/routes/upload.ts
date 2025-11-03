import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { z } from 'zod';
import { FileUploadSchema } from '@invenflow/shared';
import { authenticateToken } from '../middleware/auth';

const router = express.Router();

// Apply authentication middleware to all routes
router.use(authenticateToken);

// Create uploads directory if it doesn't exist
const uploadsDir = path.join(process.cwd(), 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Configure multer storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    // Create subfolder by date
    const dateFolder = new Date().toISOString().split('T')[0];
    const uploadPath = path.join(uploadsDir, dateFolder);

    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true });
    }

    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    // Generate unique filename
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    cb(null, `${uniqueSuffix}${ext}`);
  }
});

// File filter for images only
const fileFilter = (req: express.Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Hanya file gambar (JPG, PNG, WebP) yang diizinkan'));
  }
};

// Configure multer
const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  }
});

// POST /api/upload - Upload single image
router.post('/', upload.single('image'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'Tidak ada file yang diupload' });
    }

    // Generate file URL (relative path for serving)
    const dateFolder = new Date().toISOString().split('T')[0];
    const relativePath = `uploads/${dateFolder}/${req.file.filename}`;
    const fileUrl = `${req.protocol}://${req.get('host')}/${relativePath}`;

    // Validate and create file upload response
    const fileUploadData = FileUploadSchema.parse({
      filename: req.file.filename,
      originalname: req.file.originalname,
      mimetype: req.file.mimetype,
      size: req.file.size,
      path: req.file.path,
      url: fileUrl,
    });

    res.json({
      success: true,
      file: fileUploadData,
    });
  } catch (error) {
    console.error('Upload error:', error);

    // Handle multer-specific errors
    if (error instanceof Error) {
      // Check for multer file validation errors
      if (error.message.includes('Hanya file gambar') ||
          error.message.includes('File too large') ||
          error.message.includes('Unexpected field') ||
          error.message.includes('LIMIT_FILE_SIZE') ||
          error.message.includes('LIMIT_FILE_COUNT') ||
          error.message.includes('LIMIT_FIELD_COUNT') ||
          error.message.includes('LIMIT_FIELD_KEY') ||
          error.message.includes('LIMIT_FIELD_VALUE') ||
          error.message.includes('LIMIT_FIELD_NAME') ||
          error.message.includes('LIMIT_UNEXPECTED_FILE')) {

        return res.status(422).json({
          error: error.message,
          details: 'File validation failed'
        });
      }
    }

    // Handle other errors
    res.status(500).json({
      error: 'Gagal mengupload file',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// GET /api/upload/:filename - Serve uploaded files
router.get('/:filename', (req, res) => {
  const filename = req.params.filename;

  // Security: sanitize filename to prevent path traversal
  const sanitizedFilename = filename.replace(/[^a-zA-Z0-9._-]/g, '');

  // Try to find file in any date folder
  const uploadsDir = path.join(process.cwd(), 'uploads');
  const dateFolders = fs.readdirSync(uploadsDir).filter(folder => {
    const folderPath = path.join(uploadsDir, folder);
    return fs.statSync(folderPath).isDirectory() && /^\d{4}-\d{2}-\d{2}$/.test(folder);
  });

  for (const dateFolder of dateFolders) {
    const filePath = path.join(uploadsDir, dateFolder, sanitizedFilename);
    if (fs.existsSync(filePath)) {
      return res.sendFile(filePath);
    }
  }

  res.status(404).json({ error: 'File tidak ditemukan' });
});

export { router as uploadRouter };