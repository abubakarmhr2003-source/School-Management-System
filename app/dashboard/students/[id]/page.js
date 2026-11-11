import Link from 'next/link';
import { notFound } from 'next/navigation';
import db from '@/lib/db';
import { requireUser } from '@/lib/auth';
import ConfirmButton from '@/components/ConfirmButton';
import PhotoInput from '@/components/PhotoInput';
import { updateStudent, createParentLogin, unlinkParent, resetLoginPassword } from '@/lib/actions';
const ERR = { invalid: 'Enter a valid email. A new parent also needs a name and a password of at least 8 characters.', email: 'This email belongs to another kind of account.' };
export default async function Page(props) {
  const params = await props.params;
  const searchParams = await props.searchParams;
  const u = await requireUser(['admin']);
  const st = (await db.get('SELECT * FROM students WHERE id=? AND school_id=?', params.id, u.school_id));
  if (!st) notFound();
  const secs = (await db.all("SELECT s.id, c.name||' – '||s.name AS label FROM sections s JOIN classes c ON c.id=s.class_id WHERE s.school_id=? ORDER BY c.id, s.name", u.school_id));
  const parents = (await db.all('SELECT u.id,u.name,u.email FROM parent_students p JOIN users u ON u.id=p.user_id WHERE p.student_id=? ORDER BY u.name', st.id));
  return (
    <>
      <header><h1>Edit student</h1><p className="muted"><Link href="/dashboard/students">Back to students</Link></p></header>
      <section className="card">
        <form action={updateStudent} className="form">
          <input type="hidden" name="id" value={st.id} />
          <label>Student name<input name="name" defaultValue={st.name} required /></label>
          <PhotoInput current={st.photo} />
          <label>Father's name<input name="father" defaultValue={st.father_name || ''} /></label>
          <label>Phone<input name="phone" type="tel" defaultValue={st.phone || ''} /></label>
          <label>Roll no.<input name="roll" defaultValue={st.roll_no || ''} /></label>
          <label>Class and section<select name="section" defaultValue={st.section_id}>{secs.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}</select></label>
          <button>Save changes</button>
        </form>
      </section>
      <section className="card">
        <h2>Parent login</h2>
        {ERR[searchParams.error] && <p className="err" role="alert">{ERR[searchParams.error]}</p>}
        {searchParams.saved && <p className="okmsg" role="status">Saved.</p>}
        {parents.map(p => (
          <div key={p.id} className="row">
            <div><b>{p.name}</b><p className="muted">{p.email}</p></div>
            <div className="acts">
              <form action={resetLoginPassword} className="inline">
                <input type="hidden" name="user" value={p.id} />
                <input type="hidden" name="back" value={`/dashboard/students/${st.id}`} />
                <input name="password" type="password" minLength={8} placeholder="New password" aria-label={`New password for ${p.name}`} style={{ width: 160 }} required />
                <button className="ghost">Reset password</button>
              </form>
              <form action={unlinkParent}>
                <input type="hidden" name="id" value={st.id} /><input type="hidden" name="user" value={p.id} />
                <ConfirmButton className="ghost" message={`Remove ${p.name} from this student?`} aria-label={`Remove ${p.name}`}>Remove</ConfirmButton>
              </form>
            </div>
          </div>
        ))}
        <h2 style={{ marginTop: 20 }}>Add a parent login</h2>
        <form action={createParentLogin} className="form">
          <input type="hidden" name="id" value={st.id} />
          <label>Parent name<input name="name" /></label>
          <label>Email<input name="email" type="email" required /></label>
          <label>Password (new parents only)<input name="password" type="password" minLength={8} /></label>
          <button>Add parent</button>
        </form>
        <p className="muted">To link the same parent to another child, use the same email again. No password is needed then.</p>
      </section>
    </>
  );
}
