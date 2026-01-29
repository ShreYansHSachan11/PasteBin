/**
 * Client-Side Time Synchronization Utilities
 * 
 * This module provides utilities for accurate time synchronization between
 * client and server to ensure consistent expiration handling regardless of
 * client clock differences.
 * 
 * Features:
 * - Server-client time offset calculation
 * - Synchronized remaining time calculations
 * - Consistency with server-side expiration logic
 * - Efficient repeated calculations for countdown updates
 * - Robust error handling and fallback mechanisms
 * 
 * Requirements: 4.2, 4.3, 4.4, 4.5
 */

import { 
  TimeSyncState, 
  calculateTimeSyncOffset, 
  calculateRemainingTime,
  calculateRemainingTimeWithSync,
  createSynchronizedTimeCalculator,
  validateTimeSyncParameters,
  isPasteExpired
} from './time-utils';

// ============================================================================
// Time Synchronization Manager
// ============================================================================

/**
 * Manages client-server time synchronization for a paste session
 * 
 * This class provides a stateful interface for managing time synchronization
 * throughout the lifecycle of viewing a paste, ensuring consistent and
 * efficient time calculations.
 */
export class TimeSynchronizationManager {
  private syncState: TimeSyncState;
  private expiryTime: number;
  private timeCalculator: (currentClientTime?: number) => number;
  
  /**
   * Creates a new time synchronization manager
   * 
   * @param expiresAt - ISO 8601 expiry timestamp from server
   * @param serverTime - ISO 8601 current server time for synchronization
   * @throws Error if timestamps are invalid
   */
  constructor(expiresAt: string, serverTime: string) {
    // Validate input parameters
    const validation = validateTimeSyncParameters(expiresAt, serverTime);
    if (!validation.isValid) {
      throw new Error(`Invalid time sync parameters: ${validation.errors.join(', ')}`);
    }
    
    // Parse timestamps
    this.expiryTime = new Date(expiresAt).getTime();
    if (isNaN(this.expiryTime)) {
      throw new Error('Failed to parse expiry timestamp');
    }
    
    // Calculate synchronization state
    this.syncState = calculateTimeSyncOffset(serverTime);
    
    // Create optimized time calculator
    this.timeCalculator = createSynchronizedTimeCalculator(expiresAt, serverTime);
  }
  
  /**
   * Gets the current remaining time in milliseconds
   * 
   * @param currentClientTime - Current client timestamp (defaults to Date.now())
   * @returns Remaining time in milliseconds (0 if expired)
   */
  getRemainingTime(currentClientTime: number = Date.now()): number {
    return this.timeCalculator(currentClientTime);
  }
  
  /**
   * Checks if the paste is currently expired
   * 
   * @param currentClientTime - Current client timestamp (defaults to Date.now())
   * @returns True if paste is expired, false otherwise
   */
  isExpired(currentClientTime: number = Date.now()): boolean {
    return this.getRemainingTime(currentClientTime) <= 0;
  }
  
  /**
   * Gets the synchronization state information
   * 
   * @returns Current time synchronization state
   */
  getSyncState(): TimeSyncState {
    return { ...this.syncState };
  }
  
  /**
   * Gets the expiry timestamp in milliseconds
   * 
   * @returns Expiry timestamp
   */
  getExpiryTime(): number {
    return this.expiryTime;
  }
  
  /**
   * Checks if the synchronization is valid
   * 
   * @returns True if sync state is valid, false otherwise
   */
  isSyncValid(): boolean {
    return this.syncState.isValid;
  }
  
  /**
   * Gets diagnostic information about the synchronization
   * 
   * @returns Diagnostic information object
   */
  getDiagnostics(): {
    syncState: TimeSyncState;
    expiryTime: number;
    currentRemainingTime: number;
    isExpired: boolean;
    isSyncValid: boolean;
  } {
    const currentTime = Date.now();
    return {
      syncState: this.getSyncState(),
      expiryTime: this.expiryTime,
      currentRemainingTime: this.getRemainingTime(currentTime),
      isExpired: this.isExpired(currentTime),
      isSyncValid: this.isSyncValid()
    };
  }
}

// ============================================================================
// Utility Functions for React Components
// ============================================================================

/**
 * Creates a time synchronization manager from server response data
 * 
 * This is a convenience function for creating a TimeSynchronizationManager
 * from the standard server response format.
 * 
 * @param serverResponse - Server response containing expires_at and server_time
 * @returns TimeSynchronizationManager instance or null if no TTL
 */
export function createTimeSyncFromServerResponse(serverResponse: {
  expires_at: string | null;
  server_time: string;
}): TimeSynchronizationManager | null {
  if (!serverResponse.expires_at) {
    return null;
  }
  
  try {
    return new TimeSynchronizationManager(
      serverResponse.expires_at,
      serverResponse.server_time
    );
  } catch (error) {
    console.error('Failed to create time sync manager from server response:', error);
    return null;
  }
}

/**
 * Calculates initial display time for immediate rendering
 * 
 * This function provides the initial remaining time that should be displayed
 * immediately when a page loads, ensuring accuracy from the first render.
 * 
 * Requirements: 4.4
 * 
 * @param expiresAt - ISO 8601 expiry timestamp from server
 * @param serverTime - ISO 8601 current server time for synchronization
 * @returns Initial remaining time in milliseconds for display
 */
export function calculateInitialDisplayTime(
  expiresAt: string,
  serverTime: string
): number {
  try {
    return calculateRemainingTime(expiresAt, serverTime);
  } catch (error) {
    console.error('Failed to calculate initial display time:', error);
    return 0;
  }
}

/**
 * Validates that client and server expiration logic are consistent
 * 
 * This function can be used in development/testing to verify that the
 * client-side expiration determination matches what the server would decide.
 * 
 * Requirements: 4.5
 * 
 * @param expiresAt - ISO 8601 expiry timestamp from server
 * @param serverTime - ISO 8601 current server time for synchronization
 * @param expectedServerExpired - What the server considers the expiration state
 * @returns True if client and server logic are consistent
 */
export function validateExpirationConsistency(
  expiresAt: string,
  serverTime: string,
  expectedServerExpired: boolean
): boolean {
  try {
    const clientExpired = isPasteExpired(expiresAt, serverTime);
    return clientExpired === expectedServerExpired;
  } catch (error) {
    console.error('Failed to validate expiration consistency:', error);
    return false;
  }
}

// ============================================================================
// React Hook Integration Utilities
// ============================================================================

/**
 * Configuration for time synchronization in React components
 */
export interface TimeSyncHookConfig {
  /** Whether to log synchronization diagnostics */
  enableDiagnostics?: boolean;
  
  /** Whether to validate sync parameters on initialization */
  validateOnInit?: boolean;
  
  /** Callback for sync validation failures */
  onSyncValidationFailed?: (errors: string[]) => void;
}

/**
 * Creates a time synchronization manager with React-friendly error handling
 * 
 * This function provides a React-friendly way to create a time synchronization
 * manager with proper error handling and optional diagnostics.
 * 
 * @param expiresAt - ISO 8601 expiry timestamp from server
 * @param serverTime - ISO 8601 current server time for synchronization
 * @param config - Optional configuration for the hook
 * @returns TimeSynchronizationManager instance or null if creation failed
 */
export function createTimeSyncForReact(
  expiresAt: string,
  serverTime: string,
  config: TimeSyncHookConfig = {}
): TimeSynchronizationManager | null {
  try {
    // Validate parameters if requested
    if (config.validateOnInit) {
      const validation = validateTimeSyncParameters(expiresAt, serverTime);
      if (!validation.isValid) {
        if (config.onSyncValidationFailed) {
          config.onSyncValidationFailed(validation.errors);
        }
        return null;
      }
    }
    
    const manager = new TimeSynchronizationManager(expiresAt, serverTime);
    
    // Log diagnostics if enabled
    if (config.enableDiagnostics) {
      console.log('Time sync manager created:', manager.getDiagnostics());
    }
    
    return manager;
  } catch (error) {
    console.error('Failed to create time sync manager for React:', error);
    return null;
  }
}

// ============================================================================
// Export All Utilities
// ============================================================================

export {
  // Core time sync utilities from time-utils
  calculateTimeSyncOffset,
  calculateRemainingTime,
  calculateRemainingTimeWithSync,
  createSynchronizedTimeCalculator,
  validateTimeSyncParameters,
  isPasteExpired
};

// Export types separately
export type { TimeSyncState };