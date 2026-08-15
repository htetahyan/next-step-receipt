/**
 * Returns the base website URL for auth callbacks, email links, and receipts.
 * Prioritizes NEXT_PUBLIC_SITE_URL from .env.local, then Vercel deployment URLs, falling back to production.
 */
export function getSiteUrl(): string {
  let url =
    process.env.NEXT_PUBLIC_SITE_URL ||
    (process.env.NEXT_PUBLIC_VERCEL_URL ? `https://${process.env.NEXT_PUBLIC_VERCEL_URL}` : '') ||
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : '') ||
    'https://next-step-receipt.vercel.app';

  // Ensure protocol
  if (!url.startsWith('http://') && !url.startsWith('https://')) {
    url = `https://${url}`;
  }

  // Strip trailing slash
  return url.replace(/\/+$/, '');
}
