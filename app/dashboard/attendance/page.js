import Link from 'next/link';
import db from '@/lib/db';
import { requireUser } from '@/lib/auth';
import { saveAttendance } from '@/lib/actions';
import { filterTeachable } from '@/lib/access';
import TableSearch from '@/components/TableSearch';
import AutoSelect from '@/components/AutoSelect';
import AutoInput from '@/components/AutoInput';
const OPTS = [['P', 'Present'], ['A', 'Absent'], ['L', 'Leave']];
export default async function Page(props) {
  const searchParams = await props.searchParams;
  const u = await requireUser(['admin', 'teacher']);
  const secs = await filterTeachable(u, await db.all("SELECT s.id, c.name||' – '||s.name AS label FROM sections s JOIN classes c ON c.id=s.class_id WHERE s.school_id=? ORDER BY c.id, s.name", u.school_id));
  const today = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Karachi' });
  const date = /^\d{4}-\d{2}-\d{2}$/.test(searchParams.date || '') ? searchParams.date : today;
  const sec = secs.find(s => String(s.id) === searchParams.section) || secs[0];
  const students = sec ? (await db.all('SELECT st.id,st.roll_no,st.name,a.status FROM students st LEFT JOIN attendance a ON a.student_id=st.id AND a.date=? WHERE st.section_id=? AND st.school_id=? ORDER BY public.roll_sort(st.roll_no),st.name', date, sec.id, u.school_id)) : [];
  const report = sec ? (await db.all("SELECT st.id,st.name,st.roll_no,COUNT(*) FILTER (WHERE a.status='P') AS p,COUNT(*) FILTER (WHERE a.status='A') AS a,COUNT(*) FILTER (WHERE a.status='L') AS l,COUNT(a.id) AS n FROM students st LEFT JOIN attendance a ON a.student_id=st.id AND substr(a.date,1,7)=? WHERE st.section_id=? AND st.school_id=? GROUP BY st.id ORDER BY public.roll_sort(st.roll_no),st.name", date.slice(0, 7), sec.id, u.school_id)) : [];
  const saved = students.some(s => s.status);
  return (
    <>
      <header><h1>Attendance</h1><p className="muted">Mark who is present, absent or on leave for a class.</p></header>
      {secs.length === 0 ? (
        <section className="card"><p className="muted">No classes yet. {u.role === 'admin' ? <>Add one on the <Link href="/dashboard/classes">Classes</Link> page.</> : 'Ask your school admin to add classes.'}</p></section>
      ) : (
        <>
          <section className="card">
            <form method="get" className="form">
              <label>Class and section<AutoSelect name="section" defaultValue={sec.id}>{secs.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}</AutoSelect></label>
              <label>Date<AutoInput type="date" name="date" defaultValue={date} required /></label>
              <noscript><button>Show class</button></noscript>
            </form>
          </section>
          <section className="card">
            <h2>{sec.label} · {date}</h2>
            {searchParams.saved && <p className="okmsg" role="status">Attendance saved.</p>}
            {students.length === 0 ? <p className="muted">This class has no students yet.</p> : (
              <form action={saveAttendance}>
                <input type="hidden" name="section" value={sec.id} />
                <input type="hidden" name="date" value={date} />
                {!saved && <p className="muted">Everyone starts as present. Change only the exceptions, then save.</p>}
                {students.length > 8 && <TableSearch placeholder="Find a student" />}
                <div className="scroll"><table>
                  <thead><tr><th>Roll</th><th>Name</th><th>Status</th></tr></thead>
                  <tbody>{students.map(s => (
                    <tr key={s.id}><td>{s.roll_no}</td><td>{s.name}</td>
                      <td><div className="seg" role="radiogroup" aria-label={`Attendance for ${s.name}`}>
                        {OPTS.map(([v, t]) => <label key={v} className={`o-${v}`}><input type="radio" name={`s_${s.id}`} value={v} defaultChecked={(s.status || 'P') === v} /><span>{t}</span></label>)}
                      </div></td></tr>
                  ))}</tbody>
                </table></div>
                <div className="savebar"><button>Save attendance</button></div>
              </form>
            )}
          </section>
          <section className="card scroll">
            <h2>Monthly summary · {date.slice(0, 7)}</h2>
            {report.length === 0 ? <p className="muted">No students to report on.</p> : (
              <table>
                <thead><tr><th>Roll</th><th>Name</th><th>Present</th><th>Absent</th><th>Leave</th><th>Attendance</th></tr></thead>
                <tbody>{report.map(r => (
                  <tr key={r.id}><td>{r.roll_no}</td><td>{r.name}</td><td>{r.p || 0}</td><td>{r.a || 0}</td><td>{r.l || 0}</td><td>{r.n ? Math.round(((r.p || 0) / r.n) * 100) + '%' : '–'}</td></tr>
                ))}</tbody>
              </table>
            )}
          </section>
        </>
      )}
    </>
  );
}
