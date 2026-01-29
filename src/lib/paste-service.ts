/**
 * Paste Service - Business logic for Pastebin-Lite
 * 
 * This module handles all paste-related business logic including:
 * - Paste creation with input validation
 * - Paste availability checking (TTL and view limits)
 * - Time handling for test mode support
 * - View count increment logic
 * - Graceful error handling for all operations
 * 
 * Requirements: 2.1, 2.3, 2.4, 2.5, 5.1, 5.2, 5.3, 6.1, 6.2, 6.3, 10.4
 */

import { randomUUID } from 'crypto';
import { 
  Paste, 
  CreatePasteRequest, 
  CreatePasteResponse, 
  GetPasteResponse,
  PasteAvailability,
  validateCreatePasteRequest,
  ErrorResponse,
  ErrorType,
  HttpStatus
} from './types';
import { 
  storePaste, 
  retrievePaste, 
  incrementViewCount,
  isPasteExpired,
  isPasteViewLimitExceeded
} from './database';
import { logError } from './error-handler';

// ============================================================================
// Time Management for Test Mode Support
// ============================================================================

/**
 * Gets current time with support for test mode override
 * 
 * When TEST_MODE=1 environment variable is set, uses x-test-now-ms header
 * as current time for deterministic testing. Falls back to real system time
 * if header is absent.
 * 
 * Requirements: 5.3
 * 
 * @param headers - Request headers (for test mode time override)
 * @returns Current timestamp in milliseconds
 */
export function getCurrentTime(headers?: Record<string, string | string[] | undefined>): number {
  if (process.env.TEST_MODE === '1' && headers) {
    const testTimeHeader = headers['x-test-now-ms'];
    if (testTimeHeader) {
      const testTime = Array.isArray(testTimeHeader) ? testTimeHeader[0] : testTimeHeader;
      const parsedTime = parseInt(testTime, 10);
      if (!isNaN(parsedTime)) {
        return parsedTime;
      }
    }
  }
  
  return Date.now();
}

// ============================================================================
// Paste Availability Logic
// ============================================================================

/**
 * Checks if a paste is currently available based on TTL and view limits
 * 
 * A paste is unavailable if:
 * - It has expired (current time >= creation time + TTL)
 * - It has reached its view limit (viewCount >= maxViews)
 * 
 * Requirements: 5.1, 5.2, 6.1, 6.2, 6.3
 * 
 * @param paste - The paste to check availability for
 * @param currentTime - Current timestamp in milliseconds
 * @returns Availability status
 */
export function checkPasteAvailability(paste: Paste, currentTime: number): PasteAvailability {
  // Check TTL expiry first
  if (isPasteExpired(paste, currentTime)) {
    return 'expired';
  }
  
  // Check view limit
  if (isPasteViewLimitExceeded(paste)) {
    return 'view_limit_exceeded';
  }
  
  return 'available';
}

/**
 * Determines if a paste is available for access
 * 
 * @param paste - The paste to check
 * @param currentTime - Current timestamp in milliseconds
 * @returns True if paste is available, false otherwise
 */
export function isPasteAvailable(paste: Paste, currentTime: number): boolean {
  return checkPasteAvailability(paste, currentTime) === 'available';
}

// ============================================================================
// Paste Creation Logic
// ============================================================================

/**
 * Creates a new paste with validation and constraint checking
 * 
 * Validates input according to requirements:
 * - Content must be non-empty string
 * - TTL seconds must be integer >= 1 if provided
 * - Max views must be integer >= 1 if provided
 * 
 * Requirements: 2.1, 2.3, 2.4, 2.5, 10.4
 * 
 * @param request - The paste creation request
 * @param baseUrl - Base URL for generating shareable URLs
 * @param headers - Request headers (for test mode time override)
 * @returns Promise resolving to creation response or error
 */
export async function createPaste(
  request: CreatePasteRequest,
  baseUrl: string,
  headers?: Record<string, string | string[] | undefined>
): Promise<{ success: true; data: CreatePasteResponse } | { success: false; error: ErrorResponse; status: number }> {
  
  // Validate input
  const validation = validateCreatePasteRequest(request);
  if (!validation.isValid) {
    return {
      success: false,
      error: {
        error: ErrorType.VALIDATION_ERROR,
        message: validation.errors.map(e => `${e.field}: ${e.message}`).join(', ')
      },
      status: HttpStatus.BAD_REQUEST
    };
  }
  
  try {
    // Generate unique ID
    const id = randomUUID();
    const currentTime = getCurrentTime(headers);
    
    // Create paste object
    const paste: Paste = {
      id,
      content: request.content.trim(),
      createdAt: currentTime,
      ttlSeconds: request.ttl_seconds,
      maxViews: request.max_views,
      viewCount: 0
    };
    
    // Store paste in database
    await storePaste(paste);
    
    // Generate shareable URL
    const url = `${baseUrl}/p/${id}`;
    
    return {
      success: true,
      data: {
        id,
        url
      }
    };
    
  } catch (error) {
    logError(error, 'paste-creation', { 
      hasContent: !!request.content,
      hasTtl: !!request.ttl_seconds,
      hasMaxViews: !!request.max_views
    });
    
    return {
      success: false,
      error: {
        error: ErrorType.INTERNAL_SERVER_ERROR,
        message: 'Failed to create paste due to database error'
      },
      status: HttpStatus.INTERNAL_SERVER_ERROR
    };
  }
}

// ============================================================================
// Paste Retrieval Logic
// ============================================================================

/**
 * Retrieves a paste and increments view count if available
 * 
 * Handles all constraint checking:
 * - Returns 404 if paste doesn't exist
 * - Returns 404 if paste has expired
 * - Returns 404 if paste has exceeded view limit
 * - Increments view count for available pastes
 * 
 * Requirements: 3.1, 3.5, 5.2, 6.2, 6.3, 10.4
 * 
 * @param id - The paste ID to retrieve
 * @param headers - Request headers (for test mode time override)
 * @returns Promise resolving to paste response or error
 */
export async function retrievePasteById(
  id: string,
  headers?: Record<string, string | string[] | undefined>
): Promise<{ success: true; data: GetPasteResponse } | { success: false; error: ErrorResponse; status: number }> {
  
  try {
    // Retrieve paste from database
    const paste = await retrievePaste(id);
    
    if (!paste) {
      return {
        success: false,
        error: {
          error: ErrorType.NOT_FOUND,
          message: 'Paste not found or no longer available'
        },
        status: HttpStatus.NOT_FOUND
      };
    }
    
    const currentTime = getCurrentTime(headers);
    
    // Check availability before incrementing view count
    const availability = checkPasteAvailability(paste, currentTime);
    
    if (availability !== 'available') {
      return {
        success: false,
        error: {
          error: ErrorType.NOT_FOUND,
          message: 'Paste not found or no longer available'
        },
        status: HttpStatus.NOT_FOUND
      };
    }
    
    // Increment view count atomically
    const updatedPaste = await incrementViewCount(id);
    
    if (!updatedPaste) {
      // Paste was deleted between availability check and increment
      return {
        success: false,
        error: {
          error: ErrorType.NOT_FOUND,
          message: 'Paste not found or no longer available'
        },
        status: HttpStatus.NOT_FOUND
      };
    }
    
    // Calculate response metadata
    const remainingViews = updatedPaste.maxViews 
      ? Math.max(0, updatedPaste.maxViews - updatedPaste.viewCount)
      : null;
    
    const expiresAt = updatedPaste.ttlSeconds
      ? new Date(updatedPaste.createdAt + (updatedPaste.ttlSeconds * 1000)).toISOString()
      : null;
    
    return {
      success: true,
      data: {
        content: updatedPaste.content,
        remaining_views: remainingViews,
        expires_at: expiresAt,
        server_time: new Date(getCurrentTime()).toISOString()
      }
    };
    
  } catch (error) {
    logError(error, 'paste-retrieval', { 
      pasteId: id,
      operation: 'retrieve-and-increment'
    });
    
    return {
      success: false,
      error: {
        error: ErrorType.INTERNAL_SERVER_ERROR,
        message: 'Failed to retrieve paste due to database error'
      },
      status: HttpStatus.INTERNAL_SERVER_ERROR
    };
  }
}

// ============================================================================
// Paste Availability Checking (without view increment)
// ============================================================================

/**
 * Checks if a paste is available without incrementing view count
 * 
 * Used for web interface and other scenarios where we need to check
 * availability without consuming a view.
 * 
 * @param id - The paste ID to check
 * @param headers - Request headers (for test mode time override)
 * @returns Promise resolving to availability status and paste data
 */
export async function checkPasteAvailabilityById(
  id: string,
  headers?: Record<string, string | string[] | undefined>
): Promise<{ 
  availability: PasteAvailability; 
  paste: Paste | null;
  remainingViews: number | null;
  expiresAt: string | null;
}> {
  
  try {
    const paste = await retrievePaste(id);
    
    if (!paste) {
      return {
        availability: 'not_found',
        paste: null,
        remainingViews: null,
        expiresAt: null
      };
    }
    
    const currentTime = getCurrentTime(headers);
    const availability = checkPasteAvailability(paste, currentTime);
    
    // Calculate metadata
    const remainingViews = paste.maxViews 
      ? Math.max(0, paste.maxViews - paste.viewCount)
      : null;
    
    const expiresAt = paste.ttlSeconds
      ? new Date(paste.createdAt + (paste.ttlSeconds * 1000)).toISOString()
      : null;
    
    return {
      availability,
      paste,
      remainingViews,
      expiresAt
    };
    
  } catch (error) {
    logError(error, 'paste-availability-check', { 
      pasteId: id,
      operation: 'check-only'
    });
    
    return {
      availability: 'not_found',
      paste: null,
      remainingViews: null,
      expiresAt: null
    };
  }
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Calculates remaining time until paste expires
 * 
 * @param paste - The paste to calculate remaining time for
 * @param currentTime - Current timestamp in milliseconds
 * @returns Remaining time in milliseconds, or null if no TTL
 */
export function calculateRemainingTime(paste: Paste, currentTime: number): number | null {
  if (!paste.ttlSeconds) {
    return null;
  }
  
  const expiryTime = paste.createdAt + (paste.ttlSeconds * 1000);
  const remaining = expiryTime - currentTime;
  
  return Math.max(0, remaining);
}

/**
 * Formats a timestamp as ISO 8601 string
 * 
 * @param timestamp - Timestamp in milliseconds
 * @returns ISO 8601 formatted string
 */
export function formatTimestamp(timestamp: number): string {
  return new Date(timestamp).toISOString();
}

/**
 * Validates paste ID format (UUID v4)
 * 
 * @param id - The ID to validate
 * @returns True if valid UUID v4, false otherwise
 */
export function isValidPasteId(id: string): boolean {
  const uuidV4Regex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidV4Regex.test(id);
}