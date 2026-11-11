import { grade } from '@/lib/results';
// One report card. Used by the single-student page and by the "print whole class" page.
// att = { P, A, L } day counts (or undefined when attendance was never taken).
export default function ReportCard({ school, logo = null, exam, st, rows, me, ranked, att, remark = '' }) {
  const days = att ? (att.P || 0) + (att.A || 0) + (att.L || 0) : 0;
  const attPct = days ? Math.round(((att.P || 0) / days) * 1000) / 10 : null;
  return (
    <article className="rc">
      <header>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        {logo && <img src={logo} alt="" className="rc-logo" />}
        <b>{school}</b><span className="muted">{exam.name} · Report card</span></header>
      <div className="rc-top">
        <div className="rc-photo">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          {st.photo ? <img src={st.photo} alt={`Photo of ${st.name}`} /> : <span>Photo</span>}
        </div>
        <section className="info">
          <div><span className="muted">Student: </span><b>{st.name}</b></div>
          <div><span className="muted">Class: </span><b>{st.cls}</b></div>
          <div><span className="muted">Father: </span><b>{st.father_name || '–'}</b></div>
          <div><span className="muted">Roll no.: </span><b>{st.roll_no || '–'}</b></div>
        </section>
      </div>
      <table>
        <thead><tr><th>Subject</th><th>Total</th><th>Obtained</th><th>Grade</th></tr></thead>
        <tbody>{rows.map(r => <tr key={r.name}><td>{r.name}</td><td>{exam.total_marks}</td><td>{r.obtained}</td><td><b>{grade(Math.round((r.obtained / exam.total_marks) * 1000) / 10)}</b></td></tr>)}</tbody>
      </table>
      <section className="tiles">
        <div>Total marks<b>{me.got} / {me.out}</b></div>
        <div>Percentage<b>{me.pct}%</b></div>
        <div>Overall grade<b>{me.grade}</b></div>
        <div>Position<b>{me.pos} of {ranked}</b></div>
        {attPct !== null && <div>Attendance<b>{attPct}%</b><span>{att.P || 0} present · {att.A || 0} absent · {att.L || 0} leave</span></div>}
      </section>
      <section className="remarks"><span className="muted">Remarks</span><p>{remark}</p></section>
      <section className="sign"><div>Class teacher</div><div>Principal</div><div>Parent</div></section>
    </article>
  );
}
