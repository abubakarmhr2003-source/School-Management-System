'use client';
import { useRouter } from 'next/navigation';
export default function LogoutButton({ className, label = 'Sign out' }) {
  const r = useRouter();
  const out = async () => {
    await fetch('/api/auth/logout', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' });
    r.push('/login');
  };
  return <button className={className} onClick={out}>{label}</button>;
}
