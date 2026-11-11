'use client';
import { useRef, useState } from 'react';
// Picture picker: shrinks the chosen picture in the browser so it stays small, then sends it with the form as a
// hidden field (default name "photo"; "<name>_remove" is set when the person removes the current one).
// Student photos: JPEG, max 360px. Logos (logo prop): PNG when small enough (keeps transparency), else JPEG, max 300px.
export default function PhotoInput({ current = null, name = 'photo', logo = false }) {
  const MAX = logo ? 300 : 360;
  const noun = logo ? 'logo' : 'photo';
  const [src, setSrc] = useState(current);
  const [data, setData] = useState('');
  const [removed, setRemoved] = useState(false);
  const [err, setErr] = useState('');
  const file = useRef(null);
  function pick(e) {
    const f = e.target.files?.[0];
    setErr('');
    if (!f) return;
    if (!f.type.startsWith('image/')) { setErr('Please choose a picture.'); return; }
    const url = URL.createObjectURL(f);
    const img = new Image();
    img.onload = () => {
      const k = Math.min(1, MAX / Math.max(img.width, img.height));
      const c = document.createElement('canvas');
      c.width = Math.round(img.width * k); c.height = Math.round(img.height * k);
      const x = c.getContext('2d');
      if (!logo) { x.fillStyle = '#fff'; x.fillRect(0, 0, c.width, c.height); }
      x.drawImage(img, 0, 0, c.width, c.height);
      let out = logo ? c.toDataURL('image/png') : '';
      if (!out || out.length > 150000) { if (logo) { x.fillStyle = '#fff'; x.fillRect(0, 0, c.width, c.height); x.drawImage(img, 0, 0, c.width, c.height); } out = c.toDataURL('image/jpeg', 0.85); }
      URL.revokeObjectURL(url);
      setData(out); setSrc(out); setRemoved(false);
    };
    img.onerror = () => { URL.revokeObjectURL(url); setErr('This picture could not be read. Try a JPG or PNG.'); };
    img.src = url;
  }
  function remove() { setData(''); setSrc(null); setRemoved(true); if (file.current) file.current.value = ''; }
  return (
    <div className="photo-input">
      <div className={logo ? 'photo-box logo' : 'photo-box'}>
        {src ? <img src={src} alt={logo ? 'School logo' : 'Student photo'} /> : <span className="muted">No {noun}</span>}
      </div>
      <div className="photo-acts">
        <label className="photo-pick">{src ? `Change ${noun}` : `Choose ${noun}`}<input ref={file} type="file" accept="image/*" onChange={pick} /></label>
        {src && <button type="button" className="ghost" onClick={remove}>Remove</button>}
        {err && <p className="err" role="alert">{err}</p>}
      </div>
      <input type="hidden" name={name} value={data} />
      <input type="hidden" name={name + '_remove'} value={removed && !data ? '1' : ''} />
    </div>
  );
}
