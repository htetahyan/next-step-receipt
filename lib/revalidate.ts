import { after } from 'next/server';
import { revalidatePath } from 'next/cache';

export const SERVICE_DASHBOARD_PATHS = [
  '/dashboard',
  '/dashboard/customers',
  '/dashboard/uae-visa',
  '/dashboard/air-tickets',
  '/dashboard/other-visa',
  '/dashboard/tour-packages',
  '/dashboard/custom-service',
] as const;

/**
 * Revalidate list pages after the mutation response is sent so save/edit
 * is not blocked on cache invalidation.
 */
function revalidateNow(paths: readonly string[]) {
  for (const path of paths) {
    try {
      revalidatePath(path, 'page');
    } catch {
      // Ignore revalidation outside a request scope (scripts, tests)
    }
  }
}

export function revalidateAfter(paths: readonly string[]) {
  try {
    after(() => {
      revalidateNow(paths);
    });
  } catch {
    revalidateNow(paths);
  }
}
