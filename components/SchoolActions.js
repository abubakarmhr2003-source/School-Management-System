'use client';
import { useRouter } from 'next/navigation';
const ACTIONS = {
  pending: [['approved', 'Approve'], ['rejected', 'Reject']],
  approved: [['suspended', 'Suspend']],
  suspended: [['approved', 'Reactivate']],
  rejected: [['approved', 'Approve']],
};
export default function SchoolActions({ id, status, name }) {
  const r = useRouter();
  const act = async s => {
    await fetch('/api/manage', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ kind: 'school', id, status: s }) });
    r.refresh();
  };
  return (
    <div className="acts">
      {(ACTIONS[status] || []).map(([s, t], i) => <button key={s} className={i ? 'ghost' : ''} onClick={() => act(s)} aria-label={`${t} ${name}`}>{t}</button>)}
    </div>
  );
}
