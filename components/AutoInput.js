'use client';
import { useRef } from 'react';
// A date/month input that submits its form shortly after a valid value is picked.
export default function AutoInput(props) {
  const timer = useRef(null);
  return <input {...props} onChange={e => {
    const el = e.currentTarget;
    clearTimeout(timer.current);
    timer.current = setTimeout(() => { if (el.value && el.checkValidity()) el.form?.requestSubmit(); }, 700);
  }} />;
}
