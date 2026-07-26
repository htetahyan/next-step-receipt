import { toast } from 'sonner';

/**
 * Downloads a file directly without opening the raw URL in a new browser tab.
 */
export async function downloadDocumentFile(url: string, filename: string) {
  if (!url) {
    toast.error('No file URL available for download');
    return;
  }

  const toastId = toast.loading(`Preparing download for ${filename}...`);

  try {
    // 1. Try client-side Blob fetch
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const blob = await response.blob();
    const blobUrl = window.URL.createObjectURL(blob);

    const anchor = document.createElement('a');
    anchor.style.display = 'none';
    anchor.href = blobUrl;
    anchor.download = sanitizeFilename(filename, url);

    document.body.appendChild(anchor);
    anchor.click();

    setTimeout(() => {
      window.URL.revokeObjectURL(blobUrl);
      document.body.removeChild(anchor);
    }, 1000);

    toast.success('Download started!', { id: toastId });
  } catch (err) {
    console.warn('Client blob fetch failed, falling back to proxy API download:', err);
    
    // 2. Fallback to API route proxy download
    const cleanName = sanitizeFilename(filename, url);
    const proxyUrl = `/api/download?url=${encodeURIComponent(url)}&filename=${encodeURIComponent(cleanName)}`;
    
    const iframe = document.createElement('iframe');
    iframe.style.display = 'none';
    iframe.src = proxyUrl;
    document.body.appendChild(iframe);

    setTimeout(() => {
      if (document.body.contains(iframe)) {
        document.body.removeChild(iframe);
      }
    }, 5000);

    toast.success('Download initiated!', { id: toastId });
  }
}

/**
 * Ensures the filename has an appropriate extension based on file URL if omitted.
 */
function sanitizeFilename(name: string, url: string): string {
  let cleanName = (name || 'document').trim().replace(/[/\\?%*:|"<>]/g, '_');
  
  // If cleanName already has an extension, return it
  if (/\.[a-zA-Z0-9]{2,5}$/.test(cleanName)) {
    return cleanName;
  }

  // Deduce extension from URL
  try {
    const urlObj = new URL(url);
    const pathname = urlObj.pathname;
    const extMatch = pathname.match(/\.([a-zA-Z0-9]{2,5})$/);
    if (extMatch && extMatch[1]) {
      const ext = extMatch[1].toLowerCase();
      // Only append if valid extension (not hash-like)
      if (['pdf', 'png', 'jpg', 'jpeg', 'webp', 'gif', 'svg', 'doc', 'docx', 'xls', 'xlsx', 'txt', 'zip'].includes(ext)) {
        return `${cleanName}.${ext}`;
      }
    }
  } catch {
    // Ignore URL parse error
  }

  return cleanName;
}

/**
 * Helper to check if file is an image by extension or content type
 */
export function isImageFile(url: string, title: string = ''): boolean {
  const combined = `${url} ${title}`.toLowerCase();
  return /\.(png|jpe?g|webp|gif|svg|avif)(\?.*)?$/i.test(combined);
}

/**
 * Helper to check if file is a PDF
 */
export function isPdfFile(url: string, title: string = ''): boolean {
  const combined = `${url} ${title}`.toLowerCase();
  return /\.pdf(\?.*)?$/i.test(combined) || combined.includes('pdf');
}
