/**
 * Centralized error handling utilities for Pastebin-Lite
 * 
 * This module provides:
 * - Standardized error response format
 * - Consistent HTTP status codes for all error conditions
 * - Graceful error handling for database failures
 * - Error logging and monitoring utilities
 * 
 * Requirements: 10.4
 */

import { NextResponse } from 'next/server';
import { ErrorResponse, HttpStatus, ErrorType } from './types';

// ============================================================================
// Error Categories and Mappings
// ============================================================================

/**
 * Standard error categories with consistent messaging
 */
export enum ErrorCategory {
  VALIDATION = 'validation',
  NOT_FOUND = 'not_found',
  DATABASE = 'database',
  INTERNAL = 'internal',
  METHOD_NOT_ALLOWED = 'method_not_allowed',
  RATE_LIMIT = 'rate_limit',
  TIMEOUT = 'timeout'
}

/**
 * Error details for each category
 */
interface ErrorDetails {
  type: ErrorType;
  status: HttpStatus;
  defaultMessage: string;
}

/**
 * Mapping of error categories to their details
 */
const ERROR_CATEGORY_MAP: Record<ErrorCategory, ErrorDetails> = {
  [ErrorCategory.VALIDATION]: {
    type: ErrorType.VALIDATION_ERROR,
    status: HttpStatus.BAD_REQUEST,
    defaultMessage: 'Invalid input provided'
  },
  [ErrorCategory.NOT_FOUND]: {
    type: ErrorType.NOT_FOUND,
    status: HttpStatus.NOT_FOUND,
    defaultMessage: 'Resource not found or no longer available'
  },
  [ErrorCategory.DATABASE]: {
    type: ErrorType.INTERNAL_SERVER_ERROR,
    status: HttpStatus.INTERNAL_SERVER_ERROR,
    defaultMessage: 'Database operation failed'
  },
  [ErrorCategory.INTERNAL]: {
    type: ErrorType.INTERNAL_SERVER_ERROR,
    status: HttpStatus.INTERNAL_SERVER_ERROR,
    defaultMessage: 'An unexpected error occurred'
  },
  [ErrorCategory.METHOD_NOT_ALLOWED]: {
    type: 'Method Not Allowed' as ErrorType,
    status: 405 as HttpStatus,
    defaultMessage: 'HTTP method not supported for this endpoint'
  },
  [ErrorCategory.RATE_LIMIT]: {
    type: 'Too Many Requests' as ErrorType,
    status: 429 as HttpStatus,
    defaultMessage: 'Rate limit exceeded'
  },
  [ErrorCategory.TIMEOUT]: {
    type: ErrorType.INTERNAL_SERVER_ERROR,
    status: HttpStatus.INTERNAL_SERVER_ERROR,
    defaultMessage: 'Request timeout'
  }
};

// ============================================================================
// Error Response Builders
// ============================================================================

/**
 * Creates a standardized error response
 * 
 * @param category - The error category
 * @param message - Optional custom error message
 * @param details - Optional additional error details
 * @returns NextResponse with standardized error format
 */
export function createErrorResponse(
  category: ErrorCategory,
  message?: string,
  details?: Record<string, unknown>
): NextResponse {
  const errorDetails = ERROR_CATEGORY_MAP[category];
  
  const response: ErrorResponse = {
    error: errorDetails.type,
    message: message || errorDetails.defaultMessage,
    ...details
  };
  
  return NextResponse.json(response, {
    status: errorDetails.status,
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-cache, no-store, must-revalidate'
    }
  });
}

/**
 * Creates a validation error response with detailed field errors
 * 
 * @param fieldErrors - Array of field-specific validation errors
 * @param message - Optional custom error message
 * @returns NextResponse with validation error format
 */
export function createValidationErrorResponse(
  fieldErrors: Array<{ field: string; message: string }>,
  message?: string
): NextResponse {
  const response: ErrorResponse & { validation_errors?: Array<{ field: string; message: string }> } = {
    error: ErrorType.VALIDATION_ERROR,
    message: message || 'Validation failed',
    validation_errors: fieldErrors
  };
  
  return NextResponse.json(response, {
    status: HttpStatus.BAD_REQUEST,
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-cache, no-store, must-revalidate'
    }
  });
}

/**
 * Creates a method not allowed error response
 * 
 * @param allowedMethods - Array of allowed HTTP methods
 * @param requestedMethod - The method that was requested
 * @returns NextResponse with method not allowed error
 */
export function createMethodNotAllowedResponse(
  allowedMethods: string[],
  requestedMethod?: string
): NextResponse {
  const message = requestedMethod 
    ? `Method ${requestedMethod} not allowed. Supported methods: ${allowedMethods.join(', ')}`
    : `Method not allowed. Supported methods: ${allowedMethods.join(', ')}`;
  
  return NextResponse.json(
    {
      error: 'Method Not Allowed',
      message
    },
    {
      status: 405,
      headers: {
        'Content-Type': 'application/json',
        'Allow': allowedMethods.join(', '),
        'Cache-Control': 'no-cache, no-store, must-revalidate'
      }
    }
  );
}

// ============================================================================
// Database Error Handling
// ============================================================================

/**
 * Handles database-related errors with appropriate categorization
 * 
 * @param error - The database error
 * @param operation - Description of the operation that failed
 * @returns NextResponse with appropriate error response
 */
export function handleDatabaseError(error: unknown, operation: string): NextResponse {
  // Log the error for monitoring
  console.error(`Database error during ${operation}:`, error);
  
  const errorMessage = error instanceof Error ? error.message : 'Unknown database error';
  
  // Check for specific database error types
  if (errorMessage.includes('connection') || errorMessage.includes('timeout')) {
    return createErrorResponse(
      ErrorCategory.DATABASE,
      'Database connection failed. Please try again later.'
    );
  }
  
  if (errorMessage.includes('not found') || errorMessage.includes('does not exist')) {
    return createErrorResponse(
      ErrorCategory.NOT_FOUND,
      'Resource not found or no longer available'
    );
  }
  
  // Generic database error
  return createErrorResponse(
    ErrorCategory.DATABASE,
    'Database operation failed. Please try again later.'
  );
}

// ============================================================================
// Request Parsing Error Handling
// ============================================================================

/**
 * Handles JSON parsing errors from request bodies
 * 
 * @param error - The parsing error
 * @returns NextResponse with validation error
 */
export function handleJsonParsingError(error: unknown): NextResponse {
  console.error('JSON parsing error:', error);
  
  return createValidationErrorResponse(
    [{ field: 'body', message: 'Invalid JSON format in request body' }],
    'Request body must be valid JSON'
  );
}

// ============================================================================
// Generic Error Handling
// ============================================================================

/**
 * Handles unexpected errors with proper logging and user-friendly messages
 * 
 * @param error - The unexpected error
 * @param context - Context about where the error occurred
 * @returns NextResponse with internal server error
 */
export function handleUnexpectedError(error: unknown, context: string): NextResponse {
  // Log the full error for debugging
  console.error(`Unexpected error in ${context}:`, error);
  
  // Don't expose internal error details to users
  return createErrorResponse(
    ErrorCategory.INTERNAL,
    'An unexpected error occurred. Please try again later.'
  );
}

// ============================================================================
// Error Logging and Monitoring
// ============================================================================

/**
 * Logs errors with structured format for monitoring
 * 
 * @param error - The error to log
 * @param context - Context information
 * @param metadata - Additional metadata
 */
export function logError(
  error: unknown,
  context: string,
  metadata?: Record<string, unknown>
): void {
  const errorInfo = {
    timestamp: new Date().toISOString(),
    context,
    error: error instanceof Error ? {
      name: error.name,
      message: error.message,
      stack: error.stack
    } : error,
    metadata
  };
  
  console.error('Application Error:', JSON.stringify(errorInfo, null, 2));
}

// ============================================================================
// Health Check Error Handling
// ============================================================================

/**
 * Creates a health check error response with system status
 * 
 * @param databaseHealthy - Whether database is healthy
 * @param error - Optional error details
 * @returns NextResponse with health status
 */
export function createHealthCheckErrorResponse(
  databaseHealthy: boolean,
  error?: unknown
): NextResponse {
  if (error) {
    logError(error, 'health-check', { databaseHealthy });
  }
  
  const response = {
    ok: false,
    error: ErrorType.INTERNAL_SERVER_ERROR,
    message: databaseHealthy 
      ? 'System health check failed'
      : 'Database connectivity failed'
  };
  
  return NextResponse.json(response, {
    status: HttpStatus.INTERNAL_SERVER_ERROR,
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0'
    }
  });
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Checks if an error is a known error type
 * 
 * @param error - The error to check
 * @returns True if error is a known type, false otherwise
 */
export function isKnownError(error: unknown): boolean {
  if (!(error instanceof Error)) {
    return false;
  }
  
  const knownErrorPatterns = [
    /validation/i,
    /not found/i,
    /connection/i,
    /timeout/i,
    /unauthorized/i,
    /forbidden/i
  ];
  
  return knownErrorPatterns.some(pattern => pattern.test(error.message));
}

/**
 * Extracts user-safe error message from an error
 * 
 * @param error - The error to extract message from
 * @param fallback - Fallback message if error is not user-safe
 * @returns User-safe error message
 */
export function getUserSafeErrorMessage(error: unknown, fallback: string): string {
  if (!(error instanceof Error)) {
    return fallback;
  }
  
  // Only return error message if it's a known, user-safe error
  if (isKnownError(error)) {
    return error.message;
  }
  
  return fallback;
}