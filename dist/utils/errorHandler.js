"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.InternalServerError = exports.BusinessLogicError = exports.ConflictError = exports.NotFoundError = exports.AuthorizationError = exports.AuthenticationError = exports.ValidationError = exports.AppError = void 0;
/**
 * Custom Error Handler Class
 * Standardizes error handling across the application
 */
class AppError extends Error {
    constructor(message, statusCode, isOperational = true) {
        super(message);
        this.statusCode = statusCode;
        this.isOperational = isOperational;
        // Maintain proper stack trace for where our error was thrown
        Object.setPrototypeOf(this, new.target.prototype);
        Error.captureStackTrace(this, this.constructor);
    }
}
exports.AppError = AppError;
/**
 * Validation Error
 */
class ValidationError extends AppError {
    constructor(message, field) {
        super(message, 400);
        this.field = field;
        Object.setPrototypeOf(this, ValidationError.prototype);
    }
}
exports.ValidationError = ValidationError;
/**
 * Authentication Error
 */
class AuthenticationError extends AppError {
    constructor(message = "Authentication failed") {
        super(message, 401);
        Object.setPrototypeOf(this, AuthenticationError.prototype);
    }
}
exports.AuthenticationError = AuthenticationError;
/**
 * Authorization Error
 */
class AuthorizationError extends AppError {
    constructor(message = "Not authorized to access this resource") {
        super(message, 403);
        Object.setPrototypeOf(this, AuthorizationError.prototype);
    }
}
exports.AuthorizationError = AuthorizationError;
/**
 * Not Found Error
 */
class NotFoundError extends AppError {
    constructor(resource, identifier) {
        const message = identifier ? `${resource} with id ${identifier} not found` : `${resource} not found`;
        super(message, 404);
        Object.setPrototypeOf(this, NotFoundError.prototype);
    }
}
exports.NotFoundError = NotFoundError;
/**
 * Conflict Error (Duplicate/Existing resource)
 */
class ConflictError extends AppError {
    constructor(message) {
        super(message, 409);
        Object.setPrototypeOf(this, ConflictError.prototype);
    }
}
exports.ConflictError = ConflictError;
/**
 * Business Logic Error
 */
class BusinessLogicError extends AppError {
    constructor(message) {
        super(message, 422);
        Object.setPrototypeOf(this, BusinessLogicError.prototype);
    }
}
exports.BusinessLogicError = BusinessLogicError;
/**
 * Internal Server Error
 */
class InternalServerError extends AppError {
    constructor(message = "Internal server error") {
        super(message, 500);
        Object.setPrototypeOf(this, InternalServerError.prototype);
    }
}
exports.InternalServerError = InternalServerError;
