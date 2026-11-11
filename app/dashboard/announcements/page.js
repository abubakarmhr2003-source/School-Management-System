import db from '@/lib/db';
import { requireUser } from '@/lib/auth';
import { addAnnouncement, removeAnnouncement } from '@/lib/actions';
export default async function Page() {
  const u = await requireUser();
  const items = (await db.all('SELECT id,title,body,posted_on FROM announcements WHERE school_id=? ORDER BY id DESC', u.school_id));
  return (
    <>
      <header><h1>Announcements</h1><p className="muted">Notices for staff, students and parents.</p></header>
      {u.role === 'admin' && (
        <section className="card">
          <h2>Post an announcement</h2>
          <form action={addAnnouncement} className="stack">
            <label>Title<input name="title" required /></label>
            <label>Message<textarea name="body" /></label>
            <div><button>Post announcement</button></div>
          </form>
        </section>
      )}
      <section className="card">
        <h2>All announcements</h2>
        {items.length === 0 ? <p className="muted">No announcements yet.</p> : items.map(a => (
          <div key={a.id} className="row">
            <div><b>{a.title}</b><p className="muted">{a.posted_on}</p>{a.body && <p style={{ whiteSpace: 'pre-wrap', margin: '8px 0 0' }}>{a.body}</p>}</div>
            {u.role === 'admin' && <form action={removeAnnouncement}><input type="hidden" name="id" value={a.id} /><button className="ghost" aria-label={`Remove ${a.title}`}>Remove</button></form>}
          </div>
        ))}
      </section>
    </>
  );
}
