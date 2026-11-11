'use client';
export default function ErrorPage({ reset }) {
  return (
    <main className="auth">
      <div className="card" style={{ textAlign: 'center' }}>
        <h1>Something went wrong</h1>
        <p className="muted">We could not load this page. Please try again in a moment.</p>
        <button type="button" onClick={() => reset()}>Try again</button>
      </div>
    </main>
  );
}
