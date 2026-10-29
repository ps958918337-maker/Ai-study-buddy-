import { useEffect, useState } from 'react';
import { api } from './api.js';
import { TrendChart } from './ui.jsx';

export default function Dashboard({ go, onPractice, userName }) {
  const [s, setS] = useState(null);
  const [error, setError] = useState('');
  useEffect(() => { api.stats().then(setS).catch((e) => setError(e.message)); }, []);

  if (error) return <p className="error">{error}</p>;
  if (!s) return <p className="muted">Loading...</p>;

  const firstName = userName.trim().split(/\s+/)[0];

  return (
    <section className="dashboard">
      <div className="welcome-row">
        <div>
          <p className="eyebrow"><span className="live-dot" /> YOUR LEARNING, IN ORBIT</p>
          <h1>Good to see you, {firstName}<span className="title-spark"> ✦</span></h1>
          <p className="welcome-copy">A little progress each day adds up. Ready for your next study session?</p>
        </div>
        <button className="primary-action" onClick={() => go(s.docs ? 'Study' : 'Library')}>
          <span>{s.docs ? 'Start studying' : 'Add your first notes'}</span><span aria-hidden="true">→</span>
        </button>
      </div>

      <div className="tiles">
        <div className="tile stat-tile">
          <span className="stat-icon violet">✦</span><span className="stat-label">Study streak</span>
          <b>{s.streak}<small> days</small></b><span className="stat-foot">{s.streak ? 'You’re building a habit!' : 'Start a streak today'}</span>
        </div>
        <div className="tile stat-tile">
          <span className="stat-icon mint">↗</span><span className="stat-label">Average score</span>
          <b>{s.averageScore === null ? '—' : `${s.averageScore}%`}</b><span className="stat-foot">{s.quizzesTaken ? `Across ${s.quizzesTaken} quiz${s.quizzesTaken === 1 ? '' : 'zes'}` : 'Take a quiz to track progress'}</span>
        </div>
        <div className="tile stat-tile">
          <span className="stat-icon blue">▤</span><span className="stat-label">Your library</span>
          <b>{s.docs}</b><span className="stat-foot">{s.docs === 1 ? 'study document' : 'study documents'}</span>
        </div>
        <div className="tile stat-tile">
          <span className="stat-icon amber">↻</span><span className="stat-label">Cards due</span>
          <b>{s.cardsDue}</b><span className="stat-foot">{s.cardsDue ? 'Ready when you are' : 'You’re all caught up'}</span>
        </div>
      </div>

      {s.docs === 0 && (
        <div className="empty-library card">
          <div className="empty-art"><span>▤</span><i>✦</i><i>✧</i></div>
          <div><p className="eyebrow">YOUR FIRST STEP</p><h2>Bring your notes to life</h2><p className="muted">Upload a PDF or text file to create grounded chats, quick quizzes, and flashcards from the material you’re studying.</p></div>
          <button className="primary-action" onClick={() => go('Library')}>Open your library <span>→</span></button>
        </div>
      )}

      {s.cardsDue > 0 && (
        <div className="review-banner">
          <span className="review-banner-icon">↻</span>
          <span><b>Your memory is ready for a refresh</b><small>{s.cardsDue} flashcard{s.cardsDue === 1 ? '' : 's'} are due for review</small></span>
          <button className="secondary" onClick={() => go('Review')}>Review cards <span>→</span></button>
        </div>
      )}

      <div className="dashboard-grid">
        <div className="panel progress-panel">
          <div className="section-heading">
            <div><p className="eyebrow">THE BIG PICTURE</p><h2>Your progress</h2></div>
            <button className="text-action" onClick={() => go('Progress')}>View details <span>→</span></button>
          </div>
          <TrendChart points={s.trend} />
          <div className="chart-caption"><span><i className="legend-dot" /> Quiz scores</span><span>{s.quizzesTaken} quiz{s.quizzesTaken === 1 ? '' : 'zes'} completed</span></div>
        </div>

        <div className="panel focus-panel">
          <div className="section-heading">
            <div><p className="eyebrow">A SMART NEXT STEP</p><h2>Focus areas</h2></div>
            <span className="focus-count">{s.weakTopics.length}</span>
          </div>
          {s.weakTopics.length === 0 ? (
            <div className="focus-empty"><span>✧</span><p>{s.quizzesTaken ? 'Looking good! No weak topics yet.' : 'Your focus areas will appear after your first quiz.'}</p><button className="text-action" onClick={() => go(s.docs ? 'Study' : 'Library')}>{s.docs ? 'Take a quick quiz' : 'Add study notes'} →</button></div>
          ) : (
            <div className="focus-list">
              {s.weakTopics.slice(0, 3).map((t) => (
                <div key={`${t.docId}${t.topic}`} className="focus-item">
                  <span className="focus-topic-icon">↗</span>
                  <span className="focus-topic"><b>{t.topic}</b><small>{t.docName} · {t.percent}% mastery</small></span>
                  <button className="icon-action" onClick={() => onPractice(t.docId, [t.topic])} aria-label={`Practice ${t.topic}`} title={`Practice ${t.topic}`}>→</button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="section-heading quick-heading">
        <div><p className="eyebrow">PICK UP WHERE YOU WANT</p><h2>Quick actions</h2></div>
      </div>
      <div className="quick-grid">
        <button className="quick-card" onClick={() => go('Chat')}><span className="quick-icon violet">◌</span><span><b>Ask your notes</b><small>Get answers with sources</small></span><span className="quick-arrow">↗</span></button>
        <button className="quick-card" onClick={() => go('Study')}><span className="quick-icon mint">✦</span><span><b>Make study tools</b><small>Quizzes, cards & summaries</small></span><span className="quick-arrow">↗</span></button>
        <button className="quick-card" onClick={() => go('Planner')}><span className="quick-icon amber">◷</span><span><b>Plan a focus session</b><small>Turn goals into a routine</small></span><span className="quick-arrow">↗</span></button>
      </div>
    </section>
  );
}
