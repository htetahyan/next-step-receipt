import { createHmac, timingSafeEqual } from 'crypto';

function portalSecret(): string {
  return (
    process.env.PORTAL_LINK_SECRET ||
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    ''
  );
}

export function signPortalToken(customerId: string): string {
  const secret = portalSecret();
  if (!secret || !customerId) return '';
  return createHmac('sha256', secret).update(customerId).digest('base64url').slice(0, 27);
}

export function verifyPortalToken(customerId: string, token: string | null | undefined): boolean {
  if (!token || !customerId) return false;
  const expected = signPortalToken(customerId);
  if (!expected || expected.length !== token.length) return false;
  try {
    return timingSafeEqual(Buffer.from(token), Buffer.from(expected));
  } catch {
    return false;
  }
}
