import Link from 'next/link';
import { notFound } from 'next/navigation';
import db from '@/lib/db';
import { requireUser, logoUrl } from '@/lib/auth';
import { classResults } from '@/lib/results';
import { canTeach } from '@/lib/access';
import PrintButton from '@/components/PrintButton';
import ReportCard from '@/components/ReportCard';
// Every report card of one class on one page, one card per printed page.
export default async function Page(props) {
  const params = await props.params;
  const searchParams = await props.searchParams;
  const u = await requireUser(['admin', 'teacher']);
  const exam = await db.get('SELECT * FROM exams WHERE id=? AND school_id=?', params.id, u.school_id);
  const sectionId = Number(searchParams.section);
  if (!exam || !Number.isInteger(sectionId) || !(await canTeach(u, sectionId))) notFound();
  const sec = await db.get("SELECT s.id, c.name||' – '||s.name AS label FROM sections s JOIN classes c ON c.id=s.class_id WHERE s.id=? AND s.school_id=?", sectionId, u.school_id);
  if (!sec) notFound();
  const students = await db.all("SELECT st.id,st.name,st.roll_no,st.father_name,st.photo,st.section_id,c.name||' – '||s.name AS cls FROM students st JOIN sections s ON s.id=st.section_id JOIN classes c ON c.id=st.class_id WHERE st.section_id=? AND st.school_id=? ORDER BY public.roll_sort(st.roll_no),st.name", sectionId, u.school_id);
  const marks = await db.all('SELECT m.student_id,j.name,m.obtained FROM marks m JOIN subjects j ON j.id=m.subject_id JOIN students st ON st.id=m.student_id WHERE m.exam_id=? AND st.section_id=? AND st.school_id=? ORDER BY j.name', exam.id, sectionId, u.school_id);
  const attRows = await db.all('SELECT a.student_id,a.status,COUNT(*) AS n FROM attendance a JOIN students st ON st.id=a.student_id WHERE st.section_id=? AND a.school_id=? GROUP BY a.student_id,a.status', sectionId, u.school_id);
  const remarkOf = Object.fromEntries((await db.all('SELECT er.student_id,er.remark FROM exam_remarks er JOIN students st ON st.id=er.student_id WHERE er.exam_id=? AND st.section_id=? AND st.school_id=?', exam.id, sectionId, u.school_id)).map(r => [r.student_id, r.remark]));
  const res = await classResults(exam.id, sectionId, u.school_id, exam.total_marks);
  const ranked = res.filter(r => r.n).length;
  const cards = students.map(st => ({
    st,
    me: res.find(r => r.id === st.id),
    rows: marks.filter(m => m.student_id === st.id),
    att: Object.fromEntries(attRows.filter(a => a.student_id === st.id).map(a => [a.status, Number(a.n)])),
  })).filter(c => c.me && c.me.n);
  const skipped = students.length - cards.length;
  return (
    <>
      <div className="noprint acts-top">
        <PrintButton label={`Print ${cards.length} report card${cards.length === 1 ? '' : 's'}`} />
        <Link href={`/dashboard/exams/${exam.id}?section=${sectionId}`}>Back to results</Link>
      </div>
      {skipped > 0 && <p className="muted noprint">{skipped} student{skipped === 1 ? ' has' : 's have'} no marks for this exam yet, so no card was made.</p>}
      {cards.length === 0 ? <p className="muted">No marks have been entered for {sec.label} yet.</p> : (
        <div className="rc-batch">{cards.map(c => <ReportCard key={c.st.id} school={u.school_name} logo={logoUrl(u)} exam={exam} st={c.st} rows={c.rows} me={c.me} ranked={ranked} att={c.att} remark={remarkOf[c.st.id] || ''} />)}</div>
      )}
    </>
  );
}
