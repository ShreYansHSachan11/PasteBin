/**
 * PasteContent React Component
 * 
 * A client-side component that handles paste content display with
 * client-side expiration handling. Hides content when paste expires
 * client-side and persists this state across page reloads.
 * 
 * Features:
 * - Client-side content hiding on expiration
 * - Expired state persistence using localStorage
 * - Graceful fallback for server-side rendering
 * 
 * Requirements: 1.2, 3.1, 3.5
 */

'use client';

import { useEffect, useState } from 'react';

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
// Component Props Interface
// ============================================================================

interface PasteContentProps {
  /** The paste content to display */
  content: string;
  
  /** The paste ID for expiration tracking */
  pasteId: string;
  
  /** Whether the paste has TTL (affects expiration behavior) */
  hasTtl: boolean;
}

// ============================================================================
// Component Implementation
// ============================================================================

/**
 * PasteContent component for displaying paste content with expiration handling
 * 
 * @param props - PasteContentProps with content and expiration info
 * @returns JSX element with paste content or null if expired
 */
export function PasteContent({ content, pasteId, hasTtl }: PasteContentProps) {
  // ============================================================================
  // State Management for Client-Side Expiration
  // ============================================================================
  
  const [isClientExpired, setIsClientExpired] = useState<boolean>(false);
  const [isHydrated, setIsHydrated] = useState<boolean>(false);
  
  // ============================================================================
  // Hydration and Expired State Check
  // ============================================================================
  
  useEffect(() => {
    // Mark as hydrated to prevent hydration mismatches
    setIsHydrated(true);
    
    // Check if paste is marked as expired in localStorage (Requirement 3.5)
    if (hasTtl && isMarkedAsExpired(pasteId)) {
      setIsClientExpired(true);
    }
  }, [pasteId, hasTtl]);
  
  // ============================================================================
  // Expiration Event Listener
  // ============================================================================
  
  useEffect(() => {
    if (!hasTtl) return;
    
    /**
     * Handles expiration events from the ExpirationCounter component
     * This ensures content is hidden immediately when countdown reaches zero
     */
    const handleExpiration = () => {
      setIsClientExpired(true);
    };
    
    // Listen for custom expiration events
    window.addEventListener('paste-expired', handleExpiration);
    
    // Also listen for storage events to sync across tabs
    const handleStorageChange = (event: StorageEvent) => {
      if (event.key === EXPIRED_PASTES_KEY && event.newValue) {
        try {
          const expiredPastes = JSON.parse(event.newValue);
          if (expiredPastes[pasteId]) {
            setIsClientExpired(true);
          }
        } catch {
          // Ignore parsing errors
        }
      }
    };
    
    window.addEventListener('storage', handleStorageChange);
    
    return () => {
      window.removeEventListener('paste-expired', handleExpiration);
      window.removeEventListener('storage', handleStorageChange);
    };
  }, [pasteId, hasTtl]);
  
  // ============================================================================
  // Render Logic
  // ============================================================================
  
  // During SSR or before hydration, always show content to prevent hydration mismatch
  if (!isHydrated) {
    return (
      <main>
        <div className="bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg p-6">
          <pre className="whitespace-pre-wrap break-words font-mono text-sm leading-relaxed overflow-x-auto">
            {content}
          </pre>
        </div>
      </main>
    );
  }
  
  // After hydration, hide content if expired client-side (Requirements 1.2, 3.1)
  if (isClientExpired) {
    return (
      <main>
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-6">
          <div className="text-center text-red-700 dark:text-red-300">
            <div className="text-4xl mb-4">⏰</div>
            <h2 className="text-xl font-semibold mb-2">Content No Longer Available</h2>
            <p className="text-sm">This paste has expired and its content is no longer accessible.</p>
          </div>
        </div>
      </main>
    );
  }
  
  // Show content normally if not expired
  return (
    <main>
      <div className="bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg p-6">
        <pre className="whitespace-pre-wrap break-words font-mono text-sm leading-relaxed overflow-x-auto">
          {content}
        </pre>
      </div>
    </main>
  );
}

// ============================================================================
// Default Export
// ============================================================================

export default PasteContent;