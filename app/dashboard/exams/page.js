import Link from 'next/link';
import db from '@/lib/db';
import { requireUser } from '@/lib/auth';
import { addExam } from '@/lib/actions';
export default async function Page() {
  const u = await requireUser(['admin', 'teacher']);
  const exams = (await db.all('SELECT id,name,total_marks FROM exams WHERE school_id=? ORDER BY id DESC', u.school_id));
  return (
    <>
      <header><h1>Exams &amp; Results</h1><p className="muted">Create an exam, enter marks subject by subject, then print report cards.</p></header>
      {u.role === 'admin' && (
        <section className="card">
          <h2>Create an exam</h2>
          <form action={addExam} className="form">
            <label>Exam name<input name="name" placeholder="Mid-Term 2026" required /></label>
            <label>Total marks per subject<input name="total" type="number" min="1" defaultValue="100" required /></label>
            <button>Create exam</button>
          </form>
        </section>
      )}
      <section className="card">
        <h2>All exams</h2>
        {exams.length === 0 ? <p className="muted">No exams yet.{u.role === 'admin' ? ' Create your first exam above.' : ' Ask your school admin to create one.'}</p>
          : exams.map(e => (
            <div key={e.id} className="row">
              <div><b>{e.name}</b><p className="muted">{e.total_marks} marks per subject</p></div>
              <Link href={`/dashboard/exams/${e.id}`}>Enter marks and view results</Link>
            </div>
          ))}
      </section>
    </>
  );
}
