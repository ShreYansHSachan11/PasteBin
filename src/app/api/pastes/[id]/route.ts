/**
 * Paste retrieval API endpoint for Pastebin-Lite
 * 
 * GET /api/pastes/[id]
 * 
 * This endpoint handles paste retrieval with constraint checking:
 * - Returns 404 if paste doesn't exist
 * - Returns 404 if paste has expired (TTL exceeded)
 * - Returns 404 if paste has exceeded view limit
 * - Increments view count for available pastes
 * - Returns proper metadata (remaining_views, expires_at)
 * 
 * Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7, 3.8
 */

import { NextRequest, NextResponse } from 'next/server';
import { retrievePasteById } from '@/lib/paste-service';
import { HttpStatus } from '@/lib/types';
import { 
  createErrorResponse,
  createMethodNotAllowedResponse,
  handleUnexpectedError,
  logError,
  ErrorCategory
} from '@/lib/error-handler';

/**
 * GET /api/pastes/[id] - Retrieve a paste by ID
 * 
 * Retrieves a paste and increments its view count if available.
 * Handles all constraint checking including TTL and view limits.
 * 
 * @param request - Next.js request object
 * @param params - Route parameters containing the paste ID
 * @returns JSON response with paste content and metadata
 * 
 * Success Response (200):
 * {
 *   "content": "string",
 *   "remaining_views": number | null,
 *   "expires_at": "ISO 8601 string" | null
 * }
 * 
 * Error Response (404):
 * {
 *   "error": "Not Found",
 *   "message": "Paste not found or no longer available"
 * }
 * 
 * Error Response (500):
 * {
 *   "error": "Internal Server Error",
 *   "message": "Failed to retrieve paste"
 * }
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  try {
    const { id } = await params;
    
    // Basic ID validation
    if (!id || typeof id !== 'string' || id.trim() === '') {
      return createErrorResponse(
        ErrorCategory.NOT_FOUND,
        'Paste not found or no longer available'
      );
    }
    
    // Extract headers for test mode support
    const headers: Record<string, string | string[] | undefined> = {};
    request.headers.forEach((value, key) => {
      headers[key] = value;
    });
    
    // Retrieve paste using service layer
    const result = await retrievePasteById(id.trim(), headers);
    
    if (result.success) {
      return NextResponse.json(result.data, {
        status: HttpStatus.OK,
        headers: {
          'Content-Type': 'application/json'
        }
      });
    } else {
      return NextResponse.json(result.error, {
        status: result.status,
        headers: {
          'Content-Type': 'application/json'
        }
      });
    }
    
  } catch (error) {
    // Unexpected error during paste retrieval
    logError(error, 'paste-retrieval', { 
      endpoint: '/api/pastes/[id]',
      method: 'GET'
    });
    
    return handleUnexpectedError(error, 'paste retrieval');
  }
}

/**
 * Handle unsupported HTTP methods
 * 
 * Returns 405 Method Not Allowed for any method other than GET
 */
export async function POST(): Promise<NextResponse> {
  return createMethodNotAllowedResponse(['GET'], 'POST');
}

export async function PUT(): Promise<NextResponse> {
  return createMethodNotAllowedResponse(['GET'], 'PUT');
}

export async function DELETE(): Promise<NextResponse> {
  return createMethodNotAllowedResponse(['GET'], 'DELETE');
}

export async function PATCH(): Promise<NextResponse> {
  return createMethodNotAllowedResponse(['GET'], 'PATCH');
}