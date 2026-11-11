import { SignJWT, jwtVerify } from 'jose';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import db from './db';
import { jwtKey } from './jwtkey';
const key = jwtKey;
export async function createSession(user) {
  const token = await new SignJWT({ uid: user.id }).setProtectedHeader({ alg: 'HS256' }).setExpirationTime('7d').sign(key());
  (await cookies()).set('session', token, { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax', path: '/', maxAge: 604800 });
}
export async function getUser() {
  const t = (await cookies()).get('session')?.value;
  if (!t) return null;
  let uid;
  try { uid = (await jwtVerify(t, key())).payload.uid; } catch { return null; } // bad or expired cookie = signed out
  if (!Number.isInteger(uid)) return null;
  // Database errors are NOT swallowed here: an outage should show an error, not silently sign everyone out.
  return (await db.get('SELECT u.id,u.school_id,u.name,u.email,u.role,u.status,s.name AS school_name,s.code AS school_code,s.status AS school_status,(s.logo IS NOT NULL) AS has_logo,substr(md5(s.logo),1,10) AS logo_v FROM users u LEFT JOIN schools s ON s.id=u.school_id WHERE u.id=?', uid)) || null;
}
export async function requireUser(roles) {
  const u = await getUser();
  if (!u || u.status !== 'active' || (u.school_id && u.school_status !== 'approved')) redirect('/login');
  if (roles && !roles.includes(u.role)) redirect('/dashboard');
  return u;
}

// Address of the school's logo picture, or null when the school has none.
export const logoUrl = u => (u?.has_logo ? `/api/school-logo?v=${u.logo_v}` : null);
