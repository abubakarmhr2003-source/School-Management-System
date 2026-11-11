import readXlsxFile from 'read-excel-file/node';
import db from './db';

const HEAD = { name: /^(student\s*)?name$/i, father: /father|guardian/i, phone: /phone|mobile|contact/i, roll: /roll/i, cls: /^class$/i, section: /section/i };
const classKey = s => s.toLowerCase().replace(/^class\s*/, '').trim();

function parseCsv(text) {
  const rows = []; let row = [], cur = '', q = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (q) { if (ch === '"') { if (text[i + 1] === '"') { cur += '"'; i++; } else q = false; } else cur += ch; }
    else if (ch === '"') q = true;
    else if (ch === ',') { row.push(cur); cur = ''; }
    else if (ch === '\n' || ch === '\r') { if (ch === '\r' && text[i + 1] === '\n') i++; row.push(cur); rows.push(row); row = []; cur = ''; }
    else cur += ch;
  }
  if (cur !== '' || row.length) { row.push(cur); rows.push(row); }
  return rows;
}

export async function parseSheet(file) {
  const buf = Buffer.from(await file.arrayBuffer());
  if (/\.csv$/i.test(file.name || '')) return parseCsv(buf.toString('utf8').replace(/^\uFEFF/, ''));
  return readXlsxFile(buf);
}

export async function importRows(schoolId, rows) {
  const head = (rows[0] || []).map(h => String(h ?? '').trim());
  const col = {};
  for (const [k, re] of Object.entries(HEAD)) col[k] = head.findIndex(h => re.test(h));
  if (col.name < 0 || col.cls < 0 || rows.length > 2001) return { error: rows.length > 2001 ? 'big' : 'columns' };
  const cell = (r, k) => { const v = col[k] < 0 ? '' : r[col[k]]; return v == null ? '' : String(v).trim(); };
  let added = 0, skipped = 0;
  const notes = [];
  await db.tx(async t => {
    const classes = new Map((await t.all('SELECT id,name FROM classes WHERE school_id=?', schoolId)).map(c => [classKey(c.name), c.id]));
    const sections = new Map((await t.all('SELECT id,class_id,name FROM sections WHERE school_id=?', schoolId)).map(s => [s.class_id + '|' + s.name.toLowerCase(), s.id]));
    // Everyone already in the school (and everyone added earlier in this file) so duplicates are skipped without a query per row.
    const seen = new Set((await t.all("SELECT section_id, lower(name) AS n, lower(COALESCE(father_name,'')) AS f FROM students WHERE school_id=?", schoolId)).map(r => `${r.section_id}|${r.n}|${r.f}`));
    const fresh = [];
    for (const [i, r] of rows.slice(1).entries()) {
      const line = i + 2;
      if (!r || r.every(c => c == null || String(c).trim() === '')) continue;
      const name = cell(r, 'name'), clsName = cell(r, 'cls'), secName = cell(r, 'section') || 'A';
      if (!name || !clsName) { skipped++; notes.push(`Row ${line}: name or class is missing`); continue; }
      let cid = classes.get(classKey(clsName));
      if (!cid) {
        cid = (await t.get('INSERT INTO classes (school_id,name) VALUES (?,?) ON CONFLICT (school_id,name) DO UPDATE SET name=EXCLUDED.name RETURNING id', schoolId, clsName)).id;
        classes.set(classKey(clsName), cid);
      }
      let sid = sections.get(cid + '|' + secName.toLowerCase());
      if (!sid) {
        sid = (await t.get('INSERT INTO sections (school_id,class_id,name) VALUES (?,?,?) ON CONFLICT (class_id,name) DO UPDATE SET name=EXCLUDED.name RETURNING id', schoolId, cid, secName)).id;
        sections.set(cid + '|' + secName.toLowerCase(), sid);
      }
      const father = cell(r, 'father');
      const key = `${sid}|${name.toLowerCase()}|${father.toLowerCase()}`;
      if (seen.has(key)) { skipped++; notes.push(`Row ${line}: ${name} is already in this class`); continue; }
      seen.add(key);
      let phone = cell(r, 'phone');
      if (/^3\d{9}$/.test(phone)) phone = '0' + phone;
      fresh.push({ class_id: cid, section_id: sid, roll_no: cell(r, 'roll'), name, father_name: father, phone });
      added++;
    }
    for (let i = 0; i < fresh.length; i += 500) {
      await t.run('INSERT INTO students (school_id,class_id,section_id,roll_no,name,father_name,phone) SELECT ?::int, x.class_id, x.section_id, x.roll_no, x.name, x.father_name, x.phone FROM jsonb_to_recordset(?::jsonb) AS x(class_id int, section_id int, roll_no text, name text, father_name text, phone text)', schoolId, fresh.slice(i, i + 500));
    }
  });
  return { added, skipped, notes };
}
