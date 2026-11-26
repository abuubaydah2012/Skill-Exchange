import { Request, Response, NextFunction } from 'express';

export interface ApiError extends Error {
  statusCode?: number;
  code?: number;
  errors?: Record<string, unknown>;
}

/**
 * Centralized error-handling middleware.
 * Ensures consistent JSON response structure and hides internal stack traces in production.
 */
export const errorHandler = (
  err: ApiError,
  _req: Request,
  res: Response,
  _next: NextFunction
): void => {
  let statusCode = err.statusCode || 500;
  let message = err.message || 'Internal Server Error';

  // Mongoose duplicate key error (E11000)
  if (err.code === 11000) {
    statusCode = 409;
    const field = err.message ? Object.keys((err as any).keyValue || {})[0] : 'field';
    message = `Duplicate value entered for ${field}. Please use a different value.`;
  }

  // Mongoose CastError (invalid ObjectId)
  if (err.name === 'CastError') {
    statusCode = 400;
    message = 'Resource not found or invalid identifier provided.';
  }

  // Mongoose ValidationError
  if (err.name === 'ValidationError' && err.errors) {
    statusCode = 400;
    const errorDetails = Object.values(err.errors).map((e: any) => e.message);
    message = errorDetails.join(', ');
  }

  // JWT errors
  if (err.name === 'JsonWebTokenError') {
    statusCode = 401;
    message = 'Invalid authentication token.';
  }
  if (err.name === 'TokenExpiredError') {
    statusCode = 401;
    message = 'Authentication token expired.';
  }

  res.status(statusCode).json({
    success: false,
    message,
    ...(process.env.NODE_ENV !== 'production' && { stack: err.stack }),
  });
};

/**
 * Fallback handler for undefined routes
 */
export const notFoundHandler = (req: Request, res: Response): void => {
  res.status(404).json({
    success: false,
    message: `API endpoint not found: ${req.method} ${req.originalUrl}`,
  });
};
