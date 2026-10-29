import { useEffect, useState } from 'react';
import { api } from './api.js';
import { TrendChart } from './ui.jsx';

export default function Progress({ onPractice }) {
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  useEffect(() => { api.progress().then(setData).catch((e) => setError(e.message)); }, []);

  if (error) return <p className="error">{error}</p>;
  if (!data) return <p className="muted">Loading...</p>;

  return (
    <section>
      <h2>Your progress</h2>
      {data.totalAttempts === 0 && <p className="muted">Take a quiz in the Study tab to see your progress here.</p>}

      <h3>Score trend</h3>
      <TrendChart points={data.trend} />

      <h3>Weak topics</h3>
      {data.weakTopics.length === 0 && <p className="muted">None right now. Keep going!</p>}
      {data.weakTopics.map((t) => (
        <div key={`${t.docId}${t.topic}`} className="card">
          <div className="row between">
            <span><b>{t.topic}</b> <small className="muted">({t.docName})</small></span>
            <button onClick={() => onPractice(t.docId, [t.topic])}>Practice</button>
          </div>
          <div className="bar"><div className="fill weak" style={{ width: `${t.percent}%` }} /></div>
          <small className="muted">{t.correct} of {t.total} correct ({t.percent}%)</small>
        </div>
      ))}

      {data.strongTopics.length > 0 && (
        <>
          <h3>Strong topics</h3>
          <p>{data.strongTopics.map((t) => `${t.topic} (${t.percent}%)`).join(', ')}</p>
        </>
      )}

      <h3>By document</h3>
      {data.topics.map((t) => (
        <div key={t.docId} className="card">
          <p><b>{t.docName}</b> {t.weak && <span className="tag">Needs work</span>}</p>
          <div className="bar"><div style={{ width: `${t.average}%` }} className={t.weak ? 'fill weak' : 'fill'} /></div>
          <small className="muted">Average {t.average}% over {t.attempts} attempt(s)</small>
        </div>
      ))}
    </section>
  );
}
