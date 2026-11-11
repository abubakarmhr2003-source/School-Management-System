import { getUser } from '@/lib/auth';
export const dynamic = 'force-dynamic';
export async function GET() {
  const u = await getUser();
  if (u?.role !== 'admin') return new Response('Not allowed', { status: 403 });
  return new Response('Name,Father Name,Phone,Roll No,Class,Section\n', {
    headers: { 'Content-Type': 'text/csv; charset=utf-8', 'Content-Disposition': 'attachment; filename="students-template.csv"' },
  });
}
