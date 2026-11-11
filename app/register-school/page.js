import Link from 'next/link';
import AuthForm from '@/components/AuthForm';
export default function Page() {
  return <AuthForm action="register-school" title="Register your school" button="Register school"
    fields={[{ name: 'school', label: 'School name' }, { name: 'name', label: 'Your name', ac: 'name' }, { name: 'email', label: 'Email', type: 'email', ac: 'username' }, { name: 'password', label: 'Password (8+ characters)', type: 'password', ac: 'new-password' }]}
    note={<>Already registered? <Link href="/login">Sign in</Link></>} />;
}
