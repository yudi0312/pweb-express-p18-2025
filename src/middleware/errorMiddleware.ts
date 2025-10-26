import { Request, Response, NextFunction } from "express";
import { AppError } from "../utils/errorHandler";

/**
 * Global Error Handling Middleware
 * Catches all errors and formats them consistently
 */
export const errorMiddleware = (
  err: Error | AppError,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  // Log error for debugging
  console.error("[ERROR]", {
    timestamp: new Date().toISOString(),
    method: req.method,
    path: req.path,
    error: err.message,
    stack: err.stack,
  });

  // Default to 500 Internal Server Error
  let statusCode = 500;
  let message = "Internal server error";
  let isOperational = false;

  // Handle known AppError instances
  if (err instanceof AppError) {
    statusCode = err.statusCode;
    message = err.message;
    isOperational = err.isOperational;
  }
  // Handle Prisma errors
  else if ((err as any).code) {
    const prismaCode = (err as any).code;

    switch (prismaCode) {
      case "P2002": // Unique constraint violation
        statusCode = 409;
        const field = (err as any).meta?.target?.[0] || "field";
        message = `Duplicate ${field}: This ${field} already exists`;
        isOperational = true;
        break;

      case "P2003": // Foreign key constraint violation
        statusCode = 400;
        const modelName = (err as any).meta?.modelName || "record";
        const constraint = (err as any).meta?.constraint || "unknown";
        message = `Invalid reference: Cannot create ${modelName.toLowerCase()} due to invalid foreign key (${constraint})`;
        isOperational = true;
        break;

      case "P2004": // Required relation violation
        statusCode = 400;
        message = "Required relation violation: Cannot delete record due to dependent records";
        isOperational = true;
        break;

      case "P2025": // Record not found
        statusCode = 404;
        message = "Record not found";
        isOperational = true;
        break;

      case "P2014": // Relation violation
        statusCode = 400;
        message = "Relation constraint violation";
        isOperational = true;
        break;

      case "P2000": // Value too long
        statusCode = 400;
        message = "Value is too long for the field";
        isOperational = true;
        break;

      case "P2001": // Record does not exist
        statusCode = 404;
        message = "The record does not exist";
        isOperational = true;
        break;

      default:
        statusCode = 500;
        message = "Database error occurred";
        isOperational = false;
    }
  }
  // Handle JSON parsing errors
  else if (err instanceof SyntaxError && "body" in err) {
    statusCode = 400;
    message = "Invalid JSON in request body";
    isOperational = true;
  }
  // Handle other errors
  else {
    statusCode = 500;
    message = process.env.NODE_ENV === "development" ? err.message : "Internal server error";
    isOperational = false;
  }

  // Send error response
  res.status(statusCode).json({
    status: false,
    message,
    ...(process.env.NODE_ENV === "development" && {
      error: {
        code: (err as any).code,
        details: err.message,
        stack: err.stack,
      },
    }),
  });
};

/**
 * Async route wrapper to catch errors and pass to next()
 */
export const catchAsync =
  (fn: (req: Request, res: Response, next: NextFunction) => Promise<any>) =>
  (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
