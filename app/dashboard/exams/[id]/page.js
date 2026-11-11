import Link from 'next/link';
import { notFound } from 'next/navigation';
import db from '@/lib/db';
import { requireUser } from '@/lib/auth';
import { saveMarks, saveRemarks } from '@/lib/actions';
import { classResults } from '@/lib/results';
import { filterTeachable, filterTeachableSubjects } from '@/lib/access';
import TableSearch from '@/components/TableSearch';
import AutoSelect from '@/components/AutoSelect';
export default async function Page(props) {
  const params = await props.params;
  const searchParams = await props.searchParams;
  const u = await requireUser(['admin', 'teacher']);
  const exam = (await db.get('SELECT * FROM exams WHERE id=? AND school_id=?', params.id, u.school_id));
  if (!exam) notFound();
  const secs = await filterTeachable(u, await db.all("SELECT s.id, c.name||' – '||s.name AS label FROM sections s JOIN classes c ON c.id=s.class_id WHERE s.school_id=? ORDER BY c.id, s.name", u.school_id));
  const allSubs = (await db.all('SELECT id,name FROM subjects WHERE school_id=? ORDER BY name', u.school_id));
  const sec = secs.find(s => String(s.id) === searchParams.section) || secs[0];
  const subs = sec ? await filterTeachableSubjects(u, sec.id, allSubs) : [];
  const sub = subs.find(s => String(s.id) === searchParams.subject) || subs[0];
  const entry = sec && sub ? (await db.all('SELECT st.id,st.roll_no,st.name,m.obtained FROM students st LEFT JOIN marks m ON m.student_id=st.id AND m.exam_id=? AND m.subject_id=? WHERE st.section_id=? AND st.school_id=? ORDER BY public.roll_sort(st.roll_no),st.name', exam.id, sub.id, sec.id, u.school_id)) : [];
  const results = sec ? await classResults(exam.id, sec.id, u.school_id, exam.total_marks) : [];
  const remarkOf = sec ? Object.fromEntries((await db.all('SELECT er.student_id,er.remark FROM exam_remarks er JOIN students st ON st.id=er.student_id WHERE er.exam_id=? AND st.section_id=? AND st.school_id=?', exam.id, sec.id, u.school_id)).map(r => [r.student_id, r.remark])) : {};
  return (
    <>
      <header><h1>{exam.name}</h1><p className="muted">{exam.total_marks} marks per subject · <Link href="/dashboard/exams">All exams</Link></p></header>
      {!sec || !sub ? (
        <section className="card"><p className="muted">You need at least one <Link href="/dashboard/classes">class</Link> and one <Link href="/dashboard/subjects">subject</Link> before entering marks.</p></section>
      ) : (
        <>
          <section className="card">
            <form method="get" className="form">
              <label>Class and section<AutoSelect name="section" defaultValue={sec.id}>{secs.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}</AutoSelect></label>
              <label>Subject<AutoSelect name="subject" defaultValue={sub.id}>{subs.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}</AutoSelect></label>
              <noscript><button>Show students</button></noscript>
            </form>
          </section>
          <section className="card">
            <h2>{sub.name} marks · {sec.label}</h2>
            {searchParams.saved && <p className="okmsg" role="status">Marks saved.</p>}
            {entry.length === 0 ? <p className="muted">This class has no students yet.</p> : (
              <form action={saveMarks}>
                <input type="hidden" name="exam" value={exam.id} />
                <input type="hidden" name="section" value={sec.id} />
                <input type="hidden" name="subject" value={sub.id} />
                {entry.length > 8 && <TableSearch placeholder="Find a student" />}
                <div className="scroll"><table>
                  <thead><tr><th>Roll</th><th>Name</th><th>Marks out of {exam.total_marks}</th></tr></thead>
                  <tbody>{entry.map(s => (
                    <tr key={s.id}><td>{s.roll_no}</td><td>{s.name}</td>
                      <td><input name={`m_${s.id}`} type="number" min="0" max={exam.total_marks} step="0.5" defaultValue={s.obtained ?? ''} aria-label={`Marks for ${s.name}`} style={{ width: 110 }} /></td></tr>
                  ))}</tbody>
                </table></div>
                <p className="muted">Leave a box empty if the student did not appear.</p>
                <div className="savebar"><button>Save marks</button></div>
              </form>
            )}
          </section>
          <section className="card">
            <h2>Remarks for the report card · {sec.label}</h2>
            {searchParams.remarks && <p className="okmsg" role="status">Remarks saved.</p>}
            {results.length === 0 ? <p className="muted">This class has no students yet.</p> : (
              <form action={saveRemarks}>
                <input type="hidden" name="exam" value={exam.id} />
                <input type="hidden" name="section" value={sec.id} />
                <input type="hidden" name="subject" value={sub.id} />
                <datalist id="remark-ideas">
                  <option value="Excellent performance. Keep it up." /><option value="Very good. Keep working hard." /><option value="Good. Can do even better." />
                  <option value="Satisfactory. Needs more practice." /><option value="Needs improvement. Please give more time to studies." /><option value="Weak. Please meet the class teacher." />
                </datalist>
                {results.length > 8 && <TableSearch placeholder="Find a student" />}
                <div className="scroll"><table>
                  <thead><tr><th>Roll</th><th>Name</th><th>Remark (shown on the report card)</th></tr></thead>
                  <tbody>{results.map(r => (
                    <tr key={r.id}><td>{r.roll_no}</td><td>{r.name}</td>
                      <td><input name={`r_${r.id}`} list="remark-ideas" maxLength={200} defaultValue={remarkOf[r.id] || ''} aria-label={`Remark for ${r.name}`} style={{ minWidth: 260 }} /></td></tr>
                  ))}</tbody>
                </table></div>
                <p className="muted">Type your own remark or pick a suggestion. Leave a box empty for no remark.</p>
                <div className="savebar"><button>Save remarks</button></div>
              </form>
            )}
          </section>
          <section className="card scroll">
            <h2>Class result · {sec.label}</h2>
            {results.some(r => r.n) && <p><Link href={`/dashboard/exams/${exam.id}/reports?section=${sec.id}`}>Print all report cards of this class</Link></p>}
            {results.length === 0 ? <p className="muted">No students yet.</p> : (
              <table>
                <thead><tr><th>Roll</th><th>Name</th><th>Marks</th><th>Percentage</th><th>Grade</th><th>Position</th><th></th></tr></thead>
                <tbody>{results.map(r => (
                  <tr key={r.id}><td>{r.roll_no}</td><td>{r.name}</td>
                    <td>{r.n ? `${r.got} / ${r.out}` : '–'}</td><td>{r.n ? r.pct + '%' : '–'}</td><td>{r.grade}</td><td>{r.pos ?? '–'}</td>
                    <td>{r.n ? <Link href={`/dashboard/exams/${exam.id}/report/${r.id}`}>Report card</Link> : null}</td></tr>
                ))}</tbody>
              </table>
            )}
          </section>
        </>
      )}
    </>
  );
}
