import { useRef, useState } from 'react';
import { api } from './api.js';

export default function Library({ docs, reload }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const fileRef = useRef();

  const upload = async (e) => {
    e.preventDefault();
    const file = fileRef.current.files[0];
    if (!file) return setError('Please choose a file');
    const fd = new FormData();
    fd.append('file', file);
    setBusy(true);
    setError('');
    try {
      await api.upload(fd);
      fileRef.current.value = '';
      reload();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const remove = async (id) => {
    if (!window.confirm('Delete this document and its flashcards and quiz history?')) return;
    try { await api.deleteDoc(id); reload(); } catch (err) { setError(err.message); }
  };

  return (
    <section>
      <h2>My notes</h2>
      <form onSubmit={upload} className="row">
        <input type="file" accept=".pdf,.txt,.md" ref={fileRef} />
        <button disabled={busy}>{busy ? 'Processing...' : 'Upload'}</button>
      </form>
      {error && <p className="error">{error}</p>}
      {docs.length === 0 && <p className="muted">No notes yet. Upload a PDF or text file to begin.</p>}
      <ul className="list">
        {docs.map((d) => (
          <li key={d._id}>
            <span>{d.name} <small className="muted">({d.chunks} sections)</small></span>
            <button className="link danger" onClick={() => remove(d._id)}>Delete</button>
          </li>
        ))}
      </ul>
    </section>
  );
}
