/**
 * Paste viewing page for Pastebin-Lite
 * 
 * GET /p/[id]
 * 
 * This page handles paste viewing in the web interface:
 * - Server-side paste retrieval and rendering
 * - Proper HTML escaping for XSS prevention
 * - 404 handling for unavailable pastes
 * - Readable HTML layout for paste content
 * - Client-side expiration handling with content hiding
 * 
 * Requirements: 4.1, 4.2, 4.3, 4.4, 1.2, 3.1, 3.5
 */

import { notFound } from 'next/navigation';
import { headers } from 'next/headers';
import { retrievePasteById } from '@/lib/paste-service';
import { isValidPasteId } from '@/lib/paste-service';
import Link from 'next/link';
import ExpirationCounter from '@/components/ExpirationCounter';
import PasteContent from '@/components/PasteContent';

interface PageProps {
  params: Promise<{ id: string }>;
}

/**
 * Server component for displaying paste content
 * 
 * Retrieves paste data server-side and renders it with proper escaping.
 * Returns 404 for unavailable pastes.
 * 
 * Requirements: 4.1, 4.2, 4.3, 4.4
 */
export default async function PastePage({ params }: PageProps) {
  const { id } = await params;
  
  // Basic ID validation
  if (!id || !isValidPasteId(id)) {
    notFound();
  }
  
  // Extract headers for test mode support
  const headersList = await headers();
  const headersObj: Record<string, string | string[] | undefined> = {};
  headersList.forEach((value, key) => {
    headersObj[key] = value;
  });
  
  // Retrieve paste using service layer (with view count increment)
  const result = await retrievePasteById(id, headersObj);
  
  if (!result.success) {
    // Paste not found, expired, or view limit exceeded
    notFound();
  }
  
  const { content, remaining_views, expires_at, server_time } = result.data;
  
  // Format expiry date for display
  const expiryDisplay = expires_at 
    ? new Date(expires_at).toLocaleString()
    : null;
  
  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        {/* Header */}
        <header className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Pastebin-Lite</h1>
          <div className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
            <div>Paste ID: <code className="bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded text-xs font-mono">{id}</code></div>
            {remaining_views !== null && (
              <div>Remaining views: <span className="font-semibold">{remaining_views}</span></div>
            )}
            {expiryDisplay && (
              <div>Expires at: <span className="font-semibold">{expiryDisplay}</span></div>
            )}
          </div>
          
          {/* Expiration Counter - positioned prominently near metadata */}
          {expires_at && server_time && (
            <ExpirationCounter 
              expiresAt={expires_at}
              serverTime={server_time}
            />
          )}
        </header>
        
        {/* Paste Content with Client-Side Expiration Handling */}
        <PasteContent 
          content={content}
          pasteId={id}
          hasTtl={!!expires_at}
        />
        
        {/* Footer */}
        <footer className="mt-8 text-center text-sm text-gray-500 dark:text-gray-400">
          <Link 
            href="/" 
            className="text-blue-600 dark:text-blue-400 hover:underline"
          >
            Create a new paste
          </Link>
        </footer>
      </div>
    </div>
  );
}

/**
 * Generate metadata for the paste page
 * 
 * Sets appropriate title and description for SEO and browser tabs.
 */
export async function generateMetadata({ params }: PageProps) {
  const { id } = await params;
  
  return {
    title: `Paste ${id} - Pastebin-Lite`,
    description: 'View shared text paste',
  };
}