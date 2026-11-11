'use client';
import { useEffect } from 'react';
// Adds a data-label to every table cell so tables can turn into cards on phones.
// Without JavaScript the tables simply scroll sideways.
const ROLES = { TABLE: 'table', THEAD: 'rowgroup', TBODY: 'rowgroup', TR: 'row', TH: 'columnheader', TD: 'cell' };
function enhance() {
  document.querySelectorAll('table').forEach(t => {
    if (!t.dataset.e) {
      t.dataset.e = '1';
      if (t.querySelector('tbody th[scope="row"]')) t.classList.add('tg');
      else if (!t.closest('.rc') && t.querySelector('thead th')) {
        t.classList.add('rt');
        t.setAttribute('role', 'table');
        t.querySelectorAll('thead, tbody, tr, th').forEach(el => el.setAttribute('role', ROLES[el.tagName]));
      }
    }
    if (!t.classList.contains('rt')) return;
    const heads = [...t.querySelectorAll('thead th')].map(h => h.textContent.trim());
    t.querySelectorAll('tbody td:not([data-label])').forEach(td => {
      td.dataset.label = heads[[...td.parentElement.children].indexOf(td)] || '';
      td.setAttribute('role', 'cell');
    });
    t.querySelectorAll('tbody tr:not([role])').forEach(tr => tr.setAttribute('role', 'row'));
  });
}
export default function TableLabels() {
  useEffect(() => {
    let raf = 0;
    const run = () => { cancelAnimationFrame(raf); raf = requestAnimationFrame(enhance); };
    run();
    const mo = new MutationObserver(run);
    mo.observe(document.body, { childList: true, subtree: true });
    return () => { mo.disconnect(); cancelAnimationFrame(raf); };
  }, []);
  return null;
}
