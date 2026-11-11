'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
export default function AuthForm({ action, title, fields, button, note }) {
  const [err, setErr] = useState('');
  const [msg, setMsg] = useState('');
  const [busy, setBusy] = useState(false);
  const router = useRouter();
  async function submit(e) {
    e.preventDefault(); setErr(''); setMsg(''); setBusy(true);
    const data = Object.fromEntries(new FormData(e.target));
    const r = await fetch('/api/auth/' + action, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
    const j = await r.json(); setBusy(false);
    if (!r.ok) return setErr(j.error);
    j.to ? router.push(j.to) : setMsg(j.message);
  }
  return (
    <main className="auth">
      <form className="card" onSubmit={submit}>
        <h1>{title}</h1>
        {fields.map(f => (
          <label key={f.name}>{f.label}
            {f.options
              ? <select name={f.name}>{f.options.map(o => <option key={o[0]} value={o[0]}>{o[1]}</option>)}</select>
              : <input name={f.name} type={f.type || 'text'} autoComplete={f.ac} required />}
          </label>
        ))}
        {err && <p className="err" role="alert">{err}</p>}
        {msg && <p className="okmsg" role="status">{msg}</p>}
        <button disabled={busy}>{busy ? 'Please wait…' : button}</button>
        <p className="note">{note}</p>
      </form>
    </main>
  );
}
