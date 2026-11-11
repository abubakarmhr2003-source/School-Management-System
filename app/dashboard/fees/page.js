import Link from 'next/link';
import db from '@/lib/db';
import { requireUser } from '@/lib/auth';
import { pkr } from '@/lib/fmt';
import { saveFees, generateVouchers, recordPayment } from '@/lib/actions';
import TableSearch from '@/components/TableSearch';
import AutoInput from '@/components/AutoInput';
const PAID = '(SELECT COALESCE(SUM(amount),0) FROM payments WHERE voucher_id=v.id)';
export default async function Page(props) {
  const searchParams = await props.searchParams;
  const u = await requireUser(['admin', 'accountant']);
  const id = u.school_id;
  const thisMonth = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Karachi' }).slice(0, 7);
  const month = /^\d{4}-\d{2}$/.test(searchParams.month || '') ? searchParams.month : thisMonth;
  const classes = (await db.all('SELECT c.id,c.name,COALESCE(f.monthly_fee,0) AS fee FROM classes c LEFT JOIN class_fees f ON f.class_id=c.id WHERE c.school_id=? ORDER BY c.id', id));
  const vouchers = (await db.all(`SELECT v.id,v.amount,${PAID} AS paid,st.name,st.roll_no,c.name||' – '||s.name AS cls FROM vouchers v JOIN students st ON st.id=v.student_id JOIN sections s ON s.id=st.section_id JOIN classes c ON c.id=st.class_id WHERE v.school_id=? AND v.month=? ORDER BY c.id,s.name,public.roll_sort(st.roll_no),st.name`, id, month));
  const defaulters = (await db.all(`SELECT st.id,st.name,c.name||' – '||s.name AS cls,COUNT(*) AS months,SUM(v.amount-${PAID}) AS due FROM vouchers v JOIN students st ON st.id=v.student_id JOIN sections s ON s.id=st.section_id JOIN classes c ON c.id=st.class_id WHERE v.school_id=? AND v.amount>${PAID} GROUP BY st.id, st.name, c.id, s.id ORDER BY due DESC`, id));
  const billed = vouchers.reduce((a, v) => a + v.amount, 0);
  const collected = vouchers.reduce((a, v) => a + v.paid, 0);
  const gen = searchParams.generated;
  return (
    <>
      <header><h1>Fees</h1><p className="muted">Set class fees, create monthly vouchers and record payments.</p></header>
      <section className="card">
        <form method="get" className="form">
          <label>Month<AutoInput type="month" name="month" defaultValue={month} required /></label>
          <noscript><button className="ghost">Show month</button></noscript>
        </form>
      </section>
      <section className="stats">
        <div className="stat"><span>Billed</span><b>{pkr(billed)}</b></div>
        <div className="stat"><span>Collected</span><b>{pkr(collected)}</b></div>
        <div className="stat"><span>Outstanding</span><b>{pkr(billed - collected)}</b></div>
      </section>
      <section className="card scroll">
        <h2>Vouchers · {month}</h2>
        {gen !== undefined && <p className="okmsg" role="status">{Number(gen) > 0 ? `${gen} vouchers created.` : 'No new vouchers. Set a class fee first, or vouchers for this month already exist.'}</p>}
        {vouchers.length > 5 && <TableSearch placeholder="Search by student, class or status" />}
        {vouchers.length === 0 ? <p className="muted">No vouchers for this month. Set class fees and create vouchers below.</p> : (
          <table>
            <thead><tr><th>Roll</th><th>Student</th><th>Class</th><th>Amount</th><th>Paid</th><th>Status</th><th>Receive payment</th><th></th></tr></thead>
            <tbody>{vouchers.map(v => {
              const bal = v.amount - v.paid;
              const st = bal <= 0 ? 'paid' : v.paid > 0 ? 'partial' : 'unpaid';
              return (
                <tr key={v.id}><td>{v.roll_no}</td><td>{v.name}</td><td>{v.cls}</td><td>{pkr(v.amount)}</td><td>{pkr(v.paid)}</td>
                  <td><span className={`st ${st}`}>{st === 'paid' ? 'Paid' : st === 'partial' ? 'Partly paid' : 'Unpaid'}</span></td>
                  <td>{bal > 0 && (
                    <form action={recordPayment} className="inline">
                      <input type="hidden" name="voucher" value={v.id} />
                      <input name="amount" type="number" min="1" max={bal} defaultValue={bal} aria-label={`Amount received from ${v.name}`} />
                      <button>Receive</button>
                    </form>
                  )}</td>
                  <td><Link href={`/dashboard/fees/voucher/${v.id}`}>Voucher</Link></td></tr>
              );
            })}</tbody>
          </table>
        )}
      </section>
      <section className="card scroll">
        <h2>Defaulters</h2>
        {defaulters.length > 5 && <TableSearch placeholder="Search defaulters" />}
        {defaulters.length === 0 ? <p className="muted">No student has unpaid fees.</p> : (
          <table>
            <thead><tr><th>Student</th><th>Class</th><th>Unpaid months</th><th>Total due</th></tr></thead>
            <tbody>{defaulters.map(d => <tr key={d.id}><td>{d.name}</td><td>{d.cls}</td><td>{d.months}</td><td>{pkr(d.due)}</td></tr>)}</tbody>
          </table>
        )}
      </section>
      <section className="card">
        <h2>Class fees (per month)</h2>
        {classes.length === 0 ? <p className="muted">Add classes on the <Link href="/dashboard/classes">Classes</Link> page first.</p> : (
          <form action={saveFees}>
            <div className="form">{classes.map(c => <label key={c.id}>{c.name}<input name={`fee_${c.id}`} type="number" min="0" defaultValue={c.fee} /></label>)}</div>
            <p><button>Save fees</button></p>
          </form>
        )}
      </section>
      <section className="card">
        <h2>Create vouchers</h2>
        <form action={generateVouchers} className="form">
          <label>Month<input type="month" name="month" defaultValue={month} required /></label>
          <label>Class<select name="class"><option value="">All classes</option>{classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select></label>
          <button>Create vouchers</button>
        </form>
        <p className="muted">Students who already have a voucher for the month are skipped.</p>
      </section>
    </>
  );
}
