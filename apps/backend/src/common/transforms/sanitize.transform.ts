import { Transform } from 'class-transformer';

/**
 * Custom sanitizer transform for server-side input sanitization
 * Performs basic HTML entity escaping to prevent XSS attacks
 * This is a Node.js-compatible alternative to DOMPurify
 */
export const Sanitize = Transform(({ value }) => {
  if (typeof value === 'string') {
    // Basic HTML entity escaping for security
    return value
      .trim()
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#x27;')
      .replace(/\//g, '&#x2F;');
  }
  return value;
});

/**
 * Sanitize a string value directly (for use in services)
 * @param value - The string value to sanitize
 * @returns Sanitized string value
 */
export function sanitizeString(value: string): string {
  if (typeof value !== 'string') {
    return value;
  }

  return value
    .trim()
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;');
}
