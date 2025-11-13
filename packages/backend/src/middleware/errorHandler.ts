import { Request, Response, NextFunction } from "express";

export interface AppError extends Error {
  statusCode?: number;
  isOperational?: boolean;
  details?: any;
}

// Multer error codes
const MULTER_ERRORS = {
  LIMIT_FILE_SIZE: "File terlalu besar",
  LIMIT_FILE_COUNT: "Terlalu banyak file",
  LIMIT_FIELD_COUNT: "Terlalu banyak field",
  LIMIT_FIELD_KEY: "Nama field terlalu panjang",
  LIMIT_FIELD_VALUE: "Value field terlalu panjang",
  LIMIT_FIELD_NAME: "Nama field terlalu panjang",
  LIMIT_UNEXPECTED_FILE: "Field tidak diharapkan",
};

export const errorHandler = (
  error: AppError,
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  let statusCode = error.statusCode || 500;
  let message = error.message || "Internal Server Error";

  // Handle multer-specific errors
  if (error.name === "MulterError") {
    const multerError = error as any;
    statusCode = 422; // Unprocessable Entity for validation errors
    message =
      MULTER_ERRORS[multerError.code as keyof typeof MULTER_ERRORS] ||
      "Error validasi file";
  }

  // Handle custom file validation errors
  if (
    error.message &&
    (error.message.includes("Hanya file gambar") ||
      error.message.includes("File type not allowed") ||
      error.message.includes("Invalid file type"))
  ) {
    statusCode = 422;
  }

  // Log error details in development
  if (process.env.NODE_ENV === "development") {
    console.error("Error:", error);
  }

  // Ensure JSON response for API routes
  const isApiRoute =
    req.path.startsWith("/api") || req.path.startsWith("/uploads");

  if (isApiRoute) {
    return res.status(statusCode).json({
      error: {
        message,
        ...(error.details && { details: error.details }),
        ...(process.env.NODE_ENV === "development" && { stack: error.stack }),
      },
    });
  }

  // For non-API routes, still return JSON to prevent HTML parsing errors
  res.status(statusCode).json({
    error: {
      message,
      ...(error.details && { details: error.details }),
    },
  });
};

export const createError = (
  message: string,
  statusCode: number = 500,
  details?: any,
): AppError => {
  const error = new Error(message) as AppError;
  error.statusCode = statusCode;
  error.isOperational = true;
  error.details = details;
  return error;
};
