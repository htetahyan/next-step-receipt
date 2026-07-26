import { NextRequest, NextResponse } from 'next/server';
import { getS3Client } from '@/app/actions/r2';
import { GetObjectCommand } from '@aws-sdk/client-s3';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const fileUrl = searchParams.get('url');
  const filename = searchParams.get('filename') || 'downloaded-document';

  if (!fileUrl) {
    return new NextResponse('Missing file URL parameter', { status: 400 });
  }

  try {
    const bucketName = process.env.CLOUDFLARE_R2_BUCKET_NAME;

    // Extract file key from URL or parameter
    let fileKey = fileUrl;
    if (fileUrl.startsWith('http://') || fileUrl.startsWith('https://')) {
      const urlObj = new URL(fileUrl);
      const parts = urlObj.pathname.split('/');
      fileKey = parts[parts.length - 1];
    }

    if (bucketName && fileKey) {
      try {
        const s3Client = await getS3Client();
        const command = new GetObjectCommand({
          Bucket: bucketName,
          Key: fileKey,
        });

        const s3Res = await s3Client.send(command);
        const byteArray = await s3Res.Body?.transformToByteArray();

        if (byteArray) {
          const contentType = s3Res.ContentType || 'application/octet-stream';
          const safeFilename = filename.replace(/["'\r\n]/g, '_');

          return new NextResponse(byteArray, {
            status: 200,
            headers: {
              'Content-Type': contentType,
              'Content-Disposition': `attachment; filename="${encodeURIComponent(safeFilename)}"`,
              'Cache-Control': 'private, max-age=3600',
            },
          });
        }
      } catch (s3Err: any) {
        console.warn('S3 direct fetch warning, falling back to URL fetch:', s3Err.message);
      }
    }

    // Fallback: fetch via HTTP if URL is presigned or external
    const res = await fetch(fileUrl);
    if (!res.ok) {
      return new NextResponse(`Failed to fetch file from storage (${res.status}): ${res.statusText}`, { status: res.status });
    }

    const contentType = res.headers.get('content-type') || 'application/octet-stream';
    const blob = await res.arrayBuffer();
    const safeFilename = filename.replace(/["'\r\n]/g, '_');

    return new NextResponse(blob, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Content-Disposition': `attachment; filename="${encodeURIComponent(safeFilename)}"`,
        'Cache-Control': 'private, max-age=3600',
      },
    });
  } catch (error: any) {
    console.error('Download route error:', error);
    return new NextResponse(`Error downloading file: ${error.message}`, { status: 500 });
  }
}
