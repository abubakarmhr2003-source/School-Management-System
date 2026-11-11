import db from './db';

// Admin can use every section. A teacher only sections (and subjects) assigned to them.
export async function canTeach(u, sectionId, subjectId = null) {
  if (u.role === 'admin') return true;
  if (u.role !== 'teacher') return false;
  const sql = `SELECT 1 FROM assignments a JOIN teacher_users t ON t.teacher_id=a.teacher_id WHERE t.user_id=? AND a.school_id=? AND a.section_id=?${subjectId ? ' AND a.subject_id=?' : ''}`;
  return !!(await db.get(sql, ...(subjectId ? [u.id, u.school_id, sectionId, subjectId] : [u.id, u.school_id, sectionId])));
}

// Keeps only the sections this user may work with (one query, not one per section).
export async function filterTeachable(u, sections) {
  if (u.role === 'admin') return sections;
  if (u.role !== 'teacher') return [];
  const rows = await db.all('SELECT DISTINCT a.section_id FROM assignments a JOIN teacher_users t ON t.teacher_id=a.teacher_id WHERE t.user_id=? AND a.school_id=?', u.id, u.school_id);
  const ok = new Set(rows.map(r => r.section_id));
  return sections.filter(s => ok.has(s.id));
}

// Subjects of one section that this user may enter marks for.
export async function filterTeachableSubjects(u, sectionId, subjects) {
  if (u.role === 'admin') return subjects;
  if (u.role !== 'teacher') return [];
  const rows = await db.all('SELECT a.subject_id FROM assignments a JOIN teacher_users t ON t.teacher_id=a.teacher_id WHERE t.user_id=? AND a.school_id=? AND a.section_id=?', u.id, u.school_id, sectionId);
  const ok = new Set(rows.map(r => r.subject_id));
  return subjects.filter(s => ok.has(s.id));
}

export const myChildren = u => db.all("SELECT st.id,st.name,st.roll_no,st.section_id,c.name||' – '||s.name AS cls FROM parent_students p JOIN students st ON st.id=p.student_id JOIN sections s ON s.id=st.section_id JOIN classes c ON c.id=st.class_id WHERE p.user_id=? AND st.school_id=? ORDER BY st.name", u.id, u.school_id);

export const isMyChild = async (u, studentId) =>
  !!(await db.get('SELECT 1 FROM parent_students p JOIN students st ON st.id=p.student_id WHERE p.user_id=? AND p.student_id=? AND st.school_id=?', u.id, studentId, u.school_id));
