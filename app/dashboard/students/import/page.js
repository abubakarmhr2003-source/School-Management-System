import Link from 'next/link';
import { requireUser } from '@/lib/auth';
import { importStudents } from '@/lib/actions';
const ERR = {
  nofile: 'Choose a file first.',
  big: 'The file is too big. Use at most 2000 students per file.',
  read: 'We could not read this file. Please use an Excel (.xlsx) or CSV file.',
  columns: 'The first row must have the headings Name and Class. Download the template to see the format.',
};
export default async function Page(props) {
  const searchParams = await props.searchParams;
  await requireUser(['admin']);
  const done = searchParams.added !== undefined;
  const notes = (searchParams.notes || '').split('|').filter(Boolean);
  return (
    <>
      <header><h1>Import students</h1><p className="muted"><Link href="/dashboard/students">Back to students</Link></p></header>
      {ERR[searchParams.error] && <p className="err" role="alert">{ERR[searchParams.error]}</p>}
      {done && (
        <section className="card">
          <p className="okmsg" role="status">{searchParams.added} {searchParams.added === '1' ? 'student' : 'students'} added. {searchParams.skipped} skipped.</p>
          {notes.length > 0 && <ul className="muted">{notes.map(n => <li key={n}>{n}</li>)}</ul>}
        </section>
      )}
      <section className="card">
        <h2>1. Prepare your file</h2>
        <p className="muted">Use an Excel (.xlsx) or CSV file. The first row must be the headings, with these columns in any order:</p>
        <p><b>Name</b> (required), <b>Class</b> (required), Father Name, Phone, Roll No, Section</p>
        <p className="muted">Section is A when left empty. Classes and sections that do not exist yet are created for you. Students who are already in the same class are skipped, so it is safe to try again. Tip: set the Phone column to Text in Excel so the leading 0 is kept.</p>
        <p><a href="/dashboard/students/import/template">Download the CSV template</a></p>
      </section>
      <section className="card">
        <h2>2. Upload it</h2>
        <form action={importStudents} className="stack">
          <label>Excel or CSV file<input type="file" name="file" accept=".xlsx,.csv" required /></label>
          <div><button>Import students</button></div>
        </form>
      </section>
    </>
  );
}
