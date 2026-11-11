'use client';
import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import NavLink from './NavLink';
import LogoutButton from './LogoutButton';
export default function SideNav({ school, items, logo = null }) {
  const [open, setOpen] = useState(false);
  const path = usePathname();
  useEffect(() => { setOpen(false); }, [path]);
  useEffect(() => {
    document.body.classList.toggle('lock', open);
    const onKey = e => { if (e.key === 'Escape') setOpen(false); };
    window.addEventListener('keydown', onKey);
    return () => { window.removeEventListener('keydown', onKey); document.body.classList.remove('lock'); };
  }, [open]);
  return (
    <>
      <header className="topbar">
        <button type="button" className="burger" aria-label="Open menu" aria-expanded={open} aria-controls="side-nav" onClick={() => setOpen(true)}>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><path d="M4 6h16M4 12h16M4 18h16" /></svg>
        </button>
        <b>{school}</b>
      </header>
      {open && <div className="scrim" onClick={() => setOpen(false)} aria-hidden="true" />}
      <nav id="side-nav" className={open ? 'side open' : 'side'} aria-label="Main">
        <button type="button" className="close" aria-label="Close menu" onClick={() => setOpen(false)}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" /></svg>
        </button>
        <div className="brand">{/* eslint-disable-next-line @next/next/no-img-element */}{logo && <img src={logo} alt="" className="brand-logo" />}<b>{school}</b><span>School Management</span></div>
        {items.map(([label, href]) => <NavLink key={href} href={href}>{label}</NavLink>)}
        <LogoutButton className="ghost" />
      </nav>
    </>
  );
}
