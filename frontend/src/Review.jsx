import { useEffect, useState } from 'react';
import { api } from './api.js';
import { download, toCsv } from './ui.jsx';

const RATINGS = [['Again', 0], ['Hard', 1], ['Good', 2], ['Easy', 3]];

export default function Review() {
  const [queue, setQueue] = useState(null);
  const [flipped, setFlipped] = useState(false);
  const [reviewed, setReviewed] = useState(0);
  const [error, setError] = useState('');

  useEffect(() => { api.dueCards().then(setQueue).catch((e) => setError(e.message)); }, []);

  const rate = async (rating) => {
    const card = queue[0];
    try {
      await api.reviewCard(card._id, rating);
      setReviewed((n) => n + 1);
      setFlipped(false);
      // "Again" cards come back later in this session.
      setQueue((q) => (rating === 0 ? [...q.slice(1), card] : q.slice(1)));
    } catch (err) {
      setError(err.message);
    }
  };

  const exportDeck = async () => {
    const all = await api.cards();
    download('review-deck.csv', toCsv([['Front', 'Back', 'Topic', 'Document'], ...all.map((c) => [c.front, c.back, c.topic, c.docName])]), 'text/csv');
  };

  if (error) return <p className="error">{error}</p>;
  if (!queue) return <p className="muted">Loading...</p>;

  const card = queue[0];
  return (
    <section>
      <h2>Review flashcards</h2>
      <p className="muted">Cards come back at longer gaps each time you remember them (spaced repetition).</p>
      {!card ? (
        <div className="card">
          <p><b>{reviewed > 0 ? `Done! You reviewed ${reviewed} card(s).` : 'No cards are due right now.'}</b></p>
          <p className="muted">Create flashcards in the Study tab and tap "Save to review deck".</p>
        </div>
      ) : (
        <>
          <p className="muted">{queue.length} card(s) left. Topic: {card.topic}</p>
          <div className="flash big" onClick={() => setFlipped(!flipped)}>
            {flipped ? card.back : card.front}
            <small>{flipped ? 'Answer' : 'Tap to show the answer'}</small>
          </div>
          {flipped && (
            <div className="row wrap">
              {RATINGS.map(([label, value]) => <button key={value} className={value === 0 ? 'danger-btn' : ''} onClick={() => rate(value)}>{label}</button>)}
            </div>
          )}
        </>
      )}
      <button className="secondary" onClick={exportDeck}>Export whole deck (CSV)</button>
    </section>
  );
}
