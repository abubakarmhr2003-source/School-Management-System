'use server';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import db, { isDuplicate } from './db';
import { sendMail, appUrl } from './notify';
import { requireUser } from './auth';
import { canTeach } from './access';
import { parseSheet, importRows } from './import';
import { schoolCode, hashPassword } from './util';

const txt = (fd, k) => String(fd.get(k) || '').trim();
// The driver turns arrays/objects into JSON itself for ?::jsonb parameters, so they are passed as they are.
const json = rows => rows;
// Student photo: only a small JPEG data URL made by components/PhotoInput is accepted (it is shown in <img src>, so nothing else may get through).
const cleanPhoto = v => { v = String(v || ''); return v.length <= 200000 && /^data:image\/jpeg;base64,[A-Za-z0-9+/]+={0,2}$/.test(v) ? v : null; };
const own = (table, id, schoolId) => db.get(`SELECT id FROM ${table} WHERE id=? AND school_id=?`, id, schoolId);
// Runs a write that may break a UNIQUE rule; a duplicate counts as "nothing changed" instead of an error.
const orDuplicate = async fn => { try { return await fn(); } catch (e) { if (isDuplicate(e)) return { changes: 0 }; throw e; } };
const karachiToday = () => new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Karachi' });

export async function addClass(fd) {
  const u = await requireUser(['admin']);
  const name = txt(fd, 'name');
  if (!name) return;
  const sections = (txt(fd, 'sections') || 'A').split(',').map(s => s.trim()).filter(Boolean);
  await db.tx(async t => {
    const c = await t.get('INSERT INTO classes (school_id,name) VALUES (?,?) ON CONFLICT (school_id,name) DO UPDATE SET name=EXCLUDED.name RETURNING id', u.school_id, name);
    await t.run('INSERT INTO sections (school_id,class_id,name) SELECT ?::int, ?::int, value FROM jsonb_array_elements_text(?::jsonb) ON CONFLICT (class_id,name) DO NOTHING', u.school_id, c.id, json(sections));
  });
  revalidatePath('/dashboard/classes');
}

const cleanLogo = v => { v = String(v || ''); return v.length <= 200000 && /^data:image\/(png|jpeg);base64,[A-Za-z0-9+/]+={0,2}$/.test(v) ? v : null; };
export async function saveLogo(fd) {
  const u = await requireUser(['admin']);
  const logo = cleanLogo(fd.get('logo'));
  if (logo) await db.run('UPDATE schools SET logo=? WHERE id=?', logo, u.school_id);
  else if (txt(fd, 'logo_remove')) await db.run('UPDATE schools SET logo=NULL WHERE id=?', u.school_id);
  else redirect('/dashboard/settings?error=1');
  revalidatePath('/dashboard', 'layout');
  redirect('/dashboard/settings?saved=1');
}
export async function addStudent(fd) {
  const u = await requireUser(['admin']);
  const sec = await db.get('SELECT id,class_id FROM sections WHERE id=? AND school_id=?', txt(fd, 'section'), u.school_id);
  const name = txt(fd, 'name');
  if (!sec || !name) return;
  await db.run('INSERT INTO students (school_id,class_id,section_id,roll_no,name,father_name,phone,photo) VALUES (?,?,?,?,?,?,?,?)',
    u.school_id, sec.class_id, sec.id, txt(fd, 'roll'), name, txt(fd, 'father'), txt(fd, 'phone'), cleanPhoto(fd.get('photo')));
  revalidatePath('/dashboard/students');
}

export async function removeStudent(fd) {
  const u = await requireUser(['admin']);
  await db.run('DELETE FROM students WHERE id=? AND school_id=?', txt(fd, 'id'), u.school_id);
  revalidatePath('/dashboard/students');
}

export async function addSubject(fd) {
  const u = await requireUser(['admin']);
  const name = txt(fd, 'name');
  if (!name) return;
  await db.run('INSERT INTO subjects (school_id,name) VALUES (?,?) ON CONFLICT (school_id,name) DO NOTHING', u.school_id, name);
  revalidatePath('/dashboard/subjects');
}

export async function addTeacher(fd) {
  const u = await requireUser(['admin']);
  const name = txt(fd, 'name');
  if (!name) return;
  await db.run('INSERT INTO teachers (school_id,name,phone,qualification) VALUES (?,?,?,?)', u.school_id, name, txt(fd, 'phone'), txt(fd, 'qualification'));
  revalidatePath('/dashboard/teachers');
}

export async function removeTeacher(fd) {
  const u = await requireUser(['admin']);
  const t = await own('teachers', txt(fd, 'id'), u.school_id);
  if (!t) return;
  await db.tx(async tx => {
    await tx.run('DELETE FROM users WHERE id IN (SELECT user_id FROM teacher_users WHERE teacher_id=?)', t.id);
    await tx.run('DELETE FROM teachers WHERE id=?', t.id);
  });
  revalidatePath('/dashboard/teachers');
}

export async function assignTeacher(fd) {
  const u = await requireUser(['admin']);
  const [t, s, j] = await Promise.all([
    own('teachers', txt(fd, 'teacher'), u.school_id),
    own('sections', txt(fd, 'section'), u.school_id),
    own('subjects', txt(fd, 'subject'), u.school_id),
  ]);
  if (!t || !s || !j) return;
  await db.run('INSERT INTO assignments (school_id,teacher_id,section_id,subject_id) VALUES (?,?,?,?) ON CONFLICT (section_id,subject_id) DO UPDATE SET teacher_id=EXCLUDED.teacher_id',
    u.school_id, t.id, s.id, j.id);
  revalidatePath('/dashboard/teachers');
}

export async function removeAssignment(fd) {
  const u = await requireUser(['admin']);
  await db.run('DELETE FROM assignments WHERE id=? AND school_id=?', txt(fd, 'id'), u.school_id);
  revalidatePath('/dashboard/teachers');
}

export async function saveAttendance(fd) {
  const u = await requireUser(['admin', 'teacher']);
  const date = txt(fd, 'date');
  const section = txt(fd, 'section');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !(await canTeach(u, section))) return;
  const students = await db.all('SELECT id FROM students WHERE section_id=? AND school_id=?', section, u.school_id);
  const rows = students.map(s => { const v = txt(fd, 's_' + s.id); return { student_id: s.id, status: ['P', 'A', 'L'].includes(v) ? v : 'P' }; });
  if (rows.length) {
    await db.run('INSERT INTO attendance (school_id,student_id,date,status) SELECT ?::int, x.student_id, ?::text, x.status FROM jsonb_to_recordset(?::jsonb) AS x(student_id int, status text) ON CONFLICT (student_id,date) DO UPDATE SET status=EXCLUDED.status',
      u.school_id, date, json(rows));
  }
  revalidatePath('/dashboard/attendance');
  redirect(`/dashboard/attendance?section=${encodeURIComponent(section)}&date=${date}&saved=1`);
}

export async function addExam(fd) {
  const u = await requireUser(['admin']);
  const name = txt(fd, 'name');
  const total = Math.min(1000, Math.max(1, parseInt(txt(fd, 'total'), 10) || 100));
  if (!name) return;
  await db.run('INSERT INTO exams (school_id,name,total_marks) VALUES (?,?,?) ON CONFLICT (school_id,name) DO NOTHING', u.school_id, name, total);
  revalidatePath('/dashboard/exams');
}

export async function saveRemarks(fd) {
  const u = await requireUser(['admin', 'teacher']);
  const exam = await db.get('SELECT id FROM exams WHERE id=? AND school_id=?', txt(fd, 'exam'), u.school_id);
  const section = txt(fd, 'section');
  if (!exam || !(await canTeach(u, section))) return;
  const students = await db.all('SELECT id FROM students WHERE section_id=? AND school_id=?', section, u.school_id);
  const save = [], clear = [];
  for (const s of students) {
    const r = txt(fd, 'r_' + s.id).replace(/\s+/g, ' ').slice(0, 200);
    if (r) save.push({ student_id: s.id, remark: r }); else clear.push(s.id);
  }
  await db.tx(async t => {
    if (clear.length) await t.run('DELETE FROM exam_remarks WHERE exam_id=? AND student_id IN (SELECT value::int FROM jsonb_array_elements_text(?::jsonb))', exam.id, json(clear));
    if (save.length) await t.run('INSERT INTO exam_remarks (school_id,exam_id,student_id,remark) SELECT ?::int, ?::int, x.student_id, x.remark FROM jsonb_to_recordset(?::jsonb) AS x(student_id int, remark text) ON CONFLICT (exam_id, student_id) DO UPDATE SET remark=EXCLUDED.remark',
      u.school_id, exam.id, json(save));
  });
  revalidatePath(`/dashboard/exams/${exam.id}`);
  const sub = txt(fd, 'subject');
  redirect(`/dashboard/exams/${exam.id}?section=${encodeURIComponent(section)}${sub ? '&subject=' + encodeURIComponent(sub) : ''}&remarks=1`);
}

export async function saveMarks(fd) {
  const u = await requireUser(['admin', 'teacher']);
  const exam = await db.get('SELECT id,total_marks FROM exams WHERE id=? AND school_id=?', txt(fd, 'exam'), u.school_id);
  const subject = await db.get('SELECT id FROM subjects WHERE id=? AND school_id=?', txt(fd, 'subject'), u.school_id);
  const section = txt(fd, 'section');
  if (!exam || !subject || !(await canTeach(u, section, subject.id))) return;
  const students = await db.all('SELECT id FROM students WHERE section_id=? AND school_id=?', section, u.school_id);
  const save = [], clear = [];
  for (const s of students) {
    const raw = txt(fd, 'm_' + s.id);
    const v = Number(raw);
    if (raw === '') clear.push(s.id);
    else if (Number.isFinite(v) && v >= 0 && v <= exam.total_marks) save.push({ student_id: s.id, obtained: v });
  }
  await db.tx(async t => {
    if (clear.length) await t.run('DELETE FROM marks WHERE exam_id=? AND subject_id=? AND student_id IN (SELECT value::int FROM jsonb_array_elements_text(?::jsonb))', exam.id, subject.id, json(clear));
    if (save.length) await t.run('INSERT INTO marks (school_id,exam_id,student_id,subject_id,obtained) SELECT ?::int, ?::int, x.student_id, ?::int, x.obtained FROM jsonb_to_recordset(?::jsonb) AS x(student_id int, obtained numeric) ON CONFLICT (exam_id,student_id,subject_id) DO UPDATE SET obtained=EXCLUDED.obtained',
      u.school_id, exam.id, subject.id, json(save));
  });
  revalidatePath(`/dashboard/exams/${exam.id}`);
  redirect(`/dashboard/exams/${exam.id}?section=${encodeURIComponent(section)}&subject=${subject.id}&saved=1`);
}

export async function createSchool(fd) {
  const school = txt(fd, 'school');
  const person = txt(fd, 'name') || 'Admin';
  const email = txt(fd, 'email').toLowerCase();
  const password = String(fd.get('password') || '');
  if (!school || !email.includes('@')) return;
  if (password.length < 8) redirect('/?error=password');
  const hash = await hashPassword(password);
  let failed = false, schoolId;
  try {
    schoolId = await db.tx(async t => {
      const sid = await t.insert("INSERT INTO schools (name, code, status) VALUES (?,?,'pending')", school, schoolCode());
      await t.run("INSERT INTO users (school_id,name,email,password_hash,role,status) VALUES (?,?,?,?,'admin','active')", sid, person, email, hash);
      return sid;
    });
    await db.createSchoolTables(schoolId); // this school's own tables
  } catch (e) {
    if (!isDuplicate(e)) throw e;
    failed = true;
  }
  if (failed) redirect('/?error=email');
  await sendMail(process.env.SUPERADMIN_EMAIL, `New school request: ${school}`, `${person} (${email}) created the school "${school}" and is waiting for your approval.\n\nReview it here: ${appUrl()}/platform`);
  redirect('/?created=1');
}

export async function saveFees(fd) {
  const u = await requireUser(['admin', 'accountant']);
  const classes = await db.all('SELECT id FROM classes WHERE school_id=?', u.school_id);
  const rows = classes.map(c => ({ class_id: c.id, fee: Math.min(10000000, Math.max(0, Number(txt(fd, 'fee_' + c.id)) || 0)) }));
  if (rows.length) {
    await db.run('INSERT INTO class_fees (class_id,school_id,monthly_fee) SELECT x.class_id, ?::int, x.fee FROM jsonb_to_recordset(?::jsonb) AS x(class_id int, fee numeric) ON CONFLICT (class_id) DO UPDATE SET monthly_fee=EXCLUDED.monthly_fee',
      u.school_id, json(rows));
  }
  revalidatePath('/dashboard/fees');
}

export async function generateVouchers(fd) {
  const u = await requireUser(['admin', 'accountant']);
  const month = txt(fd, 'month');
  if (!/^\d{4}-\d{2}$/.test(month)) return;
  const cls = txt(fd, 'class');
  const r = await db.run(`INSERT INTO vouchers (school_id,student_id,month,amount) SELECT st.school_id, st.id, ?::text, cf.monthly_fee FROM students st JOIN class_fees cf ON cf.class_id=st.class_id WHERE st.school_id=? AND cf.monthly_fee>0 ${cls ? 'AND st.class_id=?' : ''} ON CONFLICT (student_id,month) DO NOTHING`,
    ...(cls ? [month, u.school_id, cls] : [month, u.school_id]));
  redirect(`/dashboard/fees?month=${month}&generated=${r.changes}`);
}

export async function recordPayment(fd) {
  const u = await requireUser(['admin', 'accountant']);
  const amt = Number(txt(fd, 'amount'));
  if (!(amt > 0) || amt > 10000000) return;
  const voucherId = await db.tx(async t => {
    // Lock the voucher row so two people paying at the same moment cannot overpay it.
    const v = await t.get('SELECT v.id, v.amount-COALESCE((SELECT SUM(amount) FROM payments WHERE voucher_id=v.id),0) AS due FROM vouchers v WHERE v.id=? AND v.school_id=? FOR UPDATE', txt(fd, 'voucher'), u.school_id);
    if (!v || amt > v.due) return null;
    await t.run('INSERT INTO payments (school_id,voucher_id,amount,paid_on) VALUES (?,?,?,?)', u.school_id, v.id, amt, karachiToday());
    return v.id;
  });
  if (!voucherId) return;
  revalidatePath('/dashboard/fees');
  revalidatePath(`/dashboard/fees/voucher/${voucherId}`);
}

export async function saveTimetable(fd) {
  const u = await requireUser(['admin']);
  const sec = await db.get('SELECT id FROM sections WHERE id=? AND school_id=?', txt(fd, 'section'), u.school_id);
  if (!sec) return;
  const subs = new Set((await db.all('SELECT id FROM subjects WHERE school_id=?', u.school_id)).map(s => String(s.id)));
  const cells = [];
  for (let d = 1; d <= 6; d++) for (let p = 1; p <= 8; p++) {
    const v = txt(fd, `c_${d}_${p}`);
    if (subs.has(v)) cells.push({ day: d, period: p, subject_id: Number(v) });
  }
  await db.tx(async t => {
    await t.run('DELETE FROM timetable WHERE section_id=?', sec.id);
    if (cells.length) await t.run('INSERT INTO timetable (school_id,section_id,day,period,subject_id) SELECT ?::int, ?::int, x.day, x.period, x.subject_id FROM jsonb_to_recordset(?::jsonb) AS x(day int, period int, subject_id int)', u.school_id, sec.id, json(cells));
  });
  redirect(`/dashboard/timetable?section=${sec.id}&saved=1`);
}

export async function addAnnouncement(fd) {
  const u = await requireUser(['admin']);
  const title = txt(fd, 'title');
  if (!title) return;
  await db.run('INSERT INTO announcements (school_id,title,body,posted_on) VALUES (?,?,?,?)', u.school_id, title, txt(fd, 'body'), karachiToday());
  revalidatePath('/dashboard/announcements');
}

export async function removeAnnouncement(fd) {
  const u = await requireUser(['admin']);
  await db.run('DELETE FROM announcements WHERE id=? AND school_id=?', txt(fd, 'id'), u.school_id);
  revalidatePath('/dashboard/announcements');
}

export async function updateStudent(fd) {
  const u = await requireUser(['admin']);
  const st = await own('students', txt(fd, 'id'), u.school_id);
  const sec = await db.get('SELECT id,class_id FROM sections WHERE id=? AND school_id=?', txt(fd, 'section'), u.school_id);
  const name = txt(fd, 'name');
  if (!st || !sec || !name) return;
  await db.run('UPDATE students SET name=?,father_name=?,phone=?,roll_no=?,class_id=?,section_id=? WHERE id=?',
    name, txt(fd, 'father'), txt(fd, 'phone'), txt(fd, 'roll'), sec.class_id, sec.id, st.id);
  const photo = cleanPhoto(fd.get('photo'));
  if (photo) await db.run('UPDATE students SET photo=? WHERE id=?', photo, st.id);
  else if (txt(fd, 'photo_remove')) await db.run('UPDATE students SET photo=NULL WHERE id=?', st.id);
  redirect('/dashboard/students');
}

export async function updateTeacher(fd) {
  const u = await requireUser(['admin']);
  const t = await own('teachers', txt(fd, 'id'), u.school_id);
  const name = txt(fd, 'name');
  if (!t || !name) return;
  await db.run('UPDATE teachers SET name=?,phone=?,qualification=? WHERE id=?', name, txt(fd, 'phone'), txt(fd, 'qualification'), t.id);
  redirect('/dashboard/teachers');
}

export async function renameClass(fd) {
  const u = await requireUser(['admin']);
  const name = txt(fd, 'name');
  if (!name) return;
  const r = await orDuplicate(() => db.run('UPDATE classes SET name=? WHERE id=? AND school_id=?', name, txt(fd, 'id'), u.school_id));
  redirect('/dashboard/classes' + (r.changes ? '' : '?error=dup'));
}

export async function addSection(fd) {
  const u = await requireUser(['admin']);
  const c = await own('classes', txt(fd, 'class'), u.school_id);
  const name = txt(fd, 'name');
  if (!c || !name) return;
  const r = await db.run('INSERT INTO sections (school_id,class_id,name) VALUES (?,?,?) ON CONFLICT (class_id,name) DO NOTHING', u.school_id, c.id, name);
  redirect('/dashboard/classes' + (r.changes ? '' : '?error=dupsec'));
}

export async function removeSection(fd) {
  const u = await requireUser(['admin']);
  const s = await own('sections', txt(fd, 'id'), u.school_id);
  if (!s) return;
  if ((await db.get('SELECT COUNT(*) AS n FROM students WHERE section_id=?', s.id)).n) redirect('/dashboard/classes?error=students');
  await db.tx(async t => {
    await t.run('DELETE FROM assignments WHERE section_id=?', s.id);
    await t.run('DELETE FROM timetable WHERE section_id=?', s.id);
    await t.run('DELETE FROM sections WHERE id=?', s.id);
  });
  redirect('/dashboard/classes');
}

export async function removeClass(fd) {
  const u = await requireUser(['admin']);
  const c = await own('classes', txt(fd, 'id'), u.school_id);
  if (!c) return;
  if ((await db.get('SELECT COUNT(*) AS n FROM students WHERE class_id=?', c.id)).n) redirect('/dashboard/classes?error=students');
  await db.tx(async t => {
    await t.run('DELETE FROM assignments WHERE section_id IN (SELECT id FROM sections WHERE class_id=?)', c.id);
    await t.run('DELETE FROM timetable WHERE section_id IN (SELECT id FROM sections WHERE class_id=?)', c.id);
    await t.run('DELETE FROM sections WHERE class_id=?', c.id);
    await t.run('DELETE FROM classes WHERE id=?', c.id);
  });
  redirect('/dashboard/classes');
}

export async function renameSubject(fd) {
  const u = await requireUser(['admin']);
  const name = txt(fd, 'name');
  if (!name) return;
  const r = await orDuplicate(() => db.run('UPDATE subjects SET name=? WHERE id=? AND school_id=?', name, txt(fd, 'id'), u.school_id));
  redirect('/dashboard/subjects' + (r.changes ? '' : '?error=dup'));
}

export async function removeSubject(fd) {
  const u = await requireUser(['admin']);
  const s = await own('subjects', txt(fd, 'id'), u.school_id);
  if (!s) return;
  if ((await db.get('SELECT COUNT(*) AS n FROM marks WHERE subject_id=?', s.id)).n) redirect('/dashboard/subjects?error=marks');
  await db.tx(async t => {
    await t.run('DELETE FROM assignments WHERE subject_id=?', s.id);
    await t.run('DELETE FROM timetable WHERE subject_id=?', s.id);
    await t.run('DELETE FROM subjects WHERE id=?', s.id);
  });
  redirect('/dashboard/subjects');
}

export async function createTeacherLogin(fd) {
  const u = await requireUser(['admin']);
  const t = await db.get('SELECT id,name FROM teachers WHERE id=? AND school_id=?', txt(fd, 'id'), u.school_id);
  if (!t) return;
  const back = `/dashboard/teachers/${t.id}`;
  const email = txt(fd, 'email').toLowerCase();
  const password = String(fd.get('password') || '');
  if (!email.includes('@') || password.length < 8) redirect(back + '?error=invalid');
  const hash = await hashPassword(password);
  let failed = false;
  try {
    await db.tx(async tx => {
      const uid = await tx.insert("INSERT INTO users (school_id,name,email,password_hash,role,status) VALUES (?,?,?,?,'teacher','active')", u.school_id, t.name, email, hash);
      await tx.run('INSERT INTO teacher_users (teacher_id,user_id) VALUES (?,?)', t.id, uid);
    });
  } catch (e) {
    if (!isDuplicate(e)) throw e;
    failed = true;
  }
  redirect(back + (failed ? '?error=email' : '?saved=1'));
}

export async function createParentLogin(fd) {
  const u = await requireUser(['admin']);
  const st = await own('students', txt(fd, 'id'), u.school_id);
  if (!st) return;
  const back = `/dashboard/students/${st.id}`;
  const email = txt(fd, 'email').toLowerCase();
  const name = txt(fd, 'name');
  const password = String(fd.get('password') || '');
  if (!email.includes('@')) redirect(back + '?error=invalid');
  const ex = await db.get('SELECT id,role,school_id FROM users WHERE email=?', email);
  let uid;
  if (ex) {
    if (ex.role !== 'parent' || ex.school_id !== u.school_id) redirect(back + '?error=email');
    uid = ex.id;
  } else {
    if (!name || password.length < 8) redirect(back + '?error=invalid');
    const hash = await hashPassword(password);
    try {
      uid = await db.insert("INSERT INTO users (school_id,name,email,password_hash,role,status) VALUES (?,?,?,?,'parent','active')", u.school_id, name, email, hash);
    } catch (e) {
      if (!isDuplicate(e)) throw e;
    }
    if (!uid) redirect(back + '?error=email');
  }
  await db.run('INSERT INTO parent_students (user_id,student_id) VALUES (?,?) ON CONFLICT DO NOTHING', uid, st.id);
  redirect(back + '?saved=1');
}

export async function unlinkParent(fd) {
  const u = await requireUser(['admin']);
  const st = await own('students', txt(fd, 'id'), u.school_id);
  const p = await db.get("SELECT id FROM users WHERE id=? AND school_id=? AND role='parent'", txt(fd, 'user'), u.school_id);
  if (!st || !p) return;
  await db.run('DELETE FROM parent_students WHERE user_id=? AND student_id=?', p.id, st.id);
  redirect(`/dashboard/students/${st.id}`);
}

export async function resetLoginPassword(fd) {
  const u = await requireUser(['admin']);
  const target = await db.get("SELECT id FROM users WHERE id=? AND school_id=? AND role IN ('teacher','parent','accountant')", txt(fd, 'user'), u.school_id);
  const back = txt(fd, 'back');
  const password = String(fd.get('password') || '');
  if (!target || !back.startsWith('/dashboard/') || back.startsWith('//')) return;
  if (password.length < 8) redirect(back + '?error=invalid');
  await db.run('UPDATE users SET password_hash=? WHERE id=?', await hashPassword(password), target.id);
  redirect(back + '?saved=1');
}

export async function createAccountant(fd) {
  const u = await requireUser(['admin']);
  const name = txt(fd, 'name');
  const email = txt(fd, 'email').toLowerCase();
  const password = String(fd.get('password') || '');
  if (!name || !email.includes('@') || password.length < 8) redirect('/dashboard/staff?error=invalid');
  const hash = await hashPassword(password);
  const r = await orDuplicate(() => db.run("INSERT INTO users (school_id,name,email,password_hash,role,status) VALUES (?,?,?,?,'accountant','active')", u.school_id, name, email, hash));
  redirect(r.changes ? '/dashboard/staff?saved=1' : '/dashboard/staff?error=email');
}

export async function removeAccountant(fd) {
  const u = await requireUser(['admin']);
  await db.run("DELETE FROM users WHERE id=? AND school_id=? AND role='accountant'", txt(fd, 'id'), u.school_id);
  redirect('/dashboard/staff');
}

export async function importStudents(fd) {
  const u = await requireUser(['admin']);
  const file = fd.get('file');
  const to = '/dashboard/students/import';
  if (!file || !file.size) redirect(to + '?error=nofile');
  if (file.size > 2000000) redirect(to + '?error=big');
  let rows = null;
  try { rows = await parseSheet(file); } catch { rows = null; }
  if (!rows) redirect(to + '?error=read');
  const r = await importRows(u.school_id, rows);
  if (r.error) redirect(`${to}?error=${r.error}`);
  revalidatePath('/dashboard/students');
  redirect(`${to}?added=${r.added}&skipped=${r.skipped}&notes=${encodeURIComponent(r.notes.slice(0, 8).join('|'))}`);
}
