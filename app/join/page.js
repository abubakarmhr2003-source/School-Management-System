import Link from 'next/link';
import AuthForm from '@/components/AuthForm';
export default function Page() {
  return <AuthForm action="join" title="Join your school" button="Send request"
    fields={[{ name: 'code', label: 'School code' }, { name: 'role', label: 'Your role', options: [['teacher', 'Teacher'], ['accountant', 'Accountant']] }, { name: 'name', label: 'Your name', ac: 'name' }, { name: 'email', label: 'Email', type: 'email', ac: 'username' }, { name: 'password', label: 'Password (8+ characters)', type: 'password', ac: 'new-password' }]}
    note={<>Already approved? <Link href="/login">Sign in</Link></>} />;
}
