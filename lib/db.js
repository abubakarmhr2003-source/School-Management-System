import postgres from 'postgres';
import bcrypt from 'bcryptjs';
import { cache } from 'react';
import { cookies } from 'next/headers';
import { jwtVerify } from 'jose';
import { jwtKey } from './jwtkey';
import { PUBLIC_SQL, SCHOOL_SQL } from './schema';

// All database access in the app goes through this file.
// Works with Supabase (use the "Transaction pooler" connection string, port 6543) and any Postgres.
// Placeholders are written as ? in SQL and converted to $1, $2, ... here.
//
// Data layout: every school gets its OWN schema (school_<id>) with its own copy of all tables
// (students, classes, attendance, fees, ...). Only platform-wide tables (schools, users, login_attempts)
// live in "public". Queries are written with plain table names; before running one, this file points
// Postgres at the logged-in user's school (SET LOCAL search_path TO school_<id>, public), so a school can
// never see another school's tables.

const g = globalThis;

function connect() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error('DATABASE_URL is not set. Add your Supabase connection string (see .env.example).');
  const local = /@(localhost|127\.0\.0\.1|\[::1\])[:/]/.test(url);
  return postgres(url, {
    prepare: false, // required by Supabase's transaction pooler
    max: Number(process.env.DB_POOL_MAX) || 3,
    idle_timeout: 20,
    connect_timeout: 15,
    ssl: process.env.DATABASE_SSL === 'false' || local ? false : 'require',
    onnotice: () => {},
    types: {
      // COUNT()/SUM() come back as bigint and money as numeric; hand them to the app as plain numbers.
      bigint: { to: 20, from: [20], parse: Number, serialize: x => String(x) },
      numeric: { to: 1700, from: [1700], parse: Number, serialize: x => String(x) },
    },
  });
}

const client = () => (g._pg ??= connect());

// ---- one-time setup -------------------------------------------------------------------------------------
// Creates the shared tables the first time the app talks to an empty database, and creates the platform
// owner login from SUPERADMIN_EMAIL / SUPERADMIN_PASSWORD if there is none yet. After that it is a no-op.
async function setup() {
  await client().begin(async t => {
    await t.unsafe('SELECT pg_advisory_xact_lock(727001)'); // two requests must not create the tables at the same time
    const [{ ok }] = await t.unsafe("SELECT to_regclass('public.schools') IS NOT NULL AS ok");
    if (!ok) await t.unsafe(PUBLIC_SQL);
    else {
      // database made by an older version of the app: add columns introduced later
      const [{ has }] = await t.unsafe("SELECT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='schools' AND column_name='logo') AS has");
      if (!has) await t.unsafe('ALTER TABLE public.schools ADD COLUMN logo text');
    }
    const email = (process.env.SUPERADMIN_EMAIL || '').trim().toLowerCase();
    const pass = process.env.SUPERADMIN_PASSWORD || '';
    if (email.includes('@') && pass.length >= 10) {
      const [owner] = await t.unsafe("SELECT id FROM public.users WHERE role='superadmin' LIMIT 1");
      if (!owner) {
        await t.unsafe(
          "INSERT INTO public.users (name,email,password_hash,role,status) VALUES ('Platform Owner',$1,$2,'superadmin','active') ON CONFLICT (email) DO NOTHING",
          [email, bcrypt.hashSync(pass, 12)]
        );
      }
    }
  });
}
const ready = () => {
  if (g._pgReady) return g._pgReady === true ? undefined : g._pgReady;
  g._pgReady = setup().then(() => { g._pgReady = true; }, e => { g._pgReady = undefined; throw e; });
  return g._pgReady;
};

// ---- per-school schemas ---------------------------------------------------------------------------------
const schemaOf = id => {
  if (!Number.isInteger(id) || id <= 0) throw new Error('Bad school id.');
  return 'school_' + id; // built only from an integer, so it is safe to put in SQL
};
const usePath = id => `SET LOCAL search_path TO ${schemaOf(id)}, public`;

const REMARKS_SQL = `
CREATE TABLE exam_remarks (
  exam_id     integer NOT NULL REFERENCES exams(id) ON DELETE CASCADE,
  student_id  integer NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  school_id   integer NOT NULL REFERENCES public.schools(id),
  remark      text NOT NULL CHECK (char_length(remark) <= 200),
  PRIMARY KEY (exam_id, student_id)
);
ALTER TABLE exam_remarks ENABLE ROW LEVEL SECURITY;
`;

// Creates the school's own schema and tables if they do not exist yet (safe to call any number of times).
async function createSchoolTables(id) {
  await ready();
  const known = (g._pgSchools ??= new Set());
  if (known.has(id)) return;
  const name = schemaOf(id);
  await client().begin(async t => {
    await t.unsafe('SELECT pg_advisory_xact_lock(727002, $1)', [id]);
    const [{ ok }] = await t.unsafe('SELECT to_regclass($1) IS NOT NULL AS ok', [name + '.classes']);
    if (!ok) {
      await t.unsafe(`CREATE SCHEMA IF NOT EXISTS ${name}`);
      await t.unsafe(usePath(id));
      await t.unsafe(SCHOOL_SQL);
    } else {
      // schools created by an older version of the app: add what was introduced later
      await t.unsafe(usePath(id));
      const [{ has }] = await t.unsafe("SELECT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema=$1 AND table_name='students' AND column_name='photo') AS has", [name]);
      if (!has) await t.unsafe('ALTER TABLE students ADD COLUMN photo text');
      const [{ r }] = await t.unsafe('SELECT to_regclass($1) IS NOT NULL AS r', [name + '.exam_remarks']);
      if (!r) await t.unsafe(REMARKS_SQL);
    }
  });
  known.add(id);
}

// Which school does the signed-in person belong to? Read from the signed login cookie, never from user input.
// (null = not signed in, or the platform owner, who has no school.)  Cached for the length of one request.
const sessionSchool = cache(async () => {
  try {
    const token = (await cookies()).get('session')?.value;
    if (!token) return null;
    const uid = (await jwtVerify(token, jwtKey())).payload.uid;
    if (!Number.isInteger(uid)) return null;
    const [u] = await client().unsafe('SELECT school_id FROM public.users WHERE id=$1', [uid]);
    return u?.school_id || null;
  } catch { return null; }
});

// "?" -> "$n" (ignores ? inside quoted text)
function toPg(text) {
  let n = 0, inStr = false, out = '';
  for (const ch of text) {
    if (ch === "'") inStr = !inStr;
    out += ch === '?' && !inStr ? '$' + ++n : ch;
  }
  return out;
}

// Postgres error codes caused by malformed user input (for example ?id=abc). We treat them as "no match".
const BAD_INPUT = new Set(['22P02', '22003', '22007', '22008']);
const empty = () => Object.assign([], { count: 0 });

const norm = p => p.map(x => (x === undefined ? null : x));

// Runs one statement. tenant = function returning the school id to work in (or null for shared tables only).
async function exec(tenant, text, params) {
  await ready();
  const sid = await tenant();
  if (sid) await createSchoolTables(sid);
  try {
    const q = toPg(text), p = norm(params);
    if (!sid) return await client().unsafe(q, p);
    const out = await client().begin(t => [t.unsafe(usePath(sid)), t.unsafe(q, p)]); // one round trip
    return out[1];
  } catch (e) {
    if (BAD_INPUT.has(e.code)) return empty();
    throw e;
  }
}

// Same helpers inside a transaction (already pointed at the right school).
async function execIn(t, text, params) {
  try {
    return await t.unsafe(toPg(text), norm(params));
  } catch (e) {
    if (BAD_INPUT.has(e.code)) return empty();
    throw e;
  }
}

function api(run) {
  return {
    all: (text, ...p) => run(text, p),
    get: async (text, ...p) => (await run(text, p))[0],
    run: async (text, ...p) => ({ changes: (await run(text, p)).count || 0 }),
    // INSERT that returns the new id (undefined if nothing was inserted, e.g. ON CONFLICT DO NOTHING)
    insert: async (text, ...p) => (await run(text + ' RETURNING id', p))[0]?.id,
  };
}

const forSchool = getId => ({
  ...api((text, p) => exec(getId, text, p)),
  // Runs fn(tx) in one transaction; everything rolls back if fn throws.
  tx: async fn => {
    await ready();
    const sid = await getId();
    if (sid) await createSchoolTables(sid);
    return client().begin(async t => {
      if (sid) await t.unsafe(usePath(sid));
      return fn(api((text, p) => execIn(t, text, p)));
    });
  },
});

const db = {
  ...forSchool(sessionSchool), // default: the signed-in person's school
  school: id => forSchool(async () => id), // explicit school (used by the platform owner pages)
  createSchoolTables,
  end: () => (g._pg ? g._pg.end({ timeout: 5 }) : undefined),
};

export const isDuplicate = e => e?.code === '23505';
export default db;
