import AutoSelect from './AutoSelect';
export default function ChildPicker({ kids, child }) {
  if (kids.length < 2) return null;
  return (
    <section className="card">
      <form method="get" className="form">
        <label>Child<AutoSelect name="child" defaultValue={child.id}>{kids.map(k => <option key={k.id} value={k.id}>{k.name} · {k.cls}</option>)}</AutoSelect></label>
        <noscript><button className="ghost">Show</button></noscript>
      </form>
    </section>
  );
}
