/**
 * Paste creation API endpoint for Pastebin-Lite
 * 
 * POST /api/pastes
 * 
 * This endpoint handles paste creation with validation and constraint checking.
 * Generates unique IDs using crypto.randomUUID() and returns shareable URLs.
 * 
 * Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7
 */

import { NextRequest, NextResponse } from 'next/server';
import { createPaste } from '@/lib/paste-service';
import { CreatePasteRequest, HttpStatus } from '@/lib/types';
import { 
  createMethodNotAllowedResponse,
  handleJsonParsingError,
  handleUnexpectedError,
  logError
} from '@/lib/error-handler';

/**
 * POST /api/pastes - Create a new paste
 * 
 * Creates a new paste with optional TTL and view limit constraints.
 * 
 * @param request - Next.js request object
 * @returns JSON response with paste ID and shareable URL
 * 
 * Request Body:
 * {
 *   "content": "string (required, non-empty)",
 *   "ttl_seconds": "number (optional, >= 1)",
 *   "max_views": "number (optional, >= 1)"
 * }
 * 
 * Success Response (200):
 * {
 *   "id": "uuid-v4-string",
 *   "url": "https://domain/p/:id"
 * }
 * 
 * Error Response (400):
 * {
 *   "error": "Validation Error",
 *   "message": "content: Content is required and must be non-empty"
 * }
 * 
 * Error Response (500):
 * {
 *   "error": "Internal Server Error",
 *   "message": "Failed to create paste"
 * }
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    // Parse request body
    let requestBody: CreatePasteRequest;
    
    try {
      requestBody = await request.json();
    } catch (error) {
      logError(error, 'paste-creation-json-parsing', { endpoint: '/api/pastes' });
      return handleJsonParsingError(error);
    }
    
    // Extract headers for test mode support
    const headers: Record<string, string | string[] | undefined> = {};
    request.headers.forEach((value, key) => {
      headers[key] = value;
    });
    
    // Get base URL for generating shareable URLs
    const protocol = request.headers.get('x-forwarded-proto') || 'https';
    const host = request.headers.get('host') || 'localhost:3000';
    const baseUrl = `${protocol}://${host}`;
    
    // Create paste using service layer
    const result = await createPaste(requestBody, baseUrl, headers);
    
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
    // Unexpected error during paste creation
    logError(error, 'paste-creation', { 
      endpoint: '/api/pastes',
      method: 'POST'
    });
    
    return handleUnexpectedError(error, 'paste creation');
  }
}

/**
 * Handle unsupported HTTP methods
 * 
 * Returns 405 Method Not Allowed for any method other than POST
 */
export async function GET(): Promise<NextResponse> {
  return createMethodNotAllowedResponse(['POST'], 'GET');
}

export async function PUT(): Promise<NextResponse> {
  return createMethodNotAllowedResponse(['POST'], 'PUT');
}

export async function DELETE(): Promise<NextResponse> {
  return createMethodNotAllowedResponse(['POST'], 'DELETE');
}

export async function PATCH(): Promise<NextResponse> {
  return createMethodNotAllowedResponse(['POST'], 'PATCH');
}