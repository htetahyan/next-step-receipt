import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const fileUrl = searchParams.get('url');
  const filename = searchParams.get('filename') || 'downloaded-document';

  if (!fileUrl) {
    return new NextResponse('Missing file URL parameter', { status: 400 });
  }

  try {
    const res = await fetch(fileUrl, {
      headers: {
        'User-Agent': 'NextReceipt-Downloader/1.0',
      },
    });

    if (!res.ok) {
      return new NextResponse(`Failed to fetch file from storage: ${res.statusText}`, { status: res.status });
    }

    const contentType = res.headers.get('content-type') || 'application/octet-stream';
    const blob = await res.arrayBuffer();

    // Clean filename for content-disposition header
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
