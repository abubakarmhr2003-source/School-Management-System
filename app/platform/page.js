import db from '@/lib/db';
import { requireUser } from '@/lib/auth';
import SchoolActions from '@/components/SchoolActions';
import LogoutButton from '@/components/LogoutButton';
import TableSearch from '@/components/TableSearch';
export const dynamic = 'force-dynamic';
const CLS = { approved: 'paid', pending: 'partial', rejected: 'unpaid', suspended: 'unpaid' };
export default async function Page() {
  await requireUser(['superadmin']);
  const schools = (await db.all("SELECT s.id,s.name,s.code,s.status,s.created_at::date::text AS created_at,(SELECT name FROM users WHERE school_id=s.id AND role='admin' ORDER BY id LIMIT 1) AS admin,0 AS students FROM schools s ORDER BY (s.status='pending') DESC, s.id DESC"));
  // each school's students live in that school's own tables
  await Promise.all(schools.map(async s => { s.students = (await db.school(s.id).get('SELECT COUNT(*) AS n FROM students'))?.n ?? 0; }));
  const count = st => schools.filter(s => s.status === st).length;
  return (
    <main className="plat">
      <div className="bar"><div><h1>Platform owner</h1><p className="muted">Approve new schools and manage access.</p></div><LogoutButton className="ghost" label="Sign out" /></div>
      <section className="stats">
        <div className="stat"><span>Waiting for approval</span><b>{count('pending')}</b></div>
        <div className="stat"><span>Active schools</span><b>{count('approved')}</b></div>
        <div className="stat"><span>All schools</span><b>{schools.length}</b></div>
      </section>
      <section className="card scroll">
        <h2>Schools</h2>
        {schools.length > 5 && <TableSearch placeholder="Search schools" />}
        {schools.length === 0 ? <p className="muted">No schools have been created yet.</p> : (
          <table>
            <thead><tr><th>School</th><th>Created by</th><th>Students</th><th>Created</th><th>Status</th><th>Action</th></tr></thead>
            <tbody>{schools.map(s => (
              <tr key={s.id}><td>{s.name}</td><td>{s.admin}</td><td>{s.students}</td><td>{s.created_at}</td>
                <td><span className={`st ${CLS[s.status]}`}>{s.status[0].toUpperCase() + s.status.slice(1)}</span></td>
                <td><SchoolActions id={s.id} status={s.status} name={s.name} /></td></tr>
            ))}</tbody>
          </table>
        )}
      </section>
    </main>
  );
}
