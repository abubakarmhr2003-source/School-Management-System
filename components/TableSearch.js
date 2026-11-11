'use client';
import { useRef, useState } from 'react';
// Search box that filters the rows of the table in the same card. Rows are hidden, not removed,
// so forms (attendance, marks) still submit every student.
export default function TableSearch({ placeholder = 'Search…' }) {
  const box = useRef(null);
  const [info, setInfo] = useState(null);
  function run(q) {
    const table = box.current?.closest('section')?.querySelector('table');
    if (!table) return;
    const terms = q.toLowerCase().split(/\s+/).filter(Boolean);
    const heads = [...table.querySelectorAll('thead th')].map(h => h.textContent.trim());
    const rows = [...table.querySelectorAll('tbody tr')];
    let shown = 0;
    rows.forEach(tr => {
      const text = [...tr.children]
        .filter((td, i) => heads[i] && !td.querySelector('input,select,button,textarea'))
        .map(td => td.textContent).join(' ').toLowerCase();
      const ok = terms.every(t => text.includes(t));
      tr.hidden = !ok;
      if (ok) shown++;
    });
    setInfo(terms.length ? { shown, total: rows.length } : null);
  }
  return (
    <>
      <div className="searchbar">
        <input ref={box} type="search" placeholder={placeholder} aria-label="Search this list" autoComplete="off"
          onChange={e => run(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') e.preventDefault(); }} />
        {info && <span className="muted" role="status">{info.shown} of {info.total}</span>}
      </div>
      {info && info.shown === 0 && <p className="muted">No matches.</p>}
    </>
  );
}
