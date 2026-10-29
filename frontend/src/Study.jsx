import { useEffect, useState } from 'react';
import { api } from './api.js';
import { DocSelect, download, speak, stopSpeaking, toCsv } from './ui.jsx';

export default function Study({ docs, practice, clearPractice }) {
  const [docId, setDocId] = useState('');
  const [kind, setKind] = useState('summary');
  const [topic, setTopic] = useState('');
  const [count, setCount] = useState(5);
  const [result, setResult] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [banner, setBanner] = useState(null);

  const run = async ({ docId, kind, topic, topics, count }) => {
    if (!docId) return setError('Choose a document first');
    setBusy(true);
    setError('');
    setResult(null);
    try {
      setResult({ ...(await api.generate({ docId, kind, topic: topic || undefined, topics, count })), docId });
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  // Weak-topic practice started from the Dashboard or Progress tab.
  useEffect(() => {
    if (!practice) return;
    setBanner(practice.topics);
    setDocId(practice.docId);
    setKind('quiz');
    run({ docId: practice.docId, kind: 'quiz', topics: practice.topics, count: 5 });
    clearPractice();
  }, [practice]);
  useEffect(() => stopSpeaking, []);

  const submit = (e) => {
    e.preventDefault();
    setBanner(null);
    run({ docId, kind, topic: topic.trim(), count });
  };

  return (
    <section>
      <h2>Study tools</h2>
      {banner && <p className="banner">Practising weak topics: {banner.join(', ')}</p>}
      <form onSubmit={submit} className="stack">
        <DocSelect docs={docs} value={docId} onChange={setDocId} />
        <select value={kind} onChange={(e) => setKind(e.target.value)}>
          <option value="summary">Summary</option>
          <option value="flashcards">Flashcards</option>
          <option value="quiz">Multiple-choice quiz</option>
          <option value="short">Written answers (AI graded)</option>
        </select>
        <input placeholder="Topic (optional)" value={topic} onChange={(e) => setTopic(e.target.value)} />
        {kind !== 'summary' && (
          <label>Number of items: <input type="number" min="1" max="15" value={count} onChange={(e) => setCount(+e.target.value)} /></label>
        )}
        <button disabled={busy}>{busy ? 'Generating...' : 'Generate'}</button>
      </form>
      {error && <p className="error">{error}</p>}
      {result?.kind === 'summary' && (
        <>
          <div className="row">
            <button className="secondary" onClick={() => speak(result.summary)}>Listen</button>
            <button className="secondary" onClick={stopSpeaking}>Stop</button>
            <button className="secondary" onClick={() => download('summary.txt', result.summary)}>Download</button>
          </div>
          <pre className="summary">{result.summary}</pre>
        </>
      )}
      {result?.kind === 'flashcards' && <Flashcards cards={result.items} docId={result.docId} />}
      {result?.kind === 'quiz' && <Quiz questions={result.items} docId={result.docId} />}
      {result?.kind === 'short' && <ShortAnswer questions={result.items} docId={result.docId} />}
    </section>
  );
}

function Flashcards({ cards, docId }) {
  const [flipped, setFlipped] = useState({});
  const [msg, setMsg] = useState('');

  const save = async () => {
    try {
      const r = await api.saveCards({ docId, cards });
      setMsg(`${r.saved} cards added to your review deck.`);
    } catch (err) {
      setMsg(err.message);
    }
  };

  return (
    <>
      <div className="row wrap">
        <button onClick={save}>Save to review deck</button>
        <button className="secondary" onClick={() => download('flashcards.csv', toCsv([['Front', 'Back', 'Topic'], ...cards.map((c) => [c.front, c.back, c.topic])]), 'text/csv')}>
          Download CSV
        </button>
        {msg && <span className="muted">{msg}</span>}
      </div>
      <div className="cards">
        {cards.map((c, i) => (
          <div key={i} className="flash" onClick={() => setFlipped({ ...flipped, [i]: !flipped[i] })}>
            {flipped[i] ? c.back : c.front}
            <small>{flipped[i] ? 'Answer' : `${c.topic} - tap to flip`}</small>
          </div>
        ))}
      </div>
    </>
  );
}

function Quiz({ questions, docId }) {
  const [picked, setPicked] = useState({});
  const [done, setDone] = useState(false);
  const [saved, setSaved] = useState('');
  const score = questions.filter((q, i) => picked[i] === q.answer_index).length;

  const breakdown = () => {
    const map = {};
    questions.forEach((q, i) => {
      map[q.topic] = map[q.topic] || { topic: q.topic, correct: 0, total: 0 };
      map[q.topic].total += 1;
      if (picked[i] === q.answer_index) map[q.topic].correct += 1;
    });
    return Object.values(map);
  };

  const submit = async () => {
    setDone(true);
    try {
      await api.saveAttempt({ docId, score, total: questions.length, breakdown: breakdown() });
      setSaved('Result saved to your progress.');
    } catch (err) {
      setSaved(err.message);
    }
  };

  return (
    <div className="quiz">
      {questions.map((q, i) => (
        <div key={i} className="q">
          <p><b>{i + 1}. {q.question}</b> <small className="muted">[{q.topic}]</small></p>
          {q.options.map((o, j) => {
            let cls = '';
            if (done) cls = j === q.answer_index ? 'right' : picked[i] === j ? 'wrong' : '';
            return (
              <label key={j} className={cls}>
                <input type="radio" name={`q${i}`} disabled={done} checked={picked[i] === j}
                  onChange={() => setPicked({ ...picked, [i]: j })} /> {o}
              </label>
            );
          })}
          {done && <small className="muted">{q.explanation}</small>}
        </div>
      ))}
      {!done ? (
        <button onClick={submit} disabled={Object.keys(picked).length < questions.length}>Submit quiz</button>
      ) : (
        <div>
          <p><b>Score: {score} / {questions.length}</b> <span className="muted">{saved}</span></p>
          {breakdown().map((b) => <p key={b.topic} className="muted">{b.topic}: {b.correct} / {b.total}</p>)}
        </div>
      )}
    </div>
  );
}

function ShortAnswer({ questions, docId }) {
  const [answers, setAnswers] = useState({});
  const [results, setResults] = useState({});
  const [busy, setBusy] = useState(-1);
  const [error, setError] = useState('');

  const check = async (i) => {
    setBusy(i);
    setError('');
    try {
      const r = await api.evaluate({ docId, question: questions[i].question, answer: answers[i] || '' });
      setResults({ ...results, [i]: r });
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(-1);
    }
  };

  return (
    <div className="quiz">
      {error && <p className="error">{error}</p>}
      {questions.map((q, i) => {
        const r = results[i];
        return (
          <div key={i} className="q">
            <p><b>{i + 1}. {q.question}</b> <small className="muted">[{q.topic}]</small></p>
            <textarea rows="3" placeholder="Write your answer" value={answers[i] || ''}
              onChange={(e) => setAnswers({ ...answers, [i]: e.target.value })} />
            <button onClick={() => check(i)} disabled={busy === i}>{busy === i ? 'Checking...' : 'Check my answer'}</button>
            {r && (
              <div className="result">
                <p><b>Score: {r.score} / 10</b></p>
                <p>{r.feedback}</p>
                {r.missing_points.length > 0 && (
                  <><p><b>You missed:</b></p><ul>{r.missing_points.map((m, k) => <li key={k}>{m}</li>)}</ul></>
                )}
                <details><summary>Model answer</summary><p>{r.model_answer}</p></details>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
