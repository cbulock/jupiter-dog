import { photoPage } from '@/photo-catalog';

export const dynamic = 'force-dynamic';
export async function GET(request) {
  const searchParams = request.nextUrl.searchParams;
  const page = Math.max(1, Number.parseInt(searchParams.get('page'), 10) || 1);
  const pageSize = Math.min(100, Math.max(1, Number.parseInt(searchParams.get('pageSize'), 10) || 10));
  try {
    const fixture = process.env.PHOTO_CATALOG_MODE === 'fixture' && process.env.NODE_ENV === 'development';
    // The API already has an edge cache; avoid stacking two 30-second caches.
    return Response.json(await photoPage(page, pageSize, false), {
      headers: {
        'Cache-Control': fixture ? 'no-store' : 'public, max-age=0, s-maxage=30, must-revalidate',
        'Netlify-Vary': 'query=page|pageSize',
      },
    });
  } catch (error) {
    console.error('Photo catalog unavailable:', error.message);
    return Response.json({ error: 'Photos are temporarily unavailable' }, { status: 503, headers: { 'Cache-Control': 'no-store' } });
  }
}
