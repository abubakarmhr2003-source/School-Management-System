'use client';
// A dropdown that submits its form as soon as the choice changes.
export default function AutoSelect({ children, ...props }) {
  return <select {...props} onChange={e => e.currentTarget.form?.requestSubmit()}>{children}</select>;
}
