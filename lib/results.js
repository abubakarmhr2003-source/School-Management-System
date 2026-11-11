import db from './db';
// Grade scale: change here to match your school.
export const grade = p => p >= 90 ? 'A+' : p >= 80 ? 'A' : p >= 70 ? 'B' : p >= 60 ? 'C' : p >= 50 ? 'D' : p >= 40 ? 'E' : 'F';
export async function classResults(examId, sectionId, schoolId, perSubject) {
  const rows = await db.all('SELECT st.id,st.name,st.roll_no,COALESCE(SUM(m.obtained),0) AS got,COUNT(m.id) AS n FROM students st LEFT JOIN marks m ON m.student_id=st.id AND m.exam_id=? WHERE st.section_id=? AND st.school_id=? GROUP BY st.id ORDER BY public.roll_sort(st.roll_no),st.name', examId, sectionId, schoolId);
  for (const r of rows) {
    r.out = r.n * perSubject;
    r.pct = r.n ? Math.round((r.got / r.out) * 1000) / 10 : null;
    r.grade = r.n ? grade(r.pct) : '–';
  }
  for (const r of rows) r.pos = r.n ? 1 + rows.filter(o => o.n && o.pct > r.pct).length : null;
  return rows;
}
