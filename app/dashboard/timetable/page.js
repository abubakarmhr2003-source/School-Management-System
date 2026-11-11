import Link from 'next/link';
import db from '@/lib/db';
import { requireUser } from '@/lib/auth';
import { saveTimetable } from '@/lib/actions';
import PrintButton from '@/components/PrintButton';
import { myChildren } from '@/lib/access';
import AutoSelect from '@/components/AutoSelect';
const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const PERIODS = [1, 2, 3, 4, 5, 6, 7, 8];
export default async function Page(props) {
  const searchParams = await props.searchParams;
  const u = await requireUser();
  const edit = u.role === 'admin';
  const kidSections = new Set(u.role === 'parent' ? (await myChildren(u)).map(c => c.section_id) : []);
  const secs = (await db.all("SELECT s.id, c.name||' – '||s.name AS label FROM sections s JOIN classes c ON c.id=s.class_id WHERE s.school_id=? ORDER BY c.id, s.name", u.school_id)).filter(s => u.role !== 'parent' || kidSections.has(s.id));
  const subs = (await db.all('SELECT id,name FROM subjects WHERE school_id=? ORDER BY name', u.school_id));
  const sec = secs.find(s => String(s.id) === searchParams.section) || secs[0];
  const cells = sec ? Object.fromEntries((await db.all('SELECT day,period,subject_id FROM timetable WHERE section_id=? AND school_id=?', sec.id, u.school_id)).map(c => [`${c.day}_${c.period}`, c.subject_id])) : {};
  const name = Object.fromEntries(subs.map(s => [s.id, s.name]));
  return (
    <>
      <header><h1>Timetable</h1><p className="muted">Weekly timetable for each class and section.</p></header>
      {!sec ? (
        <section className="card"><p className="muted">No classes yet. {edit ? <>Add one on the <Link href="/dashboard/classes">Classes</Link> page.</> : 'Ask your school admin to add classes.'}</p></section>
      ) : (
        <>
          <section className="card">
            <form method="get" className="form">
              <label>Class and section<AutoSelect name="section" defaultValue={sec.id}>{secs.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}</AutoSelect></label>
              <noscript><button className="ghost">Show timetable</button></noscript>
            </form>
          </section>
          <section className="card scroll">
            <h2>{sec.label}</h2>
            {searchParams.saved && <p className="okmsg" role="status">Timetable saved.</p>}
            {edit && subs.length === 0 && <p className="muted">Add subjects on the <Link href="/dashboard/subjects">Subjects</Link> page first.</p>}
            <form action={saveTimetable}>
              <input type="hidden" name="section" value={sec.id} />
              <table>
                <thead><tr><th></th>{DAYS.map(d => <th key={d}>{d}</th>)}</tr></thead>
                <tbody>{PERIODS.map(p => (
                  <tr key={p}><th scope="row">Period {p}</th>
                    {DAYS.map((d, i) => {
                      const k = `${i + 1}_${p}`;
                      return <td key={d}>{edit
                        ? <select name={`c_${k}`} defaultValue={cells[k] ?? ''} aria-label={`${d}, period ${p}`} style={{ minWidth: 120 }}><option value="">–</option>{subs.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}</select>
                        : name[cells[k]] || '–'}</td>;
                    })}</tr>
                ))}</tbody>
              </table>
              {edit && <p><button>Save timetable</button></p>}
            </form>
          </section>
          <div className="noprint"><PrintButton label="Print timetable" /></div>
        </>
      )}
    </>
  );
}
