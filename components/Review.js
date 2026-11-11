'use client';
import { useRouter } from 'next/navigation';
export default function Review({ id, title, sub, kind }) {
  const r = useRouter();
  const act = async (status) => {
    await fetch('/api/manage', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ kind, id, status }) });
    r.refresh();
  };
  return (
    <div className="row">
      <div><b>{title}</b><p className="muted">{sub}</p></div>
      <div className="acts">
        <button onClick={() => act(kind === 'school' ? 'approved' : 'active')}>Approve</button>
        <button className="ghost" onClick={() => act('rejected')}>Reject</button>
      </div>
    </div>
  );
}
