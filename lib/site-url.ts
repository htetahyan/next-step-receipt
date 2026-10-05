const PRODUCTION_SITE = 'https://operation.nextsteptravelandtourism.com';

/**
 * Public site URL for portal links and emails.
 * Never use a Vercel preview host such as *.vercel.app.
 */
export function getSiteUrl(): string {
  const configured = process.env.NEXT_PUBLIC_SITE_URL || '';
  const useConfigured = configured && !configured.includes('.vercel.app');
  let url = useConfigured ? configured : PRODUCTION_SITE;

  // Ensure protocol
  if (!url.startsWith('http://') && !url.startsWith('https://')) {
    url = `https://${url}`;
  }

  // Strip trailing slash
  return url.replace(/\/+$/, '');
}
