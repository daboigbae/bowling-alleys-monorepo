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
    const res = await fetch(url, {
      headers: {
        Host: host,
      },
    });

    if (!res.ok) {
      return NextResponse.json(
        { error: 'Failed to fetch sitemap' },
        { status: res.status }
      );
    }

    const body = await res.arrayBuffer();
    const contentType = res.headers.get('content-type') || 'application/xml';
    const contentEncoding = res.headers.get('content-encoding');

    const headers: Record<string, string> = {
      'Content-Type': contentType,
      'Cache-Control': 'public, max-age=3600, s-maxage=3600',
    };
    if (contentEncoding) headers['Content-Encoding'] = contentEncoding;

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
