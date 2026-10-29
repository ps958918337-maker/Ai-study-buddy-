export function DocSelect({ docs, value, onChange, allowAll }) {
  return (
    <select value={value} onChange={(e) => onChange(e.target.value)}>
      {allowAll && <option value="">All my notes</option>}
      {!allowAll && !value && <option value="">Choose a document</option>}
      {docs.map((d) => <option key={d._id} value={d._id}>{d.name}</option>)}
    </select>
  );
}

export function TrendChart({ points }) {
  if (!points || points.length < 2) return <p className="muted">Take at least two quizzes to see your score trend.</p>;
  const w = 300, h = 100, pad = 10;
  const x = (i) => pad + (i * (w - 2 * pad)) / (points.length - 1);
  const y = (p) => h - pad - (p / 100) * (h - 2 * pad);
  const d = points.map((p, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(p.percent).toFixed(1)}`).join(' ');
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="trend" role="img" aria-label="Quiz score trend">
      <line x1={pad} x2={w - pad} y1={y(60)} y2={y(60)} className="pass-line" />
      <path d={d} fill="none" stroke="var(--teal)" strokeWidth="2" />
      {points.map((p, i) => <circle key={i} cx={x(i)} cy={y(p.percent)} r="3" fill="var(--teal)" />)}
    </svg>
  );
}

export function speak(text) {
  if (!('speechSynthesis' in window)) return;
  window.speechSynthesis.cancel();
  window.speechSynthesis.speak(new SpeechSynthesisUtterance(text));
}

export function stopSpeaking() {
  if ('speechSynthesis' in window) window.speechSynthesis.cancel();
}

export function listenOnce(onText, onError) {
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SR) {
    onError('Voice input is not supported in this browser. Please use Chrome.');
    return null;
  }
  const rec = new SR();
  rec.lang = 'en-IN';
  rec.interimResults = false;
  rec.onresult = (e) => onText(e.results[0][0].transcript);
  rec.onerror = () => onError('Could not hear you. Please try again.');
  rec.start();
  return rec;
}

export function download(filename, text, type = 'text/plain') {
  const url = URL.createObjectURL(new Blob([text], { type }));
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function toCsv(rows) {
  const esc = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
  return rows.map((r) => r.map(esc).join(',')).join('\n');
}
