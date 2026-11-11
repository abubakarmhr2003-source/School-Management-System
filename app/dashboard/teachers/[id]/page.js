import Link from 'next/link';
import { notFound } from 'next/navigation';
import db from '@/lib/db';
import { requireUser } from '@/lib/auth';
import { updateTeacher, createTeacherLogin, resetLoginPassword } from '@/lib/actions';
const ERR = { invalid: 'Enter a valid email and a password of at least 8 characters.', email: 'This email is already used by another account.' };
export default async function Page(props) {
  const params = await props.params;
  const searchParams = await props.searchParams;
  const u = await requireUser(['admin']);
  const t = (await db.get('SELECT * FROM teachers WHERE id=? AND school_id=?', params.id, u.school_id));
  if (!t) notFound();
  const login = (await db.get('SELECT u.id,u.email FROM teacher_users tu JOIN users u ON u.id=tu.user_id WHERE tu.teacher_id=?', t.id));
  return (
    <>
      <header><h1>Edit teacher</h1><p className="muted"><Link href="/dashboard/teachers">Back to teachers</Link></p></header>
      <section className="card">
        <form action={updateTeacher} className="form">
          <input type="hidden" name="id" value={t.id} />
          <label>Teacher name<input name="name" defaultValue={t.name} required /></label>
          <label>Phone<input name="phone" type="tel" defaultValue={t.phone || ''} /></label>
          <label>Qualification<input name="qualification" defaultValue={t.qualification || ''} /></label>
          <button>Save changes</button>
        </form>
      </section>
      <section className="card">
        <h2>Login account</h2>
        {ERR[searchParams.error] && <p className="err" role="alert">{ERR[searchParams.error]}</p>}
        {searchParams.saved && <p className="okmsg" role="status">Saved.</p>}
        {login ? (
          <>
            <p className="muted">This teacher signs in with <b>{login.email}</b> and can only see their own classes.</p>
            <form action={resetLoginPassword} className="inline">
              <input type="hidden" name="user" value={login.id} />
              <input type="hidden" name="back" value={`/dashboard/teachers/${t.id}`} />
              <input name="password" type="password" minLength={8} placeholder="New password" aria-label="New password" style={{ width: 200 }} required />
              <button className="ghost">Reset password</button>
            </form>
          </>
        ) : (
          <form action={createTeacherLogin} className="form">
            <input type="hidden" name="id" value={t.id} />
            <label>Email<input name="email" type="email" required /></label>
            <label>Password (8+ characters)<input name="password" type="password" minLength={8} required /></label>
            <button>Create login</button>
          </form>
        )}
      </section>
    </>
  );
}
