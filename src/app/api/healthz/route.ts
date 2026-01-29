/**
 * Health check API endpoint for Pastebin-Lite
 * 
 * GET /api/healthz
 * 
 * This endpoint provides system health status including database connectivity.
 * Used by monitoring systems and load balancers to check service availability.
 * 
 * Requirements: 1.1, 1.2, 1.4, 1.5
 */

import { NextResponse } from 'next/server';
import { testDatabaseConnectivity } from '@/lib/database';
import { HealthResponse } from '@/lib/types';
import { 
  createHealthCheckErrorResponse, 
  createMethodNotAllowedResponse,
  logError
} from '@/lib/error-handler';

/**
 * GET /api/healthz - Health check endpoint
 * 
 * Returns system health status with database connectivity check.
 * 
 * @param request - Next.js request object
 * @returns JSON response with health status
 * 
 * Success Response (200):
 * {
 *   "ok": true
 * }
 * 
 * Error Response (500):
 * {
 *   "ok": false,
 *   "error": "Internal Server Error",
 *   "message": "Database connectivity failed"
 * }
 */
export async function GET(): Promise<NextResponse> {
  try {
    // Test database connectivity
    const isDatabaseHealthy = await testDatabaseConnectivity();
    
    if (isDatabaseHealthy) {
      // System is healthy
      const response: HealthResponse = {
        ok: true
      };
      
      return NextResponse.json(response, {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0'
        }
      });
    } else {
      // Database connectivity failed
      return createHealthCheckErrorResponse(false);
    }
    
  } catch (error) {
    // Unexpected error during health check
    logError(error, 'health-check', { endpoint: '/api/healthz' });
    return createHealthCheckErrorResponse(false, error);
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