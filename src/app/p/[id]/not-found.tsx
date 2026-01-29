'use client';

import Link from 'next/link';

/**
 * Custom 404 page for paste viewing
 * 
 * This page is displayed when:
 * - Paste ID is invalid or malformed
 * - Paste doesn&apos;t exist in the database
 * - Paste has expired (TTL exceeded)
 * - Paste has exceeded its view limit
 * 
 * Requirements: 4.3
 */

export default function PasteNotFound() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        {/* Header */}
        <header className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Pastebin-Lite</h1>
        </header>
        
        {/* Error Content */}
        <main className="text-center">
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-8 mb-8">
            <h2 className="text-2xl font-semibold text-red-800 dark:text-red-200 mb-4">
              Paste Not Found
            </h2>
            <p className="text-red-700 dark:text-red-300 mb-4">
              The paste you&apos;re looking for is not available. This could be because:
            </p>
            <ul className="text-red-700 dark:text-red-300 text-left max-w-md mx-auto space-y-2">
              <li>• The paste ID is invalid or malformed</li>
              <li>• The paste doesn&apos;t exist</li>
              <li>• The paste has expired</li>
              <li>• The paste has reached its view limit</li>
            </ul>
          </div>
          
          <div className="space-x-4">
            <Link 
              href="/" 
              className="inline-block bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded transition-colors"
            >
              Create a New Paste
            </Link>
            <button 
              onClick={() => window.history.back()}
              className="inline-block bg-gray-600 hover:bg-gray-700 text-white font-medium py-2 px-4 rounded transition-colors"
            >
              Go Back
            </button>
          </div>
        </main>
      </div>
    </div>
  );
}