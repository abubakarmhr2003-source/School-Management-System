'use client';
export default function PrintButton({ label = 'Print report card' }) {
  return <button onClick={() => window.print()}>{label}</button>;
}
