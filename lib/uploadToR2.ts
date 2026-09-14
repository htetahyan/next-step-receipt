import { getPresignedUrl } from '@/app/actions/r2';

export function resolveFileContentType(file: File): string {
  if (file.type && file.type !== 'application/octet-stream') return file.type;
  const name = (file.name || '').toLowerCase();
  if (name.endsWith('.pdf')) return 'application/pdf';
  if (name.endsWith('.png')) return 'image/png';
  if (name.endsWith('.jpg') || name.endsWith('.jpeg')) return 'image/jpeg';
  if (name.endsWith('.webp')) return 'image/webp';
  if (name.endsWith('.gif')) return 'image/gif';
  if (name.endsWith('.doc')) return 'application/msword';
  if (name.endsWith('.docx')) return 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
  return file.type || 'application/octet-stream';
}

export async function uploadFileToR2(
  file: File,
  signal?: AbortSignal
): Promise<{ file_url: string; file_key: string }> {
  const contentType = resolveFileContentType(file);
  const presigned = await getPresignedUrl(file.name || 'document', contentType);
  if (!presigned.success || !presigned.uploadUrl || !presigned.fileKey) {
    throw new Error(presigned.error || 'Failed to get upload URL');
  }

  const uploadRes = await fetch(presigned.uploadUrl, {
    method: 'PUT',
    body: file,
    headers: { 'Content-Type': contentType },
    signal,
  });

  if (!uploadRes.ok) {
    throw new Error(`File upload failed (${uploadRes.status})`);
  }

  return {
    file_url: presigned.publicUrl || '',
    file_key: presigned.fileKey,
  };
}

export async function runWithConcurrency<T, R>(
  items: T[],
  limit: number,
  worker: (item: T, index: number) => Promise<R>
): Promise<PromiseSettledResult<R>[]> {
  const results: PromiseSettledResult<R>[] = new Array(items.length);
  let next = 0;

  async function runOne() {
    while (next < items.length) {
      const index = next++;
      try {
        const value = await worker(items[index], index);
        results[index] = { status: 'fulfilled', value };
      } catch (reason) {
        results[index] = { status: 'rejected', reason };
      }
    }
  }

  const poolSize = Math.max(1, Math.min(limit, items.length));
  await Promise.all(Array.from({ length: poolSize }, () => runOne()));
  return results;
}
