import { useEffect, useState } from 'react';
import { api, getToken } from './api.js';
import Auth from './Auth.jsx';
import Dashboard from './Dashboard.jsx';
import Library from './Library.jsx';
import Chat from './Chat.jsx';
import Study from './Study.jsx';
import Review from './Review.jsx';
import Progress from './Progress.jsx';
import Planner from './Planner.jsx';

const TABS = [
  { label: 'Dashboard', icon: '⌂' },
  { label: 'Library', icon: '▤' },
  { label: 'Chat', icon: '◌' },
  { label: 'Study', icon: '✦' },
  { label: 'Review', icon: '↻' },
  { label: 'Progress', icon: '↗' },
  { label: 'Planner', icon: '▦' },
];

function getStoredUser() {
  try {
    return JSON.parse(localStorage.getItem('user') || 'null');
  } catch (error) {
    if (error instanceof SyntaxError) return null;
    throw error;
  }
}

export default function App() {
  const [loggedIn, setLoggedIn] = useState(!!getToken());
  const [user, setUser] = useState(getStoredUser);
  const [tab, setTab] = useState('Dashboard');
  const [docs, setDocs] = useState([]);
  const [docsError, setDocsError] = useState('');
  const [practice, setPractice] = useState(null);
  const [dark, setDark] = useState(() => localStorage.getItem('theme') !== 'light');

  useEffect(() => {
    document.documentElement.dataset.theme = dark ? 'dark' : 'light';
    localStorage.setItem('theme', dark ? 'dark' : 'light');
  }, [dark]);

  const loadDocs = () => api.docs()
    .then((items) => { setDocs(items); setDocsError(''); })
    .catch((error) => setDocsError(error.message));
  useEffect(() => { if (loggedIn) loadDocs(); }, [loggedIn]);

  const onAuth = ({ token, user }) => {
    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify(user));
    setUser(user);
    setLoggedIn(true);
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setLoggedIn(false);
    setDocs([]);
    setDocsError('');
    setPractice(null);
    setTab('Dashboard');
  };

  const startPractice = (docId, topics) => {
    setPractice({ docId, topics });
    setTab('Study');
  };

  if (!loggedIn) return <Auth onAuth={onAuth} />;

  const initials = user?.name
    ? user.name.trim().split(/\s+/).slice(0, 2).map((part) => part[0]).join('').toUpperCase()
    : 'S';
  const today = new Intl.DateTimeFormat(undefined, { weekday: 'long', month: 'long', day: 'numeric' }).format(new Date());

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <a className="brand" href="#" onClick={(event) => { event.preventDefault(); setTab('Dashboard'); }}>
          <span className="brand-mark">✦</span>
          <span><b>AI Study Buddy</b><small>YOUR STUDY SPACE</small></span>
        </a>
        <p className="nav-label">WORKSPACE</p>
        <nav className="app-nav" aria-label="Main navigation">
          {TABS.map(({ label, icon }) => (
            <button key={label} className={label === tab ? 'active' : ''} onClick={() => setTab(label)} aria-current={label === tab ? 'page' : undefined}>
              <span className="nav-icon" aria-hidden="true">{icon}</span>{label}
            </button>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <div className="sidebar-tip">
            <span className="tip-icon">✧</span>
            <b>Little by little</b>
            <p>Small study sessions add up to big progress.</p>
            <button className="tip-link" onClick={() => setTab('Planner')}>Start a focus session <span>→</span></button>
          </div>
          <div className="profile-row">
            <span className="avatar">{initials}</span>
            <span className="profile-name"><b>{user?.name || 'Student'}</b><small>Personal workspace</small></span>
            <button className="logout-button" onClick={logout} aria-label="Log out" title="Log out">↗</button>
          </div>
        </div>
      </aside>
      <div className="workspace">
        <header className="topbar">
          <div className="mobile-brand"><span className="brand-mark">✦</span><b>AI Study Buddy</b></div>
          <div className="breadcrumbs"><span>Workspace</span><span className="crumb-divider">/</span><b>{tab}</b></div>
          <div className="topbar-actions">
            <span className="today-label">{today}</span>
            <button className="theme-button" onClick={() => setDark(!dark)} aria-label={`Switch to ${dark ? 'light' : 'dark'} theme`} title={`Switch to ${dark ? 'light' : 'dark'} theme`}>
              {dark ? '☼' : '☾'}
            </button>
            <span className="avatar top-avatar">{initials}</span>
          </div>
        </header>
        <main className="page-content">
          {docsError && <div className="notice error-notice" role="alert">Could not load your library: {docsError}</div>}
          {tab === 'Dashboard' && <Dashboard go={setTab} onPractice={startPractice} userName={user?.name || 'there'} />}
          {tab === 'Library' && <Library docs={docs} reload={loadDocs} />}
          {tab === 'Chat' && <Chat docs={docs} />}
          {tab === 'Study' && <Study docs={docs} practice={practice} clearPractice={() => setPractice(null)} />}
          {tab === 'Review' && <Review />}
          {tab === 'Progress' && <Progress onPractice={startPractice} />}
          {tab === 'Planner' && <Planner docs={docs} />}
        </main>
      </div>
    </div>
  );
}
