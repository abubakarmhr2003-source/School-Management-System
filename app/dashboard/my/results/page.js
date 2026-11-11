import Link from 'next/link';
import db from '@/lib/db';
import { requireUser } from '@/lib/auth';
import { myChildren } from '@/lib/access';
import ChildPicker from '@/components/ChildPicker';
import { classResults } from '@/lib/results';
export default async function Page(props) {
  const searchParams = await props.searchParams;
  const u = await requireUser(['parent']);
  const kids = await myChildren(u);
  const child = kids.find(k => String(k.id) === searchParams.child) || kids[0];
  if (!child) return <section className="card"><p className="muted">No student is linked to your account yet. Please ask the school office.</p></section>;
  const exams = (await db.all('SELECT DISTINCT e.id,e.name,e.total_marks FROM exams e JOIN marks m ON m.exam_id=e.id WHERE m.student_id=? ORDER BY e.id DESC', child.id));
  const rows = await Promise.all(exams.map(async e => ({ e, r: (await classResults(e.id, child.section_id, u.school_id, e.total_marks)).find(r => r.id === child.id) })));
  return (
    <>
      <header><h1>Results</h1><p className="muted">{child.name} · {child.cls}</p></header>
      <ChildPicker kids={kids} child={child} />
      <section className="card scroll">
        {rows.length === 0 ? <p className="muted">No results have been entered yet.</p> : (
          <table><thead><tr><th>Exam</th><th>Marks</th><th>Percentage</th><th>Grade</th><th>Position</th><th></th></tr></thead>
            <tbody>{rows.map(({ e, r }) => <tr key={e.id}><td>{e.name}</td><td>{r.got} / {r.out}</td><td>{r.pct}%</td><td>{r.grade}</td><td>{r.pos}</td><td><Link href={`/dashboard/exams/${e.id}/report/${child.id}`}>Report card</Link></td></tr>)}</tbody></table>
        )}
      </section>
    </>
  );
}
