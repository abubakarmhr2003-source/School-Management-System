import { NextResponse } from 'next/server';
import db from '@/lib/db';
import { getUser } from '@/lib/auth';
import { sendMail, appUrl } from '@/lib/notify';
export async function PATCH(req) {
  const u = await getUser();
  let body;
  try { body = await req.json(); } catch { return NextResponse.json({ error: 'Invalid request' }, { status: 400 }); }
  const { kind, id, status } = body || {};
  if (kind === 'school' && u?.role === 'superadmin' && ['approved', 'rejected', 'suspended'].includes(status)) {
    await db.run('UPDATE schools SET status=? WHERE id=?', status, id);
    if (status === 'approved') {
      const a = (await db.get("SELECT u.name,u.email,s.name AS school FROM users u JOIN schools s ON s.id=u.school_id WHERE s.id=? AND u.role='admin' ORDER BY u.id LIMIT 1", id));
      if (a && !a.email.endsWith('@school.local')) await sendMail(a.email, `Your school "${a.school}" is approved`, `Hello ${a.name},\n\nYour school "${a.school}" has been approved. You can open it now: ${appUrl()}\n`);
    }
    return NextResponse.json({ ok: true });
  }
  if (kind === 'staff' && u?.role === 'admin' && u.school_status === 'approved' && ['active', 'rejected'].includes(status)) {
    await db.run("UPDATE users SET status=? WHERE id=? AND school_id=? AND role IN ('teacher','accountant')", status, id, u.school_id);
    return NextResponse.json({ ok: true });
  }
  return NextResponse.json({ error: 'Not allowed' }, { status: 403 });
}
