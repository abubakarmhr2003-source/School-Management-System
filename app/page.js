import Link from 'next/link';
import { createSchool } from '@/lib/actions';
const ERRORS = { email: 'This email is already used for another school.', password: 'Password must be at least 8 characters.' };
export default async function Home(props) {
  const searchParams = await props.searchParams;
  return (
    <main className="auth">
      <div className="home">
        <section className="card">
          <h1>Create a school</h1>
          {searchParams.created && <p className="okmsg" role="status">School created. The platform owner has been asked to approve it. You will get an email when it is approved, and then you can sign in with your email and password.</p>}
          {ERRORS[searchParams.error] && <p className="err" role="alert">{ERRORS[searchParams.error]}</p>}
          <form action={createSchool} className="stack">
            <label>School name<input name="school" required /></label>
            <label>Your name<input name="name" autoComplete="name" /></label>
            <label>Your email<input name="email" type="email" autoComplete="username" required /></label>
            <label>Password (8+ characters)<input name="password" type="password" autoComplete="new-password" minLength={8} required /></label>
            <button>Create school</button>
          </form>
        </section>
        <p className="note">Already have an approved school? <Link href="/login">Sign in</Link></p>
      </div>
    </main>
  );
}
