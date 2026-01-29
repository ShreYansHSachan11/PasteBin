/**
 * ExpirationCounter React Component
 * 
 * A client-side countdown component that displays real-time expiration countdown
 * for TTL pastes. Integrates with the countdown timer hook and provides visual
 * urgency styling based on remaining time.
 * 
 * Features:
 * - Real-time countdown display with server time synchronization
 * - Expired state persistence across page reloads using localStorage
 * - Client-side expiration handling without server requests
 * - Expiration message and new paste link UI
 * 
 * Requirements: 1.1, 1.2, 1.3, 2.5, 2.6, 3.1, 3.2, 3.3, 3.4, 3.5
 */

'use client';

import { useEffect, useState } from 'react';
import { useCountdownFromTimestamps } from '@/lib/hooks/useCountdownTimer';
import { formatRemainingTime, DEFAULT_TIMER_CONFIG } from '@/lib/time-utils';
import { 
  createTimeSyncFromServerResponse, 
  calculateInitialDisplayTime,
  TimeSynchronizationManager 
} from '@/lib/client-time-sync';
import type { ExpirationCounterProps } from '@/lib/time-utils';

// ============================================================================
// Local Storage Keys for Expired State Persistence
// ============================================================================

const EXPIRED_PASTES_KEY = 'pastebin-lite-expired-pastes';

// ============================================================================
// Utility Functions for Expired State Persistence
// ============================================================================

/**
 * Checks if a paste is marked as expired in localStorage
 * 
 * @param pasteId - The paste ID to check
 * @returns True if paste is marked as expired client-side
 */
function isMarkedAsExpired(pasteId: string): boolean {
  if (typeof window === 'undefined') return false;
  
  try {
    const expiredPastes = JSON.parse(localStorage.getItem(EXPIRED_PASTES_KEY) || '{}');
    return !!expiredPastes[pasteId];
  } catch {
    return false;
  }
}

/**
 * Marks a paste as expired in localStorage
 * 
 * @param pasteId - The paste ID to mark as expired
 */
function markAsExpired(pasteId: string): void {
  if (typeof window === 'undefined') return;
  
  try {
    const expiredPastes = JSON.parse(localStorage.getItem(EXPIRED_PASTES_KEY) || '{}');
    expiredPastes[pasteId] = Date.now();
    localStorage.setItem(EXPIRED_PASTES_KEY, JSON.stringify(expiredPastes));
  } catch (error) {
    console.warn('Failed to mark paste as expired in localStorage:', error);
  }
}

/**
 * Cleans up old expired paste entries from localStorage
 * Removes entries older than 24 hours to prevent storage bloat
 */
function cleanupExpiredEntries(): void {
  if (typeof window === 'undefined') return;
  
  try {
    const expiredPastes = JSON.parse(localStorage.getItem(EXPIRED_PASTES_KEY) || '{}');
    const oneDayAgo = Date.now() - (24 * 60 * 60 * 1000);
    
    const cleanedPastes: Record<string, number> = {};
    for (const [pasteId, timestamp] of Object.entries(expiredPastes)) {
      if (typeof timestamp === 'number' && timestamp > oneDayAgo) {
        cleanedPastes[pasteId] = timestamp;
      }
    }
    
    localStorage.setItem(EXPIRED_PASTES_KEY, JSON.stringify(cleanedPastes));
  } catch (error) {
    console.warn('Failed to cleanup expired entries from localStorage:', error);
  }
}

/**
 * Extracts paste ID from current URL
 * 
 * @returns Paste ID if found in URL, null otherwise
 */
function getCurrentPasteId(): string | null {
  if (typeof window === 'undefined') return null;
  
  const match = window.location.pathname.match(/\/p\/([^\/]+)/);
  return match ? match[1] : null;
}

// ============================================================================
// Component Implementation
// ============================================================================

/**
 * ExpirationCounter component for displaying real-time countdown
 * 
 * Features:
 * - Real-time countdown display that updates every second
 * - Conditional rendering based on TTL presence
 * - Visual urgency styling (warning colors for < 5 minutes)
 * - Monospace font for consistent digit alignment
 * - Expiration handling with message display
 * - Expired state persistence across page reloads using localStorage
 * 
 * @param props - ExpirationCounterProps with server timestamps
 * @returns JSX element or null if no TTL
 */
export function ExpirationCounter({ 
  expiresAt, 
  serverTime, 
  onExpired 
}: ExpirationCounterProps) {
  // ============================================================================
  // Enhanced Time Synchronization
  // ============================================================================
  
  // Create time synchronization manager for accurate calculations
  const [timeSyncManager, setTimeSyncManager] = useState<TimeSynchronizationManager | null>(null);
  
  // Initialize time synchronization manager
  useEffect(() => {
    if (expiresAt && serverTime) {
      const manager = createTimeSyncFromServerResponse({
        expires_at: expiresAt,
        server_time: serverTime
      });
      setTimeSyncManager(manager);
      
      // Log initial display accuracy for debugging
      if (manager) {
        const initialTime = calculateInitialDisplayTime(expiresAt, serverTime);
        console.debug('Initial display time calculated:', {
          initialTime,
          syncValid: manager.isSyncValid(),
          diagnostics: manager.getDiagnostics()
        });
      }
    }
  }, [expiresAt, serverTime]);
  
  // ============================================================================
  // State Management for Expired State Persistence
  // ============================================================================
  
  const [isClientExpired, setIsClientExpired] = useState<boolean>(false);
  const pasteId = getCurrentPasteId();
  
  // ============================================================================
  // Conditional Rendering Check
  // ============================================================================
  
  // If no expiry timestamp provided, don't render countdown (Requirement 1.3)
  if (!expiresAt) {
    return null;
  }
  
  // ============================================================================
  // Expired State Persistence Check
  // ============================================================================
  
  // Check if paste is already marked as expired in localStorage on mount
  useEffect(() => {
    if (pasteId && isMarkedAsExpired(pasteId)) {
      setIsClientExpired(true);
    }
    
    // Cleanup old expired entries on mount
    cleanupExpiredEntries();
  }, [pasteId]);
  
  // ============================================================================
  // Expiration Callback Enhancement
  // ============================================================================
  
  // Enhanced expiration callback that handles persistence
  const handleExpiration = () => {
    setIsClientExpired(true);
    
    // Mark paste as expired in localStorage for persistence (Requirement 3.5)
    if (pasteId) {
      markAsExpired(pasteId);
    }
    
    // Dispatch custom event for other components to react to expiration
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('paste-expired', { 
        detail: { pasteId } 
      }));
    }
    
    // Call original callback if provided
    if (onExpired) {
      onExpired();
    }
  };
  
  // ============================================================================
  // Countdown Timer Integration
  // ============================================================================
  
  // Use countdown timer hook with server timestamp synchronization
  const { remainingMs, isExpired } = useCountdownFromTimestamps(
    expiresAt,
    serverTime,
    handleExpiration
  );
  
  // ============================================================================
  // Time Formatting and Urgency
  // ============================================================================
  
  // Format remaining time and determine urgency level
  const formattedTime = formatRemainingTime(remainingMs, DEFAULT_TIMER_CONFIG);
  
  // ============================================================================
  // Expiration State Handling
  // ============================================================================
  
  // Show expiration message if expired (either from timer or localStorage)
  if (isExpired || isClientExpired) {
    return (
      <div className="expiration-counter expired transition-all duration-300 ease-in-out">
        <div className="expiration-message bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 mt-4 shadow-sm">
          <div className="flex items-center justify-between flex-wrap gap-3 sm:gap-4">
            <span className="expired-text text-red-700 dark:text-red-300 font-semibold flex items-center gap-2 text-sm sm:text-base">
              <span className="text-lg sm:text-xl animate-pulse">⏰</span>
              <span className="font-mono tracking-wide">Paste has expired</span>
            </span>
            <a 
              href="/" 
              className="new-paste-link inline-flex items-center px-3 py-2 sm:px-4 sm:py-2 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white text-xs sm:text-sm font-medium rounded-md transition-all duration-200 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-gray-800"
            >
              <span className="hidden sm:inline">Create a new paste</span>
              <span className="sm:hidden">New paste</span>
            </a>
          </div>
        </div>
      </div>
    );
  }
  
  // ============================================================================
  // Active Countdown Display
  // ============================================================================
  
  // Determine CSS classes based on urgency level (Requirement 2.5)
  const urgencyClasses = {
    normal: 'text-gray-700 dark:text-gray-300 transition-colors duration-300',
    warning: 'text-orange-600 dark:text-orange-400 transition-colors duration-300 animate-pulse',
    critical: 'text-red-600 dark:text-red-400 transition-colors duration-300 animate-pulse'
  };
  
  const urgencyClass = urgencyClasses[formattedTime.urgency];
  
  // Determine background styling based on urgency
  const backgroundClasses = {
    normal: 'bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700',
    warning: 'bg-orange-50 dark:bg-orange-900/20 border-orange-200 dark:border-orange-800',
    critical: 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800'
  };
  
  const backgroundClass = backgroundClasses[formattedTime.urgency];
  
  return (
    <div className="expiration-counter active transition-all duration-300 ease-in-out">
      <div className={`countdown-display ${backgroundClass} border rounded-lg p-3 sm:p-4 mt-4 shadow-sm hover:shadow-md transition-all duration-200`}>
        <div className="flex items-center justify-between flex-wrap gap-2 sm:gap-3">
          <span className="countdown-label text-xs sm:text-sm font-medium text-gray-600 dark:text-gray-400 tracking-wide">
            Expires in:
          </span>
          <div className="flex items-center gap-2">
            {formattedTime.urgency !== 'normal' && (
              <span className="text-sm sm:text-base animate-pulse">
                {formattedTime.urgency === 'critical' ? '🚨' : '⚠️'}
              </span>
            )}
            <span 
              className={`countdown-time font-mono font-bold text-base sm:text-lg md:text-xl ${urgencyClass} tracking-wider tabular-nums`}
              data-testid="countdown-time"
              data-urgency={formattedTime.urgency}
              style={{ fontVariantNumeric: 'tabular-nums' }}
            >
              {formattedTime.display}
            </span>
          </div>
        </div>
        
        {/* Progress bar for visual urgency indication */}
        {formattedTime.urgency !== 'normal' && (
          <div className="mt-2 w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1 overflow-hidden">
            <div 
              className={`h-full transition-all duration-1000 ease-out ${
                formattedTime.urgency === 'critical' 
                  ? 'bg-red-500 animate-pulse' 
                  : 'bg-orange-500'
              }`}
              style={{
                width: formattedTime.urgency === 'critical' ? '100%' : '60%'
              }}
            />
          </div>
        )}
      </div>
    </div>
  );
}

// ============================================================================
// Default Export
// ============================================================================

export default ExpirationCounter;