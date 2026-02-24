import { NextRequest, NextResponse } from 'next/server';

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
      headers: {
        Host: host,
        'Accept-Encoding': 'identity',
      },
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    if (!res.ok) {
      return NextResponse.json(
        { error: 'Failed to fetch sitemap' },
        { status: res.status }
      );
    }

    const body = await res.arrayBuffer();
    if (body.byteLength < 500) {
      console.error('Sitemap proxy: API returned too few bytes', body.byteLength);
      return NextResponse.json(
        { error: 'Sitemap from API was empty or truncated' },
        { status: 502 }
      );
    }

    const headers: Record<string, string> = {
      'Content-Type': res.headers.get('content-type') || 'application/xml',
      'Cache-Control': 'public, max-age=3600, s-maxage=3600',
    };

    return new NextResponse(body, {
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
