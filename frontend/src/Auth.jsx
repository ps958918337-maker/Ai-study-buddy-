import { useState } from 'react';
import { api } from './api.js';

export default function Auth({ onAuth }) {
  const [mode, setMode] = useState('login');
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      onAuth(await (mode === 'login' ? api.login(form) : api.register(form)));
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="auth">
      <form onSubmit={submit} className="card">
        <div className="auth-brand"><span className="brand-mark">✦</span><b>AI Study Buddy</b></div>
        <p className="eyebrow">YOUR PERSONAL LEARNING SPACE</p>
        <h1>{mode === 'login' ? 'Welcome back' : 'Find your focus'}</h1>
        <p className="muted">{mode === 'login' ? 'Pick up where your curiosity left off.' : 'Create an account and make your notes work harder.'}</p>
        {mode === 'register' && <input placeholder="Full name" aria-label="Full name" value={form.name} onChange={set('name')} required />}
        <input type="email" placeholder="Email" aria-label="Email" value={form.email} onChange={set('email')} required />
        <input type="password" placeholder="Password (min 6 characters)" aria-label="Password" value={form.password} onChange={set('password')} minLength={6} required />
        {error && <p className="error">{error}</p>}
        <button className="auth-submit" disabled={busy}>{busy ? 'Please wait...' : mode === 'login' ? 'Log in' : 'Create account'} <span>→</span></button>
        <button type="button" className="link" onClick={() => setMode(mode === 'login' ? 'register' : 'login')}>
          {mode === 'login' ? 'New here? Create an account' : 'Have an account? Log in'}
        </button>
      </form>
    </div>
  );
}
