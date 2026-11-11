import db from '@/lib/db';

export const dynamic = 'force-dynamic';

// Open /api/health after deploying: {"ok":true} means the site can reach the database.
export async function GET() {
  try {
    await db.get('SELECT 1 AS ok');
    return Response.json({ ok: true });
  } catch (e) {
    console.error('[health] database check failed:', e.message);
    return Response.json({ ok: false }, { status: 503 });
  }
}
