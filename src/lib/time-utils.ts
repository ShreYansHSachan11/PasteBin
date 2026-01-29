/**
 * Time formatting utilities for expiration counter
 * 
 * This module provides utilities for:
 * - Converting milliseconds to human-readable time format
 * - Determining visual urgency levels based on remaining time
 * - Managing countdown state and timer configuration
 * 
 * Requirements: 1.5, 2.2, 2.3, 2.4, 2.5, 2.6
 */

// ============================================================================
// Type Definitions
// ============================================================================

/**
 * Visual urgency level for countdown display
 */
export type UrgencyLevel = 'normal' | 'warning' | 'critical';

/**
 * Formatted time representation with display string and urgency level
 */
export interface FormattedTime {
  /** Human-readable time format (e.g., "2h 15m 30s", "45m 12s", "30s") */
  display: string;
  
  /** Visual urgency level for styling */
  urgency: UrgencyLevel;
  
  /** Individual time components */
  parts: {
    hours: number;
    minutes: number;
    seconds: number;
  };
}

/**
 * Countdown state for timer management
 */
export interface CountdownState {
  /** Remaining time in milliseconds */
  remainingMs: number;
  
  /** Whether the countdown has expired (reached zero) */
  isExpired: boolean;
  
  /** Whether the timer is currently active/running */
  isActive: boolean;
}

/**
 * Configuration for countdown timer behavior
 */
export interface TimerConfig {
  /** Update interval in milliseconds (default: 1000ms) */
  updateInterval: number;
  
  /** Warning threshold in milliseconds (default: 5 minutes) */
  warningThreshold: number;
  
  /** Critical threshold in milliseconds (default: 1 minute) */
  criticalThreshold: number;
}

/**
 * Props for ExpirationCounter component
 */
export interface ExpirationCounterProps {
  /** ISO 8601 expiry timestamp from server */
  expiresAt: string;
  
  /** ISO 8601 current server time for synchronization */
  serverTime: string;
  
  /** Optional callback when countdown reaches zero */
  onExpired?: () => void;
}

/**
 * State for expiration handling
 */
export interface ExpirationState {
  /** Remaining time in milliseconds */
  remainingMs: number;
  
  /** Whether the paste has expired */
  isExpired: boolean;
  
  /** Current urgency level for visual styling */
  urgencyLevel: UrgencyLevel;
  
  /** Formatted time string for display */
  formattedTime: string;
}

// ============================================================================
// Constants
// ============================================================================

/** Default timer configuration */
export const DEFAULT_TIMER_CONFIG: TimerConfig = {
  updateInterval: 1000,           // 1 second
  warningThreshold: 5 * 60 * 1000, // 5 minutes
  criticalThreshold: 1 * 60 * 1000, // 1 minute
};

/** Time constants in milliseconds */
export const TIME_CONSTANTS = {
  SECOND: 1000,
  MINUTE: 60 * 1000,
  HOUR: 60 * 60 * 1000,
  DAY: 24 * 60 * 60 * 1000,
} as const;

// ============================================================================
// Core Formatting Functions
// ============================================================================

/**
 * Converts milliseconds to individual time components
 * 
 * @param remainingMs - Remaining time in milliseconds
 * @returns Object with hours, minutes, and seconds
 */
export function msToTimeComponents(remainingMs: number): { hours: number; minutes: number; seconds: number } {
  // Ensure non-negative values
  const ms = Math.max(0, remainingMs);
  
  const hours = Math.floor(ms / TIME_CONSTANTS.HOUR);
  const minutes = Math.floor((ms % TIME_CONSTANTS.HOUR) / TIME_CONSTANTS.MINUTE);
  const seconds = Math.floor((ms % TIME_CONSTANTS.MINUTE) / TIME_CONSTANTS.SECOND);
  
  return { hours, minutes, seconds };
}

/**
 * Determines urgency level based on remaining time
 * 
 * @param remainingMs - Remaining time in milliseconds
 * @param config - Timer configuration with thresholds
 * @returns Urgency level for visual styling
 */
export function getUrgencyLevel(
  remainingMs: number, 
  config: TimerConfig = DEFAULT_TIMER_CONFIG
): UrgencyLevel {
  if (remainingMs <= config.criticalThreshold) {
    return 'critical';
  }
  if (remainingMs <= config.warningThreshold) {
    return 'warning';
  }
  return 'normal';
}

/**
 * Formats time components into human-readable display string
 * 
 * Formatting rules:
 * - > 1 hour: "2h 15m 30s" format
 * - 1 hour - 1 minute: "45m 30s" format  
 * - < 1 minute: "30s" format
 * 
 * @param hours - Hours component
 * @param minutes - Minutes component  
 * @param seconds - Seconds component
 * @returns Formatted display string
 */
export function formatTimeDisplay(hours: number, minutes: number, seconds: number): string {
  if (hours > 0) {
    // Show hours, minutes, and seconds
    return `${hours}h ${minutes}m ${seconds}s`;
  } else if (minutes > 0) {
    // Show minutes and seconds only
    return `${minutes}m ${seconds}s`;
  } else {
    // Show seconds only
    return `${seconds}s`;
  }
}

/**
 * Main function to format remaining time into complete FormattedTime object
 * 
 * @param remainingMs - Remaining time in milliseconds
 * @param config - Optional timer configuration
 * @returns Complete formatted time object with display string and urgency
 */
export function formatRemainingTime(
  remainingMs: number, 
  config: TimerConfig = DEFAULT_TIMER_CONFIG
): FormattedTime {
  const parts = msToTimeComponents(remainingMs);
  const display = formatTimeDisplay(parts.hours, parts.minutes, parts.seconds);
  const urgency = getUrgencyLevel(remainingMs, config);
  
  return {
    display,
    urgency,
    parts,
  };
}

// ============================================================================
// Time Calculation Utilities
// ============================================================================

/**
 * Client-server time synchronization state
 */
export interface TimeSyncState {
  /** Server-client time offset in milliseconds */
  serverClientOffset: number;
  
  /** Timestamp when sync was calculated */
  syncTimestamp: number;
  
  /** Whether the sync is considered valid */
  isValid: boolean;
}

/**
 * Calculates server-client time offset for synchronization
 * 
 * This function determines the time difference between server and client clocks
 * to ensure accurate countdown calculations regardless of client clock drift.
 * 
 * Requirements: 4.2, 4.3
 * 
 * @param serverTime - ISO 8601 current server time for synchronization
 * @param clientTime - Client timestamp when server time was received (defaults to Date.now())
 * @returns TimeSyncState with offset and validity information
 */
export function calculateTimeSyncOffset(
  serverTime: string, 
  clientTime: number = Date.now()
): TimeSyncState {
  try {
    const serverTimestamp = new Date(serverTime).getTime();
    
    // Validate server timestamp
    if (isNaN(serverTimestamp)) {
      return {
        serverClientOffset: 0,
        syncTimestamp: clientTime,
        isValid: false
      };
    }
    
    // Calculate offset: positive means server is ahead of client
    const serverClientOffset = serverTimestamp - clientTime;
    
    // Validate offset is reasonable (within 24 hours)
    const maxReasonableOffset = 24 * 60 * 60 * 1000; // 24 hours
    const isValid = Math.abs(serverClientOffset) <= maxReasonableOffset;
    
    return {
      serverClientOffset,
      syncTimestamp: clientTime,
      isValid
    };
  } catch (error) {
    console.error('Failed to calculate time sync offset:', error);
    return {
      serverClientOffset: 0,
      syncTimestamp: clientTime,
      isValid: false
    };
  }
}

/**
 * Calculates remaining time from server-provided timestamps with enhanced synchronization
 * 
 * This function handles client-server time differences by using server-provided
 * baseline timestamps to ensure accuracy regardless of client clock settings.
 * 
 * Requirements: 4.2, 4.3, 4.4, 4.5
 * 
 * @param expiresAt - ISO 8601 expiry timestamp from server
 * @param serverTime - ISO 8601 current server time for synchronization
 * @param clientTime - Client timestamp when server time was received (defaults to Date.now())
 * @returns Remaining time in milliseconds (0 if expired)
 */
export function calculateRemainingTime(
  expiresAt: string, 
  serverTime: string,
  clientTime: number = Date.now()
): number {
  try {
    const expiryTime = new Date(expiresAt).getTime();
    
    // Validate expiry timestamp
    if (isNaN(expiryTime)) {
      console.error('Invalid expiry timestamp:', expiresAt);
      return 0;
    }
    
    // Calculate time synchronization offset
    const syncState = calculateTimeSyncOffset(serverTime, clientTime);
    
    if (!syncState.isValid) {
      console.warn('Time sync offset is invalid, using client time as fallback');
      // Fallback to direct calculation without sync
      return Math.max(0, expiryTime - clientTime);
    }
    
    // Calculate remaining time using server-synchronized baseline
    // Formula: remaining = expiry - (current_client_time + server_offset)
    const synchronizedCurrentTime = clientTime + syncState.serverClientOffset;
    const remainingMs = expiryTime - synchronizedCurrentTime;
    
    return Math.max(0, remainingMs);
  } catch (error) {
    // If timestamp parsing fails, return 0 (expired)
    console.error('Failed to calculate remaining time:', error);
    return 0;
  }
}

/**
 * Calculates accurate remaining time for ongoing countdown updates
 * 
 * This function is optimized for repeated calls during countdown updates,
 * using a pre-calculated sync offset to avoid repeated server time parsing.
 * 
 * Requirements: 4.4, 4.5
 * 
 * @param expiryTime - Expiry timestamp in milliseconds
 * @param syncState - Pre-calculated time synchronization state
 * @param currentClientTime - Current client timestamp (defaults to Date.now())
 * @returns Remaining time in milliseconds (0 if expired)
 */
export function calculateRemainingTimeWithSync(
  expiryTime: number,
  syncState: TimeSyncState,
  currentClientTime: number = Date.now()
): number {
  try {
    if (!syncState.isValid) {
      // Fallback to direct calculation without sync
      return Math.max(0, expiryTime - currentClientTime);
    }
    
    // Calculate remaining time using synchronized time
    const synchronizedCurrentTime = currentClientTime + syncState.serverClientOffset;
    const remainingMs = expiryTime - synchronizedCurrentTime;
    
    return Math.max(0, remainingMs);
  } catch (error) {
    console.error('Failed to calculate remaining time with sync:', error);
    return 0;
  }
}

/**
 * Checks if a paste is expired based on server timestamps with enhanced synchronization
 * 
 * This function uses the same logic as server-side expiration checks to ensure
 * consistency between client and server expiration determination.
 * 
 * Requirements: 4.5
 * 
 * @param expiresAt - ISO 8601 expiry timestamp from server
 * @param serverTime - ISO 8601 current server time for synchronization
 * @param clientTime - Client timestamp when server time was received (defaults to Date.now())
 * @returns True if paste is expired, false otherwise
 */
export function isPasteExpired(
  expiresAt: string, 
  serverTime: string,
  clientTime: number = Date.now()
): boolean {
  return calculateRemainingTime(expiresAt, serverTime, clientTime) <= 0;
}

/**
 * Creates a synchronized time calculator for efficient repeated calculations
 * 
 * This function returns a calculator that can be used for efficient repeated
 * time calculations during countdown updates, avoiding repeated timestamp parsing.
 * 
 * Requirements: 4.4, 4.5
 * 
 * @param expiresAt - ISO 8601 expiry timestamp from server
 * @param serverTime - ISO 8601 current server time for synchronization
 * @returns Function that calculates remaining time efficiently
 */
export function createSynchronizedTimeCalculator(
  expiresAt: string,
  serverTime: string
): (currentClientTime?: number) => number {
  try {
    const expiryTime = new Date(expiresAt).getTime();
    const syncState = calculateTimeSyncOffset(serverTime);
    
    // Validate expiry timestamp
    if (isNaN(expiryTime)) {
      console.error('Invalid expiry timestamp for calculator:', expiresAt);
      return () => 0;
    }
    
    // Return optimized calculator function
    return (currentClientTime: number = Date.now()) => {
      return calculateRemainingTimeWithSync(expiryTime, syncState, currentClientTime);
    };
  } catch (error) {
    console.error('Failed to create synchronized time calculator:', error);
    return () => 0;
  }
}

/**
 * Validates server time synchronization parameters
 * 
 * Ensures that server timestamps are valid and reasonable for synchronization.
 * 
 * Requirements: 4.1, 4.2
 * 
 * @param expiresAt - ISO 8601 expiry timestamp from server
 * @param serverTime - ISO 8601 current server time for synchronization
 * @returns Validation result with details
 */
export function validateTimeSyncParameters(
  expiresAt: string,
  serverTime: string
): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  // Validate timestamp formats
  if (!isValidTimestamp(expiresAt)) {
    errors.push('Invalid expiry timestamp format');
  }
  
  if (!isValidTimestamp(serverTime)) {
    errors.push('Invalid server time format');
  }
  
  // If formats are valid, check logical consistency
  if (errors.length === 0) {
    try {
      const expiryTime = new Date(expiresAt).getTime();
      const currentServerTime = new Date(serverTime).getTime();
      
      // Check if expiry is in the future relative to server time
      if (expiryTime <= currentServerTime) {
        errors.push('Expiry time must be in the future relative to server time');
      }
      
      // Check if timestamps are reasonable (not too far in past/future)
      const now = Date.now();
      const maxAge = 24 * 60 * 60 * 1000; // 24 hours
      const maxFuture = 365 * 24 * 60 * 60 * 1000; // 1 year
      
      if (Math.abs(currentServerTime - now) > maxAge) {
        errors.push('Server time is too far from current time');
      }
      
      if (expiryTime - now > maxFuture) {
        errors.push('Expiry time is too far in the future');
      }
    } catch (error) {
      errors.push('Failed to parse timestamps for validation');
    }
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
}

// ============================================================================
// Validation Utilities
// ============================================================================

/**
 * Validates that a timestamp string is a valid ISO 8601 date
 * 
 * @param timestamp - ISO 8601 timestamp string
 * @returns True if valid, false otherwise
 */
export function isValidTimestamp(timestamp: string): boolean {
  try {
    const date = new Date(timestamp);
    return !isNaN(date.getTime()) && date.toISOString() === timestamp;
  } catch {
    return false;
  }
}

/**
 * Validates expiration counter props
 * 
 * @param props - ExpirationCounterProps to validate
 * @returns True if props are valid, false otherwise
 */
export function validateExpirationCounterProps(props: ExpirationCounterProps): boolean {
  return (
    isValidTimestamp(props.expiresAt) &&
    isValidTimestamp(props.serverTime) &&
    new Date(props.expiresAt).getTime() > 0 &&
    new Date(props.serverTime).getTime() > 0
  );
}