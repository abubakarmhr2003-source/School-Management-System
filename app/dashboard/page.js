import Link from 'next/link';
import db from '@/lib/db';
import { requireUser } from '@/lib/auth';
import { myChildren } from '@/lib/access';
export default async function Page() {
  const u = await requireUser();
  const counts = u.role === 'admin' ? await db.get('SELECT (SELECT COUNT(*) FROM classes WHERE school_id=?) AS classes, (SELECT COUNT(*) FROM students WHERE school_id=?) AS students, (SELECT COUNT(*) FROM teachers WHERE school_id=?) AS teachers', u.school_id, u.school_id, u.school_id) : null;
  const news = (await db.all('SELECT id,title,posted_on FROM announcements WHERE school_id=? ORDER BY id DESC LIMIT 3', u.school_id));
  const kids = u.role === 'parent' ? await myChildren(u) : [];
  const mine = u.role === 'teacher' ? (await db.all("SELECT c.name||' – '||s.name AS cls, j.name AS subj FROM assignments a JOIN teacher_users tu ON tu.teacher_id=a.teacher_id JOIN sections s ON s.id=a.section_id JOIN classes c ON c.id=s.class_id JOIN subjects j ON j.id=a.subject_id WHERE tu.user_id=? AND a.school_id=? ORDER BY c.id,s.name,j.name", u.id, u.school_id)) : [];
  return (
    <>
      <header><h1>Welcome, {u.name}</h1><p className="muted">{u.school_name}</p></header>
      {u.role === 'admin' && (
        <section className="stats">
          <div className="stat"><span>Classes</span><b>{counts.classes}</b></div>
          <div className="stat"><span>Students</span><b>{counts.students}</b></div>
          <div className="stat"><span>Teachers</span><b>{counts.teachers}</b></div>
        </section>
      )}
      {u.role === 'teacher' && (
        <section className="card scroll">
          <h2>Your classes</h2>
          {mine.length === 0 ? <p className="muted">No classes are assigned to you yet. Please ask the school office.</p> : (
            <table><thead><tr><th>Class</th><th>Subject</th></tr></thead><tbody>{mine.map((m, i) => <tr key={i}><td>{m.cls}</td><td>{m.subj}</td></tr>)}</tbody></table>
          )}
        </section>
      )}
      {u.role === 'parent' && (
        <section className="card">
          <h2>Your children</h2>
          {kids.length === 0 ? <p className="muted">No student is linked to your account yet. Please ask the school office.</p> : kids.map(k => (
            <div key={k.id} className="row"><div><b>{k.name}</b><p className="muted">{k.cls}</p></div>
              <div className="acts"><Link href={`/dashboard/my/attendance?child=${k.id}`}>Attendance</Link><Link href={`/dashboard/my/results?child=${k.id}`}>Results</Link><Link href={`/dashboard/my/fees?child=${k.id}`}>Fees</Link></div></div>
          ))}
        </section>
      )}
      <section className="card">
        <h2>Latest announcements</h2>
        {news.length === 0
          ? <p className="muted" style={{ margin: 0 }}>Nothing posted yet.</p>
          : news.map(a => <div key={a.id} className="row"><span>{a.title}</span><span className="muted">{a.posted_on}</span></div>)}
        {news.length > 0 && <p><Link href="/dashboard/announcements">See all announcements</Link></p>}
      </section>
    </>
  );
}
