'use server';

import { revalidatePath } from 'next/cache';

export async function safeAction<T, R>(
  action: (data: T) => Promise<R>,
  paths: string[],
  data: T
): Promise<{ success: boolean; data?: R; error?: string }> {
  try {
    const result = await action(data);
    paths.forEach(path => revalidatePath(path));
    return { success: true, data: result };
  } catch (err: any) {
    console.error('Action failed:', err);
    return { success: false, error: err.message };
  }
}
