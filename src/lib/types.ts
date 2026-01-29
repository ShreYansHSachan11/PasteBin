/**
 * Core data models and types for Pastebin-Lite
 * 
 * This file defines all TypeScript interfaces for:
 * - Paste model with all required fields
 * - API response interfaces
 * - Error response types and validation schemas
 * 
 * Requirements: 2.7, 3.2, 10.1
 */

// ============================================================================
// Core Data Models
// ============================================================================

/**
 * Paste model representing a text paste with optional constraints
 */
export interface Paste {
  /** Unique identifier (UUID v4) */
  id: string;
  
  /** The paste text content */
  content: string;
  
  /** Unix timestamp in milliseconds when paste was created */
  createdAt: number;
  
  /** Optional TTL in seconds - paste expires after this duration */
  ttlSeconds?: number;
  
  /** Optional view limit - paste becomes unavailable after this many views */
  maxViews?: number;
  
  /** Current view count (starts at 0, increments on each access) */
  viewCount: number;
}

// ============================================================================
// API Request Types
// ============================================================================

/**
 * Request body for creating a new paste
 */
export interface CreatePasteRequest {
  /** The text content of the paste (required, non-empty) */
  content: string;
  
  /** Optional TTL in seconds (must be >= 1 if provided) */
  ttl_seconds?: number;
  
  /** Optional maximum views (must be >= 1 if provided) */
  max_views?: number;
}

// ============================================================================
// API Response Types
// ============================================================================

/**
 * Response for successful paste creation (POST /api/pastes)
 * Requirements: 2.7
 */
export interface CreatePasteResponse {
  /** Unique identifier of the created paste */
  id: string;
  
  /** Shareable URL in format https://domain/p/:id */
  url: string;
}

/**
 * Response for successful paste retrieval (GET /api/pastes/[id])
 * Requirements: 3.2
 */
export interface GetPasteResponse {
  /** The paste text content */
  content: string;
  
  /** Remaining views before paste becomes unavailable (null if unlimited) */
  remaining_views: number | null;
  
  /** ISO 8601 timestamp when paste expires (null if no TTL) */
  expires_at: string | null;
}

/**
 * Response for health check endpoint (GET /api/healthz)
 * Requirements: 1.2, 1.5
 */
export interface HealthResponse {
  /** Boolean indicating if system is healthy */
  ok: boolean;
}

// ============================================================================
// Error Response Types
// ============================================================================

/**
 * Standard error response format for all API endpoints
 * Requirements: 10.1
 */
export interface ErrorResponse {
  /** Error type/category */
  error: string;
  
  /** Optional detailed error message */
  message?: string;
}

/**
 * Validation error details for input validation failures
 */
export interface ValidationError {
  /** Field name that failed validation */
  field: string;
  
  /** Validation error message */
  message: string;
}

/**
 * Extended error response for validation failures
 */
export interface ValidationErrorResponse extends ErrorResponse {
  /** Array of specific validation errors */
  validation_errors?: ValidationError[];
}

// ============================================================================
// Utility Types
// ============================================================================

/**
 * Paste availability status
 */
export type PasteAvailability = 
  | 'available'
  | 'expired'
  | 'view_limit_exceeded'
  | 'not_found';

/**
 * HTTP status codes used by the API
 */
export enum HttpStatus {
  OK = 200,
  BAD_REQUEST = 400,
  NOT_FOUND = 404,
  METHOD_NOT_ALLOWED = 405,
  TOO_MANY_REQUESTS = 429,
  INTERNAL_SERVER_ERROR = 500
}

/**
 * Standard error types
 */
export enum ErrorType {
  BAD_REQUEST = 'Bad Request',
  NOT_FOUND = 'Not Found',
  METHOD_NOT_ALLOWED = 'Method Not Allowed',
  TOO_MANY_REQUESTS = 'Too Many Requests',
  INTERNAL_SERVER_ERROR = 'Internal Server Error',
  VALIDATION_ERROR = 'Validation Error'
}

// ============================================================================
// Type Guards and Validation Helpers
// ============================================================================

/**
 * Type guard to check if a value is a valid CreatePasteRequest
 */
export function isValidCreatePasteRequest(value: unknown): value is CreatePasteRequest {
  if (!value || typeof value !== 'object') {
    return false;
  }
  
  const obj = value as Record<string, unknown>;
  
  // Content is required and must be non-empty string
  if (!obj.content || typeof obj.content !== 'string' || obj.content.trim() === '') {
    return false;
  }
  
  // TTL seconds must be integer >= 1 if provided
  if (obj.ttl_seconds !== undefined && obj.ttl_seconds !== null) {
    if (typeof obj.ttl_seconds !== 'number' || !Number.isInteger(obj.ttl_seconds) || obj.ttl_seconds < 1) {
      return false;
    }
  }
  
  // Max views must be integer >= 1 if provided
  if (obj.max_views !== undefined && obj.max_views !== null) {
    if (typeof obj.max_views !== 'number' || !Number.isInteger(obj.max_views) || obj.max_views < 1) {
      return false;
    }
  }
  
  return true;
}

/**
 * Validation result for input validation
 */
export interface ValidationResult {
  /** Whether validation passed */
  isValid: boolean;
  
  /** Array of validation errors if validation failed */
  errors: ValidationError[];
}

/**
 * Validates a CreatePasteRequest and returns detailed validation results
 */
export function validateCreatePasteRequest(value: unknown): ValidationResult {
  const errors: ValidationError[] = [];
  
  // Check if value is an object
  if (!value || typeof value !== 'object') {
    errors.push({
      field: 'body',
      message: 'Request body must be a valid JSON object'
    });
    return { isValid: false, errors };
  }
  
  const obj = value as Record<string, unknown>;
  
  // Validate content field
  if (!obj.content) {
    errors.push({
      field: 'content',
      message: 'Content is required and must be non-empty'
    });
  } else if (typeof obj.content !== 'string') {
    errors.push({
      field: 'content',
      message: 'Content must be a string'
    });
  } else if (obj.content.trim() === '') {
    errors.push({
      field: 'content',
      message: 'Content cannot be empty or only whitespace'
    });
  }
  
  // Validate ttl_seconds if provided
  if (obj.ttl_seconds !== undefined && obj.ttl_seconds !== null) {
    if (typeof obj.ttl_seconds !== 'number' || !Number.isInteger(obj.ttl_seconds)) {
      errors.push({
        field: 'ttl_seconds',
        message: 'TTL seconds must be an integer'
      });
    } else if (obj.ttl_seconds < 1) {
      errors.push({
        field: 'ttl_seconds',
        message: 'TTL seconds must be >= 1'
      });
    }
  }
  
  // Validate max_views if provided
  if (obj.max_views !== undefined && obj.max_views !== null) {
    if (typeof obj.max_views !== 'number' || !Number.isInteger(obj.max_views)) {
      errors.push({
        field: 'max_views',
        message: 'Max views must be an integer'
      });
    } else if (obj.max_views < 1) {
      errors.push({
        field: 'max_views',
        message: 'Max views must be >= 1'
      });
    }
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
}