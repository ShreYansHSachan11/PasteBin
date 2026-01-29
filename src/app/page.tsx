'use client';

import { useState } from 'react';
import { CreatePasteRequest, CreatePasteResponse, ErrorResponse, validateCreatePasteRequest } from '@/lib/types';

export default function Home() {
  const [content, setContent] = useState('');
  const [ttlSeconds, setTtlSeconds] = useState('');
  const [maxViews, setMaxViews] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);
  const [shareableUrl, setShareableUrl] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setErrors([]);
    setShareableUrl('');

    // Prepare request data
    const requestData: CreatePasteRequest = {
      content: content.trim(),
    };

    // Add optional fields if provided
    if (ttlSeconds.trim()) {
      const ttl = parseInt(ttlSeconds.trim());
      if (!isNaN(ttl)) {
        requestData.ttl_seconds = ttl;
      }
    }

    if (maxViews.trim()) {
      const views = parseInt(maxViews.trim());
      if (!isNaN(views)) {
        requestData.max_views = views;
      }
    }

    // Client-side validation
    const validation = validateCreatePasteRequest(requestData);
    if (!validation.isValid) {
      setErrors(validation.errors.map(err => err.message));
      setIsSubmitting(false);
      return;
    }

    try {
      const response = await fetch('/api/pastes', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestData),
      });

      if (response.ok) {
        const result: CreatePasteResponse = await response.json();
        setShareableUrl(result.url);
        // Clear form on success
        setContent('');
        setTtlSeconds('');
        setMaxViews('');
      } else {
        const errorResult: ErrorResponse = await response.json();
        setErrors([errorResult.message || errorResult.error || 'An error occurred']);
      }
    } catch {
      setErrors(['Network error: Unable to create paste. Please try again.']);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReset = () => {
    setContent('');
    setTtlSeconds('');
    setMaxViews('');
    setErrors([]);
    setShareableUrl('');
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="container mx-auto px-4 py-8 max-w-2xl">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            Pastebin-Lite
          </h1>
          <p className="text-gray-600 dark:text-gray-300 mb-6">
            Create and share text pastes with optional expiry and view limits.
          </p>

          {/* Success Message */}
          {shareableUrl && (
            <div className="mb-6 p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-md">
              <h3 className="text-sm font-medium text-green-800 dark:text-green-200 mb-2">
                Paste created successfully!
              </h3>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={shareableUrl}
                  readOnly
                  className="flex-1 px-3 py-2 text-sm bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md text-gray-900 dark:text-white"
                />
                <button
                  onClick={() => navigator.clipboard.writeText(shareableUrl)}
                  className="px-3 py-2 text-sm bg-green-600 hover:bg-green-700 text-white rounded-md transition-colors"
                >
                  Copy
                </button>
              </div>
            </div>
          )}

          {/* Error Messages */}
          {errors.length > 0 && (
            <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md">
              <h3 className="text-sm font-medium text-red-800 dark:text-red-200 mb-2">
                Please fix the following errors:
              </h3>
              <ul className="list-disc list-inside text-sm text-red-700 dark:text-red-300">
                {errors.map((error, index) => (
                  <li key={index}>{error}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Paste Creation Form */}
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Content Field */}
            <div>
              <label htmlFor="content" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Content *
              </label>
              <textarea
                id="content"
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="Enter your text content here..."
                rows={8}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white resize-vertical"
                required
              />
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                Required. The text content you want to share.
              </p>
            </div>

            {/* Optional Constraints */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* TTL Seconds */}
              <div>
                <label htmlFor="ttl-seconds" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Expiry Time (seconds)
                </label>
                <input
                  id="ttl-seconds"
                  type="number"
                  value={ttlSeconds}
                  onChange={(e) => setTtlSeconds(e.target.value)}
                  placeholder="e.g., 3600"
                  min="1"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                />
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                  Optional. Paste expires after this many seconds.
                </p>
              </div>

              {/* Max Views */}
              <div>
                <label htmlFor="max-views" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Maximum Views
                </label>
                <input
                  id="max-views"
                  type="number"
                  value={maxViews}
                  onChange={(e) => setMaxViews(e.target.value)}
                  placeholder="e.g., 10"
                  min="1"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                />
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                  Optional. Paste becomes unavailable after this many views.
                </p>
              </div>
            </div>

            {/* Form Actions */}
            <div className="flex gap-3">
              <button
                type="submit"
                disabled={isSubmitting || !content.trim()}
                className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white font-medium rounded-md transition-colors focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
              >
                {isSubmitting ? 'Creating...' : 'Create Paste'}
              </button>
              <button
                type="button"
                onClick={handleReset}
                className="px-4 py-2 bg-gray-200 hover:bg-gray-300 dark:bg-gray-600 dark:hover:bg-gray-500 text-gray-700 dark:text-gray-200 font-medium rounded-md transition-colors"
              >
                Clear
              </button>
            </div>
          </form>

          {/* Help Text */}
          <div className="mt-8 pt-6 border-t border-gray-200 dark:border-gray-700">
            <h3 className="text-sm font-medium text-gray-900 dark:text-white mb-2">
              How it works:
            </h3>
            <ul className="text-sm text-gray-600 dark:text-gray-300 space-y-1">
              <li>• Enter your text content and optionally set constraints</li>
              <li>• Get a shareable URL to access your paste</li>
              <li>• Pastes expire when time limit or view limit is reached</li>
              <li>• All pastes are stored securely and temporarily</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
