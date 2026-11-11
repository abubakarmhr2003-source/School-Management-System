import db from '@/lib/db';
import { getUser } from '@/lib/auth';

export const dynamic = 'force-dynamic';

// Serves the signed-in person's own school logo. The address carries ?v=<hash>, so browsers can keep it forever.
export async function GET() {
  const u = await getUser();
  if (!u?.school_id) return new Response(null, { status: 404 });
  const row = await db.get('SELECT logo FROM schools WHERE id=?', u.school_id);
  const m = /^data:(image\/(?:png|jpeg));base64,([A-Za-z0-9+/]+={0,2})$/.exec(row?.logo || '');
  if (!m) return new Response(null, { status: 404 });
  return new Response(Buffer.from(m[2], 'base64'), {
    headers: { 'Content-Type': m[1], 'Cache-Control': 'private, max-age=31536000, immutable', 'X-Content-Type-Options': 'nosniff' },
  });
}
