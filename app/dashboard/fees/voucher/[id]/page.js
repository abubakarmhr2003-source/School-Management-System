import Link from 'next/link';
import { notFound } from 'next/navigation';
import db from '@/lib/db';
import { requireUser, logoUrl } from '@/lib/auth';
import { pkr } from '@/lib/fmt';
import { recordPayment } from '@/lib/actions';
import PrintButton from '@/components/PrintButton';
import { isMyChild } from '@/lib/access';
export default async function Page(props) {
  const params = await props.params;
  const u = await requireUser(['admin', 'accountant', 'parent']);
  const v = (await db.get("SELECT v.id,v.student_id,v.month,v.amount,st.name,st.roll_no,st.father_name,c.name||' – '||s.name AS cls FROM vouchers v JOIN students st ON st.id=v.student_id JOIN sections s ON s.id=st.section_id JOIN classes c ON c.id=st.class_id WHERE v.id=? AND v.school_id=?", params.id, u.school_id));
  if (!v || (u.role === 'parent' && !(await isMyChild(u, v.student_id)))) notFound();
  const pays = (await db.all('SELECT amount,paid_on FROM payments WHERE voucher_id=? ORDER BY id', v.id));
  const paid = pays.reduce((a, p) => a + p.amount, 0);
  const bal = v.amount - paid;
  const label = new Date(v.month + '-01').toLocaleString('en-US', { month: 'long', year: 'numeric', timeZone: 'UTC' });
  return (
    <>
      <div className="noprint acts-top"><PrintButton label="Print voucher" /><Link href={u.role === 'parent' ? `/dashboard/my/fees?child=${v.student_id}` : `/dashboard/fees?month=${v.month}`}>Back to fees</Link></div>
      <article className="rc">
        <header>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          {logoUrl(u) && <img src={logoUrl(u)} alt="" className="rc-logo" />}
          <b>{u.school_name}</b><span className="muted">Fee voucher · {label}</span></header>
        <section className="info">
          <div><span className="muted">Student: </span><b>{v.name}</b></div>
          <div><span className="muted">Class: </span><b>{v.cls}</b></div>
          <div><span className="muted">Father: </span><b>{v.father_name || '–'}</b></div>
          <div><span className="muted">Roll no.: </span><b>{v.roll_no || '–'}</b></div>
        </section>
        <table>
          <thead><tr><th>Description</th><th>Amount</th></tr></thead>
          <tbody><tr><td>Tuition fee · {label}</td><td>{pkr(v.amount)}</td></tr></tbody>
        </table>
        <section className="tiles">
          <div>Amount<b>{pkr(v.amount)}</b></div>
          <div>Paid<b>{pkr(paid)}</b></div>
          <div>Balance<b>{pkr(bal)}</b></div>
          <div>Status<b>{bal <= 0 ? 'Paid' : paid > 0 ? 'Partly paid' : 'Unpaid'}</b></div>
        </section>
        {pays.length > 0 && (
          <table>
            <thead><tr><th>Payment date</th><th>Received</th></tr></thead>
            <tbody>{pays.map((p, i) => <tr key={i}><td>{p.paid_on}</td><td>{pkr(p.amount)}</td></tr>)}</tbody>
          </table>
        )}
        <section className="sign"><div>Received by</div><div>Principal</div><div>Parent</div></section>
      </article>
      {bal > 0 && u.role !== 'parent' && (
        <section className="card noprint">
          <h2>Receive payment</h2>
          <form action={recordPayment} className="form">
            <input type="hidden" name="voucher" value={v.id} />
            <label>Amount received<input name="amount" type="number" min="1" max={bal} defaultValue={bal} required /></label>
            <button>Receive</button>
          </form>
        </section>
      )}
    </>
  );
}
