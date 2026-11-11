import db from '@/lib/db';
import { requireUser } from '@/lib/auth';
import ConfirmButton from '@/components/ConfirmButton';
import { addClass, renameClass, addSection, removeSection, removeClass } from '@/lib/actions';
const ERR = { dup: 'A class with this name already exists.', dupsec: 'This class already has a section with that name.', students: 'There are still students in it. Move or remove them first.' };
export default async function Page(props) {
  const searchParams = await props.searchParams;
  const u = await requireUser(['admin']);
  const classes = (await db.all('SELECT id,name FROM classes WHERE school_id=? ORDER BY id', u.school_id));
  const secs = (await db.all('SELECT s.id,s.class_id,s.name,(SELECT COUNT(*) FROM students WHERE section_id=s.id) AS students FROM sections s WHERE s.school_id=? ORDER BY s.name', u.school_id));
  return (
    <>
      <header><h1>Classes</h1><p className="muted">Add each class once, with its sections. You can rename or remove them later.</p></header>
      {ERR[searchParams.error] && <p className="err" role="alert">{ERR[searchParams.error]}</p>}
      <section className="card">
        <h2>Add a class</h2>
        <form action={addClass} className="form">
          <label>Class name<input name="name" placeholder="Class 8" required /></label>
          <label>Sections (comma separated)<input name="sections" placeholder="A, B" /></label>
          <button>Add class</button>
        </form>
      </section>
      {classes.length === 0 && <section className="card"><p className="muted">No classes yet. Add your first class above.</p></section>}
      {classes.map(c => (
        <section key={c.id} className="card">
          <div className="bar">
            <form action={renameClass} className="inline">
              <input type="hidden" name="id" value={c.id} />
              <input name="name" defaultValue={c.name} aria-label="Class name" style={{ width: 180 }} required />
              <button className="ghost">Rename</button>
            </form>
            <form action={removeClass}>
              <input type="hidden" name="id" value={c.id} />
              <ConfirmButton className="ghost" message={`Remove ${c.name} and all its sections?`} aria-label={`Remove ${c.name}`}>Remove class</ConfirmButton>
            </form>
          </div>
          <div className="chips">
            {secs.filter(s => s.class_id === c.id).map(s => (
              <form key={s.id} action={removeSection} className="chip">
                <input type="hidden" name="id" value={s.id} />
                <span>Section {s.name} · {s.students} {s.students === 1 ? 'student' : 'students'}</span>
                <ConfirmButton className="ghost" message={`Remove section ${s.name} of ${c.name}?`} aria-label={`Remove section ${s.name} of ${c.name}`}>Remove</ConfirmButton>
              </form>
            ))}
          </div>
          <form action={addSection} className="inline">
            <input type="hidden" name="class" value={c.id} />
            <input name="name" placeholder="New section, e.g. C" aria-label={`New section for ${c.name}`} style={{ width: 180 }} required />
            <button>Add section</button>
          </form>
        </section>
      ))}
    </>
  );
}
