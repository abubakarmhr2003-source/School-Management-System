import db from '@/lib/db';
import { requireUser } from '@/lib/auth';
import ConfirmButton from '@/components/ConfirmButton';
import { addSubject, renameSubject, removeSubject } from '@/lib/actions';
const ERR = { dup: 'A subject with this name already exists.', marks: 'This subject has exam marks, so it cannot be removed.' };
export default async function Page(props) {
  const searchParams = await props.searchParams;
  const u = await requireUser(['admin']);
  const subs = (await db.all('SELECT id,name FROM subjects WHERE school_id=? ORDER BY name', u.school_id));
  return (
    <>
      <header><h1>Subjects</h1><p className="muted">Add each subject once. You assign teachers to them on the Teachers page.</p></header>
      {ERR[searchParams.error] && <p className="err" role="alert">{ERR[searchParams.error]}</p>}
      <section className="card">
        <h2>Add a subject</h2>
        <form action={addSubject} className="form">
          <label>Subject name<input name="name" placeholder="Mathematics" required /></label>
          <button>Add subject</button>
        </form>
      </section>
      <section className="card">
        <h2>All subjects</h2>
        {subs.length === 0 ? <p className="muted">No subjects yet. Add your first subject above.</p> : subs.map(s => (
          <div key={s.id} className="row">
            <form action={renameSubject} className="inline">
              <input type="hidden" name="id" value={s.id} />
              <input name="name" defaultValue={s.name} aria-label="Subject name" style={{ width: 200 }} required />
              <button className="ghost">Rename</button>
            </form>
            <form action={removeSubject}>
              <input type="hidden" name="id" value={s.id} />
              <ConfirmButton className="ghost" message={`Remove ${s.name}? It will also be removed from the timetable and teacher assignments.`} aria-label={`Remove ${s.name}`}>Remove</ConfirmButton>
            </form>
          </div>
        ))}
      </section>
    </>
  );
}
