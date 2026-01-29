/**
 * Custom React hook for countdown timer functionality
 * 
 * This hook provides:
 * - Countdown state management with remaining time tracking
 * - Timer lifecycle control (start, stop, reset)
 * - Automatic cleanup on component unmount
 * - Browser tab visibility handling for accuracy
 * - Expiration callback support
 * 
 * Requirements: 1.4, 5.2, 5.5
 */

import { useState, useEffect, useRef, useCallback } from 'react';

// ============================================================================
// Type Definitions
// ============================================================================

/**
 * Return type for useCountdownTimer hook
 */
export interface UseCountdownTimer {
  /** Current remaining time in milliseconds */
  remainingMs: number;
  
  /** Whether the countdown has expired (reached zero) */
  isExpired: boolean;
  
  /** Whether the timer is currently active/running */
  isActive: boolean;
  
  /** Start the countdown timer */
  start: () => void;
  
  /** Stop the countdown timer */
  stop: () => void;
  
  /** Reset the timer with a new expiry time */
  reset: (newExpiryTime: number) => void;
}

/**
 * Configuration options for the countdown timer
 */
export interface CountdownTimerConfig {
  /** Update interval in milliseconds (default: 1000ms) */
  updateInterval?: number;
  
  /** Whether to handle browser tab visibility changes (default: true) */
  handleVisibilityChange?: boolean;
}

// ============================================================================
// Default Configuration
// ============================================================================

const DEFAULT_CONFIG: Required<CountdownTimerConfig> = {
  updateInterval: 1000,
  handleVisibilityChange: true,
};

// ============================================================================
// Custom Hook Implementation
// ============================================================================

/**
 * Custom hook for countdown timer functionality
 * 
 * @param initialRemainingMs - Initial remaining time in milliseconds
 * @param onExpired - Optional callback function called when countdown reaches zero
 * @param config - Optional configuration for timer behavior
 * @returns UseCountdownTimer interface with state and control functions
 */
export function useCountdownTimer(
  initialRemainingMs: number,
  onExpired?: () => void,
  config: CountdownTimerConfig = {}
): UseCountdownTimer {
  // Merge config with defaults
  const timerConfig = { ...DEFAULT_CONFIG, ...config };
  
  // ============================================================================
  // State Management
  // ============================================================================
  
  const [remainingMs, setRemainingMs] = useState<number>(Math.max(0, initialRemainingMs));
  const [isActive, setIsActive] = useState<boolean>(false);
  const [isExpired, setIsExpired] = useState<boolean>(initialRemainingMs <= 0);
  
  // ============================================================================
  // Refs for Timer Management
  // ============================================================================
  
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const startTimeRef = useRef<number>(0);
  const initialRemainingRef = useRef<number>(initialRemainingMs);
  const onExpiredRef = useRef<(() => void) | undefined>(onExpired);
  
  // Keep onExpired callback ref up to date
  useEffect(() => {
    onExpiredRef.current = onExpired;
  }, [onExpired]);
  
  // ============================================================================
  // Timer Control Functions
  // ============================================================================
  
  /**
   * Clears the current timer interval
   */
  const clearTimer = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);
  
  /**
   * Updates the countdown state based on elapsed time
   */
  const updateCountdown = useCallback(() => {
    const now = Date.now();
    const elapsed = now - startTimeRef.current;
    const newRemainingMs = Math.max(0, initialRemainingRef.current - elapsed);
    
    setRemainingMs(newRemainingMs);
    
    // Check for expiration
    if (newRemainingMs <= 0 && !isExpired) {
      setIsExpired(true);
      setIsActive(false);
      clearTimer();
      
      // Call expiration callback if provided
      if (onExpiredRef.current) {
        onExpiredRef.current();
      }
    }
  }, [isExpired, clearTimer]);
  
  /**
   * Starts the countdown timer
   */
  const start = useCallback(() => {
    if (isExpired || isActive) {
      return;
    }
    
    startTimeRef.current = Date.now();
    setIsActive(true);
    
    // Start the interval timer
    intervalRef.current = setInterval(updateCountdown, timerConfig.updateInterval);
  }, [isExpired, isActive, updateCountdown, timerConfig.updateInterval]);
  
  /**
   * Stops the countdown timer
   */
  const stop = useCallback(() => {
    setIsActive(false);
    clearTimer();
  }, [clearTimer]);
  
  /**
   * Resets the timer with a new expiry time
   */
  const reset = useCallback((newExpiryTime: number) => {
    clearTimer();
    
    const newRemainingMs = Math.max(0, newExpiryTime);
    initialRemainingRef.current = newRemainingMs;
    setRemainingMs(newRemainingMs);
    setIsExpired(newRemainingMs <= 0);
    setIsActive(false);
  }, [clearTimer]);
  
  // ============================================================================
  // Browser Tab Visibility Handling
  // ============================================================================
  
  useEffect(() => {
    if (!timerConfig.handleVisibilityChange || !isActive) {
      return;
    }
    
    /**
     * Handles browser tab visibility changes to maintain timer accuracy
     */
    const handleVisibilityChange = () => {
      if (document.hidden) {
        // Tab became inactive - timer continues running in background
        return;
      }
      
      // Tab became active - update countdown to ensure accuracy
      if (isActive && !isExpired) {
        updateCountdown();
      }
    };
    
    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [isActive, isExpired, updateCountdown, timerConfig.handleVisibilityChange]);
  
  // ============================================================================
  // Cleanup on Component Unmount
  // ============================================================================
  
  useEffect(() => {
    return () => {
      clearTimer();
    };
  }, [clearTimer]);
  
  // ============================================================================
  // Auto-start Logic
  // ============================================================================
  
  useEffect(() => {
    // Auto-start timer if we have remaining time and haven't expired
    if (initialRemainingMs > 0 && !isExpired && !isActive) {
      start();
    }
  }, [initialRemainingMs, isExpired, isActive, start]);
  
  // ============================================================================
  // Return Hook Interface
  // ============================================================================
  
  return {
    remainingMs,
    isExpired,
    isActive,
    start,
    stop,
    reset,
  };
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Creates a countdown timer from server timestamps with enhanced synchronization
 * 
 * This function creates a countdown timer that uses server-provided timestamps
 * to ensure accuracy regardless of client-server time differences. It implements
 * the same logic as server-side expiration checks for consistency.
 * 
 * Requirements: 4.2, 4.3, 4.4, 4.5
 * 
 * @param expiresAt - ISO 8601 expiry timestamp from server
 * @param serverTime - ISO 8601 current server time for synchronization
 * @param onExpired - Optional callback when countdown reaches zero
 * @param config - Optional timer configuration
 * @returns UseCountdownTimer interface
 */
export function useCountdownFromTimestamps(
  expiresAt: string,
  serverTime: string,
  onExpired?: () => void,
  config?: CountdownTimerConfig
): UseCountdownTimer {
  // Import time utilities
  const { calculateRemainingTime, validateTimeSyncParameters } = require('@/lib/time-utils');
  
  // Calculate initial remaining time from server timestamps
  const calculateInitialTime = useCallback(() => {
    try {
      // Validate synchronization parameters
      const validation = validateTimeSyncParameters(expiresAt, serverTime);
      if (!validation.isValid) {
        console.error('Time sync validation failed:', validation.errors);
        return 0;
      }
      
      // Calculate remaining time with server synchronization
      const remainingMs = calculateRemainingTime(expiresAt, serverTime);
      
      return remainingMs;
    } catch (error) {
      console.error('Failed to calculate initial countdown time:', error);
      return 0;
    }
  }, [expiresAt, serverTime]);
  
  const initialRemainingMs = calculateInitialTime();
  
  return useCountdownTimer(initialRemainingMs, onExpired, config);
}