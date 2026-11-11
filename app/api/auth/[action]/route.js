import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import db, { isDuplicate } from '@/lib/db';
import { createSession } from '@/lib/auth';
import { schoolCode, hashPassword, checkPassword, dummyHash } from '@/lib/util';

const bad = (error, status = 400) => NextResponse.json({ error }, { status });
const ok = (data = {}) => NextResponse.json({ ok: true, ...data });
const INSERT_USER = 'INSERT INTO users (school_id,name,email,password_hash,role,status) VALUES (?,?,?,?,?,?)';

export async function POST(req, { params }) {
  const { action } = await params;
  let f;
  try { f = await req.json(); } catch { return bad('Invalid request.'); }
  if (!f || typeof f !== 'object') return bad('Invalid request.');
  const email = String(f.email || '').trim().toLowerCase();
  if (action === 'logout') { (await cookies()).delete('session'); return ok(); }
  if (action === 'login') {
    const ip = (req.headers.get('x-vercel-forwarded-for') || req.headers.get('x-forwarded-for') || '').split(',')[0].trim() || 'unknown';
    const recent = await db.get("SELECT COUNT(*) FILTER (WHERE email=?) AS by_email, COUNT(*) FILTER (WHERE ip=?) AS by_ip FROM login_attempts WHERE created_at > now() - interval '15 minutes' AND (email=? OR ip=?)", email, ip, email, ip);
    if (recent.by_email >= 10 || recent.by_ip >= 30) return bad('Too many failed sign-in attempts. Please wait 15 minutes and try again.', 429);
    const u = await db.get('SELECT u.*, s.status AS ss FROM users u LEFT JOIN schools s ON s.id=u.school_id WHERE u.email=?', email);
    const good = await checkPassword(String(f.password || ''), u ? u.password_hash : await dummyHash());
    if (!u || !good) {
      await db.run('INSERT INTO login_attempts (email, ip) VALUES (?, ?)', email.slice(0, 200), ip.slice(0, 100));
      if (Math.random() < 0.05) await db.run("DELETE FROM login_attempts WHERE created_at < now() - interval '1 day'");
      return bad('Email or password is incorrect.', 401);
    }
    await db.run('DELETE FROM login_attempts WHERE email=?', email);
    if (u.school_id && u.ss !== 'approved') return bad(u.ss === 'pending' ? 'Your school is waiting for platform approval.' : 'This school account is not active.', 403);
    if (u.status !== 'active') return bad(u.status === 'pending' ? 'Your school admin has not approved your account yet.' : 'Your account request was rejected.', 403);
    await createSession(u);
    return ok({ to: u.role === 'superadmin' ? '/platform' : '/dashboard' });
  }
  const name = String(f.name || '').trim();
  const password = String(f.password || '');
  if (!name || !email.includes('@') || password.length < 8) return bad('Enter your name, a valid email and a password of at least 8 characters.');
  const taken = () => bad('An account with this email already exists.', 409);
  const hash = await hashPassword(password);
  if (action === 'register-school') {
    const school = String(f.school || '').trim();
    if (!school) return bad('Enter the school name.');
    try {
      const sid = await db.tx(async t => {
        const id = await t.insert('INSERT INTO schools (name, code) VALUES (?, ?)', school, schoolCode());
        await t.run(INSERT_USER, id, name, email, hash, 'admin', 'active');
        return id;
      });
      await db.createSchoolTables(sid); // this school's own tables
    } catch (e) {
      if (isDuplicate(e)) return taken();
      throw e;
    }
    return ok({ message: 'School registered. You can sign in once the platform owner approves it.' });
  }
  if (action === 'join') {
    const s = await db.get("SELECT id FROM schools WHERE code=? AND status='approved'", String(f.code || '').trim().toUpperCase());
    if (!s) return bad('No approved school has this code.', 404);
    try {
      await db.run(INSERT_USER, s.id, name, email, hash, f.role === 'accountant' ? 'accountant' : 'teacher', 'pending');
    } catch (e) {
      if (isDuplicate(e)) return taken();
      throw e;
    }
    return ok({ message: 'Request sent. Your school admin will approve it.' });
  }
  return bad('Unknown action.', 404);
}
