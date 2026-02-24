import { NextRequest, NextResponse } from 'next/server';
import { gunzipSync } from 'zlib';

export async function GET(request: NextRequest) {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL;
  if (!apiUrl) {
    return NextResponse.json(
      { error: 'NEXT_PUBLIC_API_URL not configured' },
      { status: 500 }
    );
  }

  const host = request.headers.get('host') || 'bowlingalleys.io';
  const url = `${apiUrl.replace(/\/$/, '')}/sitemap.xml`;

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 90_000);

    const res = await fetch(url, {
      headers: { Host: host },
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    if (!res.ok) {
      return NextResponse.json(
        { error: 'Failed to fetch sitemap' },
        { status: res.status }
      );
    }

    const rawBody = await res.arrayBuffer();
    const contentType = res.headers.get('content-type') || 'application/xml';
    const contentEncoding = res.headers.get('content-encoding')?.toLowerCase() ?? '';

    let body: Buffer | ArrayBuffer = rawBody;
    if (contentEncoding.includes('gzip')) {
      try {
        body = gunzipSync(Buffer.from(rawBody));
      } catch (e) {
        console.error('Sitemap proxy: gzip decompress failed', e);
        return NextResponse.json(
          { error: 'Sitemap decompression failed' },
          { status: 502 }
        );
      }
    }

    if (body.byteLength < 500) {
      console.error('Sitemap proxy: API returned too few bytes', body.byteLength);
      return NextResponse.json(
        { error: 'Sitemap from API was empty or truncated' },
        { status: 502 }
      );
    }

    const headers: Record<string, string> = {
      'Content-Type': contentType,
      'Cache-Control': 'public, max-age=3600, s-maxage=3600',
    };

    const payload = body instanceof Buffer ? body : Buffer.from(body as ArrayBuffer);
    return new NextResponse(payload, {
      status: 200,
      headers,
    });
  } catch (error) {
    console.error('Sitemap proxy error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch sitemap' },
      { status: 502 }
    );
  }
}
