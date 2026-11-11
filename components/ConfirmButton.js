'use client';
export default function ConfirmButton({ message, children, ...props }) {
  return <button {...props} onClick={e => { if (!window.confirm(message)) e.preventDefault(); }}>{children}</button>;
}
