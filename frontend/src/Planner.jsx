import { useEffect, useRef, useState } from 'react';
import { api } from './api.js';
import { DocSelect } from './ui.jsx';

export default function Planner({ docs }) {
  const [tasks, setTasks] = useState([]);
  const [title, setTitle] = useState('');
  const [due, setDue] = useState('');
  const [error, setError] = useState('');
  const [planDoc, setPlanDoc] = useState('');
  const [days, setDays] = useState(5);
  const [planning, setPlanning] = useState(false);

  const load = () => api.tasks()
    .then((items) => { setTasks(items); setError(''); })
    .catch((e) => setError(e.message));
  useEffect(() => { load(); }, []);

  const add = async (e) => {
    e.preventDefault();
    setError('');
    try {
      await api.addTask({ title, due: due || undefined });
      setTitle('');
      setDue('');
      load();
    } catch (err) { setError(err.message); }
  };

  const toggle = async (task) => {
    setError('');
    try {
      await api.toggleTask(task._id, !task.done);
      load();
    } catch (err) { setError(err.message); }
  };

  const remove = async (id) => {
    setError('');
    try {
      await api.deleteTask(id);
      load();
    } catch (err) { setError(err.message); }
  };

  const makePlan = async (e) => {
    e.preventDefault();
    if (!planDoc) return setError('Choose a document for the plan');
    setPlanning(true);
    setError('');
    try {
      await api.plan({ docId: planDoc, days });
      load();
    } catch (err) { setError(err.message); } finally { setPlanning(false); }
  };

  return (
    <section>
      <h2>Study planner</h2>
      <Pomodoro />

      <h3>Make a revision plan with AI</h3>
      <form onSubmit={makePlan} className="row wrap">
        <DocSelect docs={docs} value={planDoc} onChange={setPlanDoc} />
        <label>Days: <input type="number" min="2" max="30" value={days} onChange={(e) => setDays(+e.target.value)} /></label>
        <button disabled={planning}>{planning ? 'Planning...' : 'Create plan'}</button>
      </form>

      <h3>My tasks</h3>
      <form onSubmit={add} className="row">
        <input placeholder="e.g. Revise Unit 3" value={title} onChange={(e) => setTitle(e.target.value)} required />
        <input type="date" value={due} onChange={(e) => setDue(e.target.value)} />
        <button>Add</button>
      </form>
      {error && <p className="error">{error}</p>}
      <ul className="list">
        {tasks.map((t) => (
          <li key={t._id}>
            <label className={t.done ? 'done' : ''}>
              <input type="checkbox" checked={t.done} onChange={() => toggle(t)} />
              {' '}{t.title} {t.due && <small className="muted">({new Date(t.due).toLocaleDateString()})</small>}
            </label>
            <button className="link danger" onClick={() => remove(t._id)}>Remove</button>
          </li>
        ))}
      </ul>
    </section>
  );
}

function Pomodoro() {
  const FOCUS = 25 * 60, BREAK = 5 * 60;
  const [phase, setPhase] = useState('focus');
  const [left, setLeft] = useState(FOCUS);
  const [running, setRunning] = useState(false);
  const [rounds, setRounds] = useState(0);
  const phaseRef = useRef(phase);
  phaseRef.current = phase;

  useEffect(() => {
    if (!running) return undefined;
    const id = setInterval(() => {
      setLeft((s) => {
        if (s > 1) return s - 1;
        const next = phaseRef.current === 'focus' ? 'break' : 'focus';
        if (phaseRef.current === 'focus') setRounds((r) => r + 1);
        setPhase(next);
        return next === 'focus' ? FOCUS : BREAK;
      });
    }, 1000);
    return () => clearInterval(id);
  }, [running]);

  const reset = () => { setRunning(false); setPhase('focus'); setLeft(FOCUS); };
  const mm = String(Math.floor(left / 60)).padStart(2, '0');
  const ss = String(left % 60).padStart(2, '0');

  return (
    <div className="card pomodoro">
      <b>{phase === 'focus' ? 'Focus time' : 'Break time'}</b>
      <span className="clock">{mm}:{ss}</span>
      <div className="row">
        <button onClick={() => setRunning(!running)}>{running ? 'Pause' : 'Start'}</button>
        <button className="secondary" onClick={reset}>Reset</button>
      </div>
      <small className="muted">Focus sessions completed: {rounds}</small>
    </div>
  );
}
