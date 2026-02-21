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

    return new NextResponse(body, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=3600, s-maxage=3600',
      },
    });
  } catch (error) {
    console.error('Sitemap proxy error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch sitemap' },
      { status: 502 }
    );
  }
}
