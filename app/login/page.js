import Link from 'next/link';
import AuthForm from '@/components/AuthForm';
export default function Page() {
  return <AuthForm action="login" title="Sign in" button="Sign in"
    fields={[{ name: 'email', label: 'Email', type: 'email', ac: 'username' }, { name: 'password', label: 'Password', type: 'password', ac: 'current-password' }]}
    note={<>New here? <Link href="/">Create a school</Link></>} />;
}
