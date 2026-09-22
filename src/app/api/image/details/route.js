import storage from '../../../../../netlify/lib/storage';
import photos from '../../../../../netlify/lib/photos';
import imageList from '@/imageList.json';
export const dynamic = 'force-dynamic';
export async function GET(request) {
  const name = request.nextUrl.searchParams.get('image');
  if (!name) return Response.json({ error: 'Photo name is required' }, { status: 400 });
  try {
    let photo;
    if (process.env.PHOTO_CATALOG_MODE === 'fixture' && process.env.NODE_ENV === 'development') photo = photos.publicPhoto(imageList.find((item) => item.fileName === name));
    else {
      const s = storage.stores();
      photo = photos.publicPhoto(await storage.json(s.metadata, name + '.json'), await storage.json(s.overrides, name + '.json'));
    }
    return Response.json(photo ? { data: photo } : { error: 'Photo not found' }, {
      status: photo ? 200 : 404, headers: { 'Cache-Control': 'no-store' },
    });
  } catch { return Response.json({ error: 'Photo unavailable' }, { status: 503 }); }
}