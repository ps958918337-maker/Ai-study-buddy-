import { useEffect, useRef, useState } from 'react';
import { api } from './api.js';
import { DocSelect, listenOnce, speak, stopSpeaking } from './ui.jsx';

const MODES = [
  ['standard', 'Standard'],
  ['simple', 'Explain simply'],
  ['exam', 'Exam answer'],
];

export default function Chat({ docs }) {
  const [docId, setDocId] = useState('');
  const [mode, setMode] = useState('standard');
  const [question, setQuestion] = useState('');
  const [messages, setMessages] = useState([]);
  const [busy, setBusy] = useState(false);
  const [listening, setListening] = useState(false);
  const [notice, setNotice] = useState('');
  const [historyLoading, setHistoryLoading] = useState(true);
  const endRef = useRef();

  useEffect(() => {
    api.chatHistory()
      .then((items) => setMessages(items.flatMap((i) => [
        { role: 'user', text: i.question },
        { role: 'ai', text: i.answer, sources: i.sources, grounded: i.grounded },
      ])))
      .catch((error) => setNotice(`Could not load chat history: ${error.message}`))
      .finally(() => setHistoryLoading(false));
    return stopSpeaking;
  }, []);
  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  const send = async (e) => {
    e.preventDefault();
    const q = question.trim();
    if (!q || busy) return;
    setMessages((m) => [...m, { role: 'user', text: q }]);
    setQuestion('');
    setBusy(true);
    try {
      const r = await api.chat({ question: q, docId: docId || undefined, mode });
      setMessages((m) => [...m, { role: 'ai', text: r.answer, sources: r.sources, grounded: r.grounded }]);
    } catch (err) {
      setMessages((m) => [...m, { role: 'ai', text: err.message, error: true }]);
    } finally {
      setBusy(false);
    }
  };

  const mic = () => {
    setNotice('');
    setListening(true);
    const rec = listenOnce(
      (text) => { setQuestion(text); setListening(false); },
      (msg) => { setNotice(msg); setListening(false); },
    );
    if (!rec) setListening(false);
    else rec.onend = () => setListening(false);
  };

  const clear = async () => {
    if (!window.confirm('Clear your chat history?')) return;
    setNotice('');
    try {
      await api.clearHistory();
      setMessages([]);
    } catch (error) {
      setNotice(`Could not clear chat history: ${error.message}`);
    }
  };

  return (
    <section>
      <h2>Ask your notes</h2>
      <div className="row wrap">
        <DocSelect docs={docs} value={docId} onChange={setDocId} allowAll />
        <select value={mode} onChange={(e) => setMode(e.target.value)} aria-label="Answer style">
          {MODES.map(([v, label]) => <option key={v} value={v}>{label}</option>)}
        </select>
        {messages.length > 0 && <button className="link danger" onClick={clear}>Clear history</button>}
      </div>
      <div className="chat">
        {messages.length === 0 && <p className="muted">{historyLoading ? 'Loading your study conversations...' : 'Ask a question. Answers come only from your uploaded notes.'}</p>}
        {messages.map((m, i) => (
          <div key={i} className={`bubble ${m.role} ${m.error ? 'error' : ''}`}>
            <p>{m.text}</p>
            {m.role === 'ai' && !m.error && (
              <button className="link" onClick={() => speak(m.text)}>Listen</button>
            )}
            {m.sources?.length > 0 && (
              <details>
                <summary>Sources used ({m.sources.length})</summary>
                {m.sources.map((s) => (
                  <p key={s.n} className="source"><b>[{s.n}] {s.doc_name}</b>: {s.snippet}...</p>
                ))}
              </details>
            )}
          </div>
        ))}
        {busy && <div className="bubble ai"><p>Thinking...</p></div>}
        <div ref={endRef} />
      </div>
      {notice && <p className="error">{notice}</p>}
      <form onSubmit={send} className="row">
        <input value={question} onChange={(e) => setQuestion(e.target.value)} placeholder="Type or speak your question" />
        <button type="button" className="secondary" onClick={mic} disabled={listening}>{listening ? 'Listening...' : 'Speak'}</button>
        <button disabled={busy}>Send</button>
      </form>
    </section>
  );
}
