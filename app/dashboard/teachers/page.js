import Link from 'next/link';
import ConfirmButton from '@/components/ConfirmButton';
import db from '@/lib/db';
import { requireUser } from '@/lib/auth';
import { addTeacher, removeTeacher, assignTeacher, removeAssignment } from '@/lib/actions';
import TableSearch from '@/components/TableSearch';
export default async function Page() {
  const u = await requireUser(['admin']);
  const id = u.school_id;
  const teachers = (await db.all('SELECT t.*,(SELECT COUNT(*) FROM assignments WHERE teacher_id=t.id) AS n FROM teachers t WHERE t.school_id=? ORDER BY t.name', id));
  const secs = (await db.all("SELECT s.id, c.name||' – '||s.name AS label FROM sections s JOIN classes c ON c.id=s.class_id WHERE s.school_id=? ORDER BY c.id, s.name", id));
  const subs = (await db.all('SELECT id,name FROM subjects WHERE school_id=? ORDER BY name', id));
  const asg = (await db.all("SELECT a.id,t.name AS teacher,j.name AS subject,c.name||' – '||s.name AS cls FROM assignments a JOIN teachers t ON t.id=a.teacher_id JOIN subjects j ON j.id=a.subject_id JOIN sections s ON s.id=a.section_id JOIN classes c ON c.id=s.class_id WHERE a.school_id=? ORDER BY c.id,s.name,j.name", id));
  const ready = teachers.length && secs.length && subs.length;
  return (
    <>
      <header><h1>Teachers</h1><p className="muted">{teachers.length} {teachers.length === 1 ? 'teacher' : 'teachers'}</p></header>
      <section className="card">
        <h2>Add a teacher</h2>
        <form action={addTeacher} className="form">
          <label>Teacher name<input name="name" required /></label>
          <label>Phone<input name="phone" type="tel" /></label>
          <label>Qualification<input name="qualification" placeholder="M.Sc. Physics" /></label>
          <button>Add teacher</button>
        </form>
      </section>
      <section className="card scroll">
        <h2>All teachers</h2>
        {teachers.length > 5 && <TableSearch placeholder="Search teachers" />}
        {teachers.length === 0 ? <p className="muted">No teachers yet. Add your first teacher above.</p> : (
          <table>
            <thead><tr><th>Name</th><th>Phone</th><th>Qualification</th><th>Classes taught</th><th></th></tr></thead>
            <tbody>{teachers.map(t => (
              <tr key={t.id}><td>{t.name}</td><td>{t.phone}</td><td>{t.qualification}</td><td>{t.n}</td>
                <td><div className="acts"><Link href={`/dashboard/teachers/${t.id}`} aria-label={`Edit ${t.name}`}>Edit</Link><form action={removeTeacher}><input type="hidden" name="id" value={t.id} /><ConfirmButton className="ghost" message={`Remove ${t.name}? Their class assignments will be removed too.`} aria-label={`Remove ${t.name}`}>Remove</ConfirmButton></form></div></td></tr>
            ))}</tbody>
          </table>
        )}
      </section>
      <section className="card">
        <h2>Assign a teacher to a subject</h2>
        {!ready ? <p className="muted">You need at least one teacher, one <Link href="/dashboard/classes">class with sections</Link> and one <Link href="/dashboard/subjects">subject</Link> first.</p> : (
          <form action={assignTeacher} className="form">
            <label>Teacher<select name="teacher">{teachers.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}</select></label>
            <label>Subject<select name="subject">{subs.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}</select></label>
            <label>Class and section<select name="section">{secs.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}</select></label>
            <button>Assign</button>
          </form>
        )}
      </section>
      <section className="card scroll">
        <h2>Who teaches what</h2>
        {asg.length > 5 && <TableSearch placeholder="Search by class, subject or teacher" />}
        {asg.length === 0 ? <p className="muted">No assignments yet.</p> : (
          <table>
            <thead><tr><th>Class</th><th>Subject</th><th>Teacher</th><th></th></tr></thead>
            <tbody>{asg.map(a => (
              <tr key={a.id}><td>{a.cls}</td><td>{a.subject}</td><td>{a.teacher}</td>
                <td><form action={removeAssignment}><input type="hidden" name="id" value={a.id} /><button className="ghost" aria-label={`Remove ${a.teacher} from ${a.subject}, ${a.cls}`}>Remove</button></form></td></tr>
            ))}</tbody>
          </table>
        )}
      </section>
    </>
  );
}
