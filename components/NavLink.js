'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
export default function NavLink({ href, children }) {
  const path = usePathname();
  const on = path === href || (href !== '/dashboard' && path.startsWith(href + '/'));
  return <Link href={href} className={on ? 'nav on' : 'nav'} aria-current={on ? 'page' : undefined}>{children}</Link>;
}
