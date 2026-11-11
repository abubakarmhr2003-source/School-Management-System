// Creates (or updates) the platform owner login. Run once after the database is set up:
//   npm run db:owner
// Reads DATABASE_URL, SUPERADMIN_EMAIL and SUPERADMIN_PASSWORD from .env.local.
import postgres from 'postgres';
import bcrypt from 'bcryptjs';

const { DATABASE_URL, SUPERADMIN_EMAIL, SUPERADMIN_PASSWORD } = process.env;
const email = (SUPERADMIN_EMAIL || '').trim().toLowerCase();
if (!DATABASE_URL || !email.includes('@') || (SUPERADMIN_PASSWORD || '').length < 10) {
  console.error('Set DATABASE_URL, SUPERADMIN_EMAIL and SUPERADMIN_PASSWORD (at least 10 characters) in .env.local first.');
  process.exit(1);
}
const local = /@(localhost|127\.0\.0\.1)[:/]/.test(DATABASE_URL);
const sql = postgres(DATABASE_URL, { prepare: false, max: 1, ssl: process.env.DATABASE_SSL === 'false' || local ? false : 'require', onnotice: () => {} });
try {
  const hash = bcrypt.hashSync(SUPERADMIN_PASSWORD, 12);
  const [owner] = await sql`select id from public.users where role = 'superadmin' order by id limit 1`;
  if (owner) {
    await sql`update public.users set email = ${email}, password_hash = ${hash}, status = 'active' where id = ${owner.id}`;
    console.log(`Platform owner updated: ${email}`);
  } else {
    await sql`insert into public.users (name, email, password_hash, role, status) values ('Platform Owner', ${email}, ${hash}, 'superadmin', 'active')`;
    console.log(`Platform owner created: ${email}`);
  }
} catch (e) {
  console.error('Could not set up the platform owner:', e.message);
  process.exitCode = 1;
} finally {
  await sql.end();
}
