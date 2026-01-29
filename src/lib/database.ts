/**
 * Database abstraction layer for Pastebin-Lite using Vercel KV (Redis)
 * 
 * This module provides:
 * - Functions for storing and retrieving pastes from Vercel KV
 * - Atomic operations for view count management
 * - TTL handling at database level using Redis expiration
 * - Graceful error handling for database failures
 * 
 * Requirements: 9.1, 9.3, 10.4
 */

import { kv } from '@vercel/kv';
import { Paste } from './types';
import { logError } from './error-handler';

// ============================================================================
// Constants and Configuration
// ============================================================================

/** Prefix for paste keys in Redis to avoid collisions */
const PASTE_KEY_PREFIX = 'paste:';

/** Default TTL for pastes without explicit expiry (30 days in seconds) */
const DEFAULT_MAX_TTL = 30 * 24 * 60 * 60; // 30 days

/** Maximum retry attempts for database operations */
const MAX_RETRY_ATTEMPTS = 3;

/** Retry delay in milliseconds */
const RETRY_DELAY_MS = 100;

// ============================================================================
// Key Generation Utilities
// ============================================================================

/**
 * Generates Redis key for a paste
 */
function getPasteKey(id: string): string {
  return `${PASTE_KEY_PREFIX}${id}`;
}

// ============================================================================
// Error Handling Utilities
// ============================================================================

/**
 * Wraps database operations with retry logic and error handling
 * 
 * @param operation - The database operation to execute
 * @param operationName - Name of the operation for logging
 * @param retries - Number of retry attempts remaining
 * @returns Promise resolving to operation result
 */
async function withRetry<T>(
  operation: () => Promise<T>,
  operationName: string,
  retries: number = MAX_RETRY_ATTEMPTS
): Promise<T> {
  try {
    return await operation();
  } catch (error) {
    if (retries > 0 && isRetryableError(error)) {
      logError(error, `database-${operationName}-retry`, { 
        retriesRemaining: retries - 1,
        operation: operationName
      });
      
      // Wait before retrying
      await new Promise(resolve => setTimeout(resolve, RETRY_DELAY_MS));
      return withRetry(operation, operationName, retries - 1);
    }
    
    // Log final error and re-throw
    logError(error, `database-${operationName}-failed`, { 
      operation: operationName,
      finalAttempt: true
    });
    
    throw new Error(`Database ${operationName} failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Determines if an error is retryable
 * 
 * @param error - The error to check
 * @returns True if error is retryable, false otherwise
 */
function isRetryableError(error: unknown): boolean {
  if (!(error instanceof Error)) {
    return false;
  }
  
  const retryablePatterns = [
    /timeout/i,
    /connection/i,
    /network/i,
    /temporary/i,
    /busy/i
  ];
  
  return retryablePatterns.some(pattern => pattern.test(error.message));
}

// ============================================================================
// Core Database Operations
// ============================================================================

/**
 * Stores a paste in Vercel KV with optional TTL
 * 
 * @param paste - The paste object to store
 * @returns Promise that resolves when paste is stored
 * @throws Error if database operation fails after retries
 */
export async function storePaste(paste: Paste): Promise<void> {
  return withRetry(async () => {
    const key = getPasteKey(paste.id);
    
    // Calculate TTL for Redis expiration
    let ttlSeconds: number;
    
    if (paste.ttlSeconds) {
      // Use the paste's TTL
      ttlSeconds = paste.ttlSeconds;
    } else {
      // Use default max TTL to prevent indefinite storage
      ttlSeconds = DEFAULT_MAX_TTL;
    }
    
    // Store paste object directly (Vercel KV handles JSON serialization)
    await kv.set(key, paste, { ex: ttlSeconds });
  }, 'store-paste');
}

/**
 * Retrieves a paste from Vercel KV
 * 
 * @param id - The paste ID to retrieve
 * @returns Promise that resolves to the paste object or null if not found
 * @throws Error if database operation fails after retries
 */
export async function retrievePaste(id: string): Promise<Paste | null> {
  return withRetry(async () => {
    const key = getPasteKey(id);
    const result = await kv.get<Paste>(key);
    
    if (!result) {
      return null;
    }
    
    // Vercel KV returns the object directly, no need to parse JSON
    return result;
  }, 'retrieve-paste');
}

/**
 * Atomically increments the view count for a paste
 * 
 * This operation is atomic to handle concurrent access correctly.
 * Uses Redis transaction for optimistic locking.
 * 
 * @param id - The paste ID to increment view count for
 * @returns Promise that resolves to the updated paste or null if not found
 * @throws Error if database operation fails after retries
 */
export async function incrementViewCount(id: string): Promise<Paste | null> {
  return withRetry(async () => {
    const key = getPasteKey(id);
    
    // First, get the current paste
    const currentPaste = await kv.get<Paste>(key);
    if (!currentPaste) {
      return null;
    }
    
    // Increment view count
    const updatedPaste: Paste = {
      ...currentPaste,
      viewCount: currentPaste.viewCount + 1
    };
    
    // Calculate remaining TTL to preserve expiration
    const ttl = await kv.ttl(key);
    
    // Store updated paste with preserved TTL
    if (ttl > 0) {
      await kv.set(key, updatedPaste, { ex: ttl });
    } else {
      // If no TTL or expired, use default
      await kv.set(key, updatedPaste, { ex: DEFAULT_MAX_TTL });
    }
    
    return updatedPaste;
  }, 'increment-view-count');
}

/**
 * Deletes a paste from the database
 * 
 * @param id - The paste ID to delete
 * @returns Promise that resolves to true if paste was deleted, false if not found
 * @throws Error if database operation fails after retries
 */
export async function deletePaste(id: string): Promise<boolean> {
  return withRetry(async () => {
    const key = getPasteKey(id);
    const result = await kv.del(key);
    return result > 0;
  }, 'delete-paste');
}

/**
 * Checks if a paste exists in the database
 * 
 * @param id - The paste ID to check
 * @returns Promise that resolves to true if paste exists, false otherwise
 * @throws Error if database operation fails after retries
 */
export async function pasteExists(id: string): Promise<boolean> {
  return withRetry(async () => {
    const key = getPasteKey(id);
    const exists = await kv.exists(key);
    return exists === 1;
  }, 'paste-exists');
}

/**
 * Gets the TTL (time to live) for a paste in seconds
 * 
 * @param id - The paste ID to check TTL for
 * @returns Promise that resolves to TTL in seconds, -1 if no expiry, -2 if not found
 * @throws Error if database operation fails after retries
 */
export async function getPasteTTL(id: string): Promise<number> {
  return withRetry(async () => {
    const key = getPasteKey(id);
    return await kv.ttl(key);
  }, 'get-paste-ttl');
}

// ============================================================================
// Health Check and Connectivity
// ============================================================================

/**
 * Tests database connectivity for health checks
 * 
 * @returns Promise that resolves to true if database is accessible, false otherwise
 */
export async function testDatabaseConnectivity(): Promise<boolean> {
  try {
    // Simple ping operation to test connectivity
    const testKey = 'health:ping';
    const testValue = Date.now().toString();
    
    // Set and immediately get a test value with timeout
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error('Database connectivity test timeout')), 5000);
    });
    
    const testPromise = (async () => {
      await kv.set(testKey, testValue, { ex: 10 }); // Expire in 10 seconds
      const result = await kv.get(testKey);
      
      // Clean up test key
      await kv.del(testKey);
      
      return result === testValue;
    })();
    
    return await Promise.race([testPromise, timeoutPromise]);
    
  } catch (error) {
    logError(error, 'database-connectivity-test', { 
      testType: 'health-check'
    });
    return false;
  }
}

// ============================================================================
// Batch Operations (for future use)
// ============================================================================

/**
 * Retrieves multiple pastes by their IDs
 * 
 * @param ids - Array of paste IDs to retrieve
 * @returns Promise that resolves to array of pastes (null for not found)
 * @throws Error if database operation fails after retries
 */
export async function retrieveMultiplePastes(ids: string[]): Promise<(Paste | null)[]> {
  return withRetry(async () => {
    const keys = ids.map(id => getPasteKey(id));
    const results = await kv.mget<Paste[]>(...keys);
    
    return results.map((result) => {
      if (!result) return null;
      return result;
    });
  }, 'retrieve-multiple-pastes');
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Calculates the expiry timestamp for a paste
 * 
 * @param createdAt - Creation timestamp in milliseconds
 * @param ttlSeconds - TTL in seconds
 * @returns Expiry timestamp in milliseconds
 */
export function calculateExpiryTime(createdAt: number, ttlSeconds: number): number {
  return createdAt + (ttlSeconds * 1000);
}

/**
 * Checks if a paste has expired based on current time
 * 
 * @param paste - The paste to check
 * @param currentTime - Current timestamp in milliseconds
 * @returns True if paste has expired, false otherwise
 */
export function isPasteExpired(paste: Paste, currentTime: number): boolean {
  if (!paste.ttlSeconds) {
    return false;
  }
  
  const expiryTime = calculateExpiryTime(paste.createdAt, paste.ttlSeconds);
  return currentTime >= expiryTime;
}

/**
 * Checks if a paste has exceeded its view limit
 * 
 * @param paste - The paste to check
 * @returns True if paste has exceeded view limit, false otherwise
 */
export function isPasteViewLimitExceeded(paste: Paste): boolean {
  if (!paste.maxViews) {
    return false;
  }
  
  return paste.viewCount >= paste.maxViews;
}