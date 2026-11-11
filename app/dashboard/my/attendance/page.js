import Link from 'next/link';
import db from '@/lib/db';
import { requireUser } from '@/lib/auth';
import { myChildren } from '@/lib/access';
import ChildPicker from '@/components/ChildPicker';
export default async function Page(props) {
  const searchParams = await props.searchParams;
  const u = await requireUser(['parent']);
  const kids = await myChildren(u);
  const child = kids.find(k => String(k.id) === searchParams.child) || kids[0];
  if (!child) return <section className="card"><p className="muted">No student is linked to your account yet. Please ask the school office.</p></section>;
  const months = (await db.all("SELECT substr(date,1,7) AS m,COUNT(*) FILTER (WHERE status='P') AS p,COUNT(*) FILTER (WHERE status='A') AS a,COUNT(*) FILTER (WHERE status='L') AS l,COUNT(*) AS n FROM attendance WHERE student_id=? GROUP BY m ORDER BY m DESC", child.id));
  const missed = (await db.all("SELECT date,status FROM attendance WHERE student_id=? AND status!='P' ORDER BY date DESC LIMIT 15", child.id));
  return (
    <>
      <header><h1>Attendance</h1><p className="muted">{child.name} · {child.cls}</p></header>
      <ChildPicker kids={kids} child={child} />
      <section className="card scroll">
        <h2>Month by month</h2>
        {months.length === 0 ? <p className="muted">No attendance has been marked yet.</p> : (
          <table><thead><tr><th>Month</th><th>Present</th><th>Absent</th><th>Leave</th><th>Attendance</th></tr></thead>
            <tbody>{months.map(m => <tr key={m.m}><td>{m.m}</td><td>{m.p}</td><td>{m.a}</td><td>{m.l}</td><td>{Math.round((m.p / m.n) * 100)}%</td></tr>)}</tbody></table>
        )}
      </section>
      <section className="card">
        <h2>Recent absences and leaves</h2>
        {missed.length === 0 ? <p className="muted">None. Great!</p> : missed.map(d => <div key={d.date} className="row"><span>{d.date}</span><span>{d.status === 'A' ? 'Absent' : 'Leave'}</span></div>)}
      </section>
    </>
  );
}
