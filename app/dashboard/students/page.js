import Link from 'next/link';
import ConfirmButton from '@/components/ConfirmButton';
import db from '@/lib/db';
import { requireUser } from '@/lib/auth';
import { addStudent, removeStudent } from '@/lib/actions';
import TableSearch from '@/components/TableSearch';
import AutoSelect from '@/components/AutoSelect';
import PhotoInput from '@/components/PhotoInput';
export default async function Page(props) {
  const searchParams = await props.searchParams;
  const u = await requireUser(['admin']);
  const secs = (await db.all("SELECT s.id, c.name||' – '||s.name AS label FROM sections s JOIN classes c ON c.id=s.class_id WHERE s.school_id=? ORDER BY c.id, s.name", u.school_id));
  const sec = searchParams.section;
  const students = (await db.all(`SELECT st.id,st.roll_no,st.name,st.father_name,st.phone,c.name||' – '||s.name AS cls FROM students st JOIN sections s ON s.id=st.section_id JOIN classes c ON c.id=st.class_id WHERE st.school_id=? ${sec ? 'AND st.section_id=?' : ''} ORDER BY c.id,s.name,public.roll_sort(st.roll_no),st.name`, ...(sec ? [u.school_id, sec] : [u.school_id])));
  return (
    <>
      <header><h1>Students</h1><p className="muted">{students.length} {students.length === 1 ? 'student' : 'students'} · <Link href="/dashboard/students/import">Import from Excel</Link></p></header>
      <section className="card">
        <h2>Add a student</h2>
        {secs.length === 0 ? <p className="muted">Add a class with sections first on the <Link href="/dashboard/classes">Classes</Link> page.</p> : (
          <form action={addStudent} className="form">
            <label>Student name<input name="name" required /></label>
            <PhotoInput />
            <label>Father's name<input name="father" /></label>
            <label>Phone<input name="phone" type="tel" /></label>
            <label>Roll no.<input name="roll" /></label>
            <label>Class and section<select name="section">{secs.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}</select></label>
            <button>Add student</button>
          </form>
        )}
      </section>
      <section className="card scroll">
        <form method="get" className="form" style={{ marginBottom: 12 }}>
          <label>Show<AutoSelect name="section" defaultValue={sec || ''}><option value="">All classes</option>{secs.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}</AutoSelect></label>
          {students.length > 5 && <TableSearch placeholder="Search by name, father, phone or roll no." />}
          <noscript><button className="ghost">Filter</button></noscript>
        </form>
        {students.length === 0 ? <p className="muted">No students found.</p> : (
          <table>
            <thead><tr><th>Roll</th><th>Name</th><th>Father</th><th>Phone</th><th>Class</th><th></th></tr></thead>
            <tbody>{students.map(s => (
              <tr key={s.id}><td>{s.roll_no}</td><td>{s.name}</td><td>{s.father_name}</td><td>{s.phone}</td><td>{s.cls}</td>
                <td><div className="acts"><Link href={`/dashboard/students/${s.id}`} aria-label={`Edit ${s.name}`}>Edit</Link><form action={removeStudent}><input type="hidden" name="id" value={s.id} /><ConfirmButton className="ghost" message={`Remove ${s.name}? Their attendance, marks and fee records will be deleted too.`} aria-label={`Remove ${s.name}`}>Remove</ConfirmButton></form></div></td></tr>
            ))}</tbody>
          </table>
        )}
      </section>
    </>
  );
}
