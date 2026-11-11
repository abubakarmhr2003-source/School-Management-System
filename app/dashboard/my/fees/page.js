import Link from 'next/link';
import db from '@/lib/db';
import { requireUser } from '@/lib/auth';
import { myChildren } from '@/lib/access';
import ChildPicker from '@/components/ChildPicker';
import { pkr } from '@/lib/fmt';
export default async function Page(props) {
  const searchParams = await props.searchParams;
  const u = await requireUser(['parent']);
  const kids = await myChildren(u);
  const child = kids.find(k => String(k.id) === searchParams.child) || kids[0];
  if (!child) return <section className="card"><p className="muted">No student is linked to your account yet. Please ask the school office.</p></section>;
  const vs = (await db.all('SELECT v.id,v.month,v.amount,(SELECT COALESCE(SUM(amount),0) FROM payments WHERE voucher_id=v.id) AS paid FROM vouchers v WHERE v.student_id=? AND v.school_id=? ORDER BY v.month DESC', child.id, u.school_id));
  const due = vs.reduce((a, v) => a + v.amount - v.paid, 0);
  return (
    <>
      <header><h1>Fees</h1><p className="muted">{child.name} · {child.cls}</p></header>
      <ChildPicker kids={kids} child={child} />
      <section className="stats"><div className="stat"><span>Total unpaid</span><b>{pkr(due)}</b></div></section>
      <section className="card scroll">
        {vs.length === 0 ? <p className="muted">No fee vouchers yet.</p> : (
          <table><thead><tr><th>Month</th><th>Amount</th><th>Paid</th><th>Status</th><th></th></tr></thead>
            <tbody>{vs.map(v => { const st = v.paid >= v.amount ? 'paid' : v.paid > 0 ? 'partial' : 'unpaid'; return <tr key={v.id}><td>{v.month}</td><td>{pkr(v.amount)}</td><td>{pkr(v.paid)}</td><td><span className={`st ${st}`}>{st === 'paid' ? 'Paid' : st === 'partial' ? 'Partly paid' : 'Unpaid'}</span></td><td><Link href={`/dashboard/fees/voucher/${v.id}`}>Voucher</Link></td></tr>; })}</tbody></table>
        )}
      </section>
    </>
  );
}
