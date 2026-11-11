import db from '@/lib/db';
import { requireUser } from '@/lib/auth';
import ConfirmButton from '@/components/ConfirmButton';
import { createAccountant, removeAccountant, resetLoginPassword } from '@/lib/actions';
const ERR = { invalid: 'Enter a name, a valid email and a password of at least 8 characters.', email: 'This email is already used by another account.' };
export default async function Page(props) {
  const searchParams = await props.searchParams;
  const u = await requireUser(['admin']);
  const list = (await db.all("SELECT id,name,email FROM users WHERE school_id=? AND role='accountant' ORDER BY name", u.school_id));
  return (
    <>
      <header><h1>Accountants</h1><p className="muted">An accountant can set fees, create vouchers and record payments. They cannot see marks, attendance or student records.</p></header>
      {ERR[searchParams.error] && <p className="err" role="alert">{ERR[searchParams.error]}</p>}
      {searchParams.saved && <p className="okmsg" role="status">Saved.</p>}
      <section className="card">
        <h2>Add an accountant</h2>
        <form action={createAccountant} className="form">
          <label>Name<input name="name" required /></label>
          <label>Email<input name="email" type="email" required /></label>
          <label>Password (8+ characters)<input name="password" type="password" minLength={8} required /></label>
          <button>Create login</button>
        </form>
      </section>
      <section className="card">
        <h2>All accountants</h2>
        {list.length === 0 ? <p className="muted">No accountants yet.</p> : list.map(a => (
          <div key={a.id} className="row">
            <div><b>{a.name}</b><p className="muted">{a.email}</p></div>
            <div className="acts">
              <form action={resetLoginPassword} className="inline">
                <input type="hidden" name="user" value={a.id} />
                <input type="hidden" name="back" value="/dashboard/staff" />
                <input name="password" type="password" minLength={8} placeholder="New password" aria-label={`New password for ${a.name}`} style={{ width: 160 }} required />
                <button className="ghost">Reset password</button>
              </form>
              <form action={removeAccountant}>
                <input type="hidden" name="id" value={a.id} />
                <ConfirmButton className="ghost" message={`Remove ${a.name}? They will not be able to sign in any more.`} aria-label={`Remove ${a.name}`}>Remove</ConfirmButton>
              </form>
            </div>
          </div>
        ))}
      </section>
    </>
  );
}
