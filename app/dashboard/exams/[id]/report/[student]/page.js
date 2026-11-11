import Link from 'next/link';
import { notFound } from 'next/navigation';
import db from '@/lib/db';
import { requireUser, logoUrl } from '@/lib/auth';
import { classResults } from '@/lib/results';
import PrintButton from '@/components/PrintButton';
import ReportCard from '@/components/ReportCard';
import { canTeach, isMyChild } from '@/lib/access';
export default async function Page(props) {
  const params = await props.params;
  const u = await requireUser(['admin', 'teacher', 'parent']);
  const exam = (await db.get('SELECT * FROM exams WHERE id=? AND school_id=?', params.id, u.school_id));
  const st = (await db.get("SELECT st.id,st.name,st.roll_no,st.father_name,st.photo,st.section_id,c.name||' – '||s.name AS cls FROM students st JOIN sections s ON s.id=st.section_id JOIN classes c ON c.id=st.class_id WHERE st.id=? AND st.school_id=?", params.student, u.school_id));
  if (!exam || !st) notFound();
  if ((u.role === 'teacher' && !(await canTeach(u, st.section_id))) || (u.role === 'parent' && !(await isMyChild(u, st.id)))) notFound();
  const rows = (await db.all('SELECT j.name,m.obtained FROM marks m JOIN subjects j ON j.id=m.subject_id WHERE m.exam_id=? AND m.student_id=? ORDER BY j.name', exam.id, st.id));
  const res = await classResults(exam.id, st.section_id, u.school_id, exam.total_marks);
  const me = res.find(r => r.id === st.id);
  const att = {};
  for (const a of await db.all('SELECT status, COUNT(*) AS n FROM attendance WHERE student_id=? AND school_id=? GROUP BY status', st.id, u.school_id)) att[a.status] = Number(a.n);
  const remark = (await db.get('SELECT remark FROM exam_remarks WHERE exam_id=? AND student_id=?', exam.id, st.id))?.remark || '';
  return (
    <>
      <div className="noprint acts-top"><PrintButton /><Link href={u.role === 'parent' ? `/dashboard/my/results?child=${st.id}` : `/dashboard/exams/${exam.id}?section=${st.section_id}`}>Back to results</Link></div>
      <ReportCard school={u.school_name} logo={logoUrl(u)} exam={exam} st={st} rows={rows} me={me} ranked={res.filter(r => r.n).length} att={att} remark={remark} />
    </>
  );
}
