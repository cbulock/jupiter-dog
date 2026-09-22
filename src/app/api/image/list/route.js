import imageList from '@/imageList.json';
import storage from '../../../../../netlify/lib/storage';
import photos from '../../../../../netlify/lib/photos';

export const dynamic = 'force-dynamic';
export async function GET(request) {
  const searchParams = request.nextUrl.searchParams;
  const page = Math.max(1, Number.parseInt(searchParams.get('page'), 10) || 1);
  const pageSize = Math.min(100, Math.max(1, Number.parseInt(searchParams.get('pageSize'), 10) || 10));
  try {
    const fixture = process.env.PHOTO_CATALOG_MODE === 'fixture' && process.env.NODE_ENV === 'development';
    const list = fixture ? imageList.map((photo) => photos.publicPhoto(photo)).filter(Boolean) : await photos.catalog(storage.stores());
    const totalPages = Math.ceil(list.length / pageSize);
    return Response.json({ currentPage: page, currentPageSize: pageSize,
      data: list.slice((page - 1) * pageSize, page * pageSize),
      hasNextPage: page < totalPages, hasPrevPage: page > 1, totalPages,
    }, { headers: { 'Cache-Control': fixture ? 'no-store' : 'public, max-age=0, s-maxage=30, must-revalidate' } });
  } catch (error) {
    console.error('Photo catalog unavailable:', error.message);
    return Response.json({ error: 'Photos are temporarily unavailable' }, { status: 503, headers: { 'Cache-Control': 'no-store' } });
  }
}