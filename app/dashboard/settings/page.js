import { requireUser, logoUrl } from '@/lib/auth';
import { saveLogo } from '@/lib/actions';
import PhotoInput from '@/components/PhotoInput';
export default async function Page(props) {
  const searchParams = await props.searchParams;
  const u = await requireUser(['admin']);
  return (
    <>
      <header><h1>School settings</h1><p className="muted">{u.school_name}</p></header>
      <section className="card">
        <h2>School logo</h2>
        <p className="muted">Shown on report cards, fee vouchers and the menu. A square or wide picture on a white or transparent background works best.</p>
        {searchParams.saved && <p className="okmsg" role="status">Saved.</p>}
        {searchParams.error && <p className="err" role="alert">Choose a picture first, then press Save.</p>}
        <form action={saveLogo} className="form">
          <PhotoInput name="logo" logo current={logoUrl(u)} />
          <button>Save logo</button>
        </form>
      </section>
    </>
  );
}
