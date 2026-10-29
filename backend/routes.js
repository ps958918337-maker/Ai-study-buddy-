const router = require('express').Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const multer = require('multer');
const axios = require('axios');
const FormData = require('form-data');
const mongoose = require('mongoose');
const { User, Doc, Attempt, Card, Chat, Task } = require('./models');
const auth = require('./middleware');

const AI = process.env.AI_SERVICE_URL || 'http://127.0.0.1:8000';
const AI_HEADERS = { 'x-ai-service-token': process.env.AI_SERVICE_TOKEN };
const WEAK_BELOW = 60; // percent
const MODES = ['simple', 'standard', 'exam'];
const DAY = 24 * 60 * 60 * 1000;

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const ok = /\.(pdf|txt|md)$/i.test(file.originalname);
    cb(ok ? null : new Error('Only PDF, TXT or MD files are allowed'), ok);
  },
});

// Wrap async handlers and turn errors into JSON responses.
const h = (fn) => (req, res) =>
  fn(req, res).catch((e) => {
    const detail = e.response && e.response.data && e.response.data.detail;
    const message = Array.isArray(detail) ? detail.map((item) => item.msg || 'Invalid request').join(', ') : detail || e.message;
    if (e.response && !detail) console.error(e.message);
    res.status(e.status || (e.response && e.response.status) || 500).json({ error: message });
  });

const bad = (message, status = 400) => Object.assign(new Error(message), { status });
const isId = (id) => mongoose.isValidObjectId(id);
const sign = (user) => jwt.sign({ id: user.id }, process.env.JWT_SECRET, { expiresIn: '7d' });

async function ownedDoc(userId, docId) {
  if (!isId(docId)) throw bad('Invalid document id');
  const doc = await Doc.findOne({ _id: docId, user: userId });
  if (!doc) throw bad('Document not found', 404);
  return doc;
}

// ------------------------------------------------------------------ auth
router.post('/auth/register', h(async (req, res) => {
  const { name, email, password } = req.body;
  if (!name || !email || !password) throw bad('Name, email and password are required');
  if (!/^\S+@\S+\.\S+$/.test(email)) throw bad('Enter a valid email address');
  if (password.length < 6) throw bad('Password must be at least 6 characters');
  if (await User.findOne({ email: email.toLowerCase() })) throw bad('Email is already registered', 409);
  const user = await User.create({ name, email, passwordHash: await bcrypt.hash(password, 10) });
  res.status(201).json({ token: sign(user), user: { name: user.name, email: user.email } });
}));

router.post('/auth/login', h(async (req, res) => {
  const { email, password } = req.body;
  const user = await User.findOne({ email: String(email || '').toLowerCase() });
  if (!user || !(await bcrypt.compare(password || '', user.passwordHash))) throw bad('Wrong email or password', 401);
  res.json({ token: sign(user), user: { name: user.name, email: user.email } });
}));

// ------------------------------------------------------------- documents
router.get('/docs', auth, h(async (req, res) => {
  res.json(await Doc.find({ user: req.userId }).sort({ createdAt: -1 }));
}));

router.post('/docs', auth, upload.single('file'), h(async (req, res) => {
  if (!req.file) throw bad('Please choose a file');
  const doc = await Doc.create({ user: req.userId, name: req.file.originalname });
  try {
    const fd = new FormData();
    fd.append('user_id', String(req.userId));
    fd.append('doc_id', String(doc._id));
    fd.append('file', req.file.buffer, { filename: req.file.originalname, contentType: req.file.mimetype });
    const { data } = await axios.post(`${AI}/ingest`, fd, {
      headers: { ...fd.getHeaders(), ...AI_HEADERS },
      maxBodyLength: Infinity,
    });
    doc.chunks = data.chunks;
    await doc.save();
    res.status(201).json(doc);
  } catch (e) {
    await doc.deleteOne();
    throw e;
  }
}));

router.delete('/docs/:id', auth, h(async (req, res) => {
  const doc = await ownedDoc(req.userId, req.params.id);
  await axios.delete(`${AI}/docs/${req.userId}/${doc._id}`, { headers: AI_HEADERS });
  await Attempt.deleteMany({ doc: doc._id });
  await Card.deleteMany({ doc: doc._id });
  await doc.deleteOne();
  res.json({ deleted: true });
}));

// ------------------------------------------------------- chat & generate
router.post('/chat', auth, h(async (req, res) => {
  const { question, docId } = req.body;
  const mode = MODES.includes(req.body.mode) ? req.body.mode : 'standard';
  if (!question || !question.trim()) throw bad('Type a question first');
  if (docId) await ownedDoc(req.userId, docId);
  const { data } = await axios.post(`${AI}/ask`, {
    user_id: String(req.userId),
    question: question.trim(),
    doc_ids: docId ? [docId] : null,
    mode,
  }, { headers: AI_HEADERS });
  await Chat.create({
    user: req.userId, question: question.trim(), answer: data.answer, grounded: data.grounded, mode,
    sources: (data.sources || []).map((s) => ({ n: s.n, doc_name: s.doc_name, snippet: s.snippet })),
  });
  res.json(data);
}));

router.get('/chat/history', auth, h(async (req, res) => {
  const items = await Chat.find({ user: req.userId }).sort({ createdAt: -1 }).limit(30);
  res.json(items.reverse());
}));

router.delete('/chat/history', auth, h(async (req, res) => {
  await Chat.deleteMany({ user: req.userId });
  res.json({ deleted: true });
}));

router.post('/generate', auth, h(async (req, res) => {
  const { docId, kind, topic, topics, count } = req.body;
  await ownedDoc(req.userId, docId);
  const { data } = await axios.post(`${AI}/generate`, {
    user_id: String(req.userId), doc_id: docId, kind, topic: topic || null,
    topics: Array.isArray(topics) && topics.length ? topics.map(String) : null,
    count: Math.max(1, Math.min(Number(count) || 5, 15)),
  }, { headers: AI_HEADERS });
  res.json(data);
}));

router.post('/evaluate', auth, h(async (req, res) => {
  const { docId, question, answer } = req.body;
  await ownedDoc(req.userId, docId);
  if (!question || !answer || !answer.trim()) throw bad('Write your answer first');
  const { data } = await axios.post(`${AI}/evaluate`, {
    user_id: String(req.userId), doc_id: docId, question, student_answer: answer,
  }, { headers: AI_HEADERS });
  res.json(data);
}));

router.post('/plan', auth, h(async (req, res) => {
  const doc = await ownedDoc(req.userId, req.body.docId);
  const days = Math.max(2, Math.min(Number(req.body.days) || 5, 30));
  const { data } = await axios.post(`${AI}/plan`, {
    user_id: String(req.userId), doc_id: String(doc._id), days,
  }, { headers: AI_HEADERS });
  const start = new Date();
  start.setHours(12, 0, 0, 0);
  const tasks = await Task.insertMany(data.items.map((i) => ({
    user: req.userId,
    title: `Day ${i.day} (${doc.name}): ${i.task}`,
    due: new Date(start.getTime() + (Math.max(1, i.day) - 1) * DAY),
  })));
  res.status(201).json(tasks);
}));

// ---------------------------------------------------- spaced repetition
router.post('/cards/bulk', auth, h(async (req, res) => {
  const doc = await ownedDoc(req.userId, req.body.docId);
  const cards = (req.body.cards || []).filter((c) => c && c.front && c.back).slice(0, 50);
  if (!cards.length) throw bad('No cards to save');
  const saved = await Card.insertMany(cards.map((c) => ({
    user: req.userId, doc: doc._id, docName: doc.name, topic: String(c.topic || 'General').slice(0, 40),
    front: String(c.front).slice(0, 500), back: String(c.back).slice(0, 1000),
  })));
  res.status(201).json({ saved: saved.length });
}));

router.get('/cards', auth, h(async (req, res) => {
  res.json(await Card.find({ user: req.userId }).sort({ createdAt: -1 }).limit(500));
}));

router.get('/cards/due', auth, h(async (req, res) => {
  res.json(await Card.find({ user: req.userId, due: { $lte: new Date() } }).sort({ due: 1 }).limit(30));
}));

// SM-2 style scheduling. rating: 0 again, 1 hard, 2 good, 3 easy
router.post('/cards/:id/review', auth, h(async (req, res) => {
  if (!isId(req.params.id)) throw bad('Invalid card id');
  const rating = Number(req.body.rating);
  if (![0, 1, 2, 3].includes(rating)) throw bad('Invalid rating');
  const card = await Card.findOne({ _id: req.params.id, user: req.userId });
  if (!card) throw bad('Card not found', 404);
  const q = [1, 3, 4, 5][rating];
  const now = new Date();
  if (q < 3) {
    card.reps = 0;
    card.interval = 0;
    card.due = new Date(now.getTime() + 10 * 60 * 1000);
  } else {
    card.reps += 1;
    card.interval = card.reps === 1 ? 1 : card.reps === 2 ? 6 : Math.round(card.interval * card.ease);
    if (rating === 1) card.interval = Math.max(1, Math.round(card.interval * 0.7));
    card.due = new Date(now.getTime() + card.interval * DAY);
  }
  card.ease = Math.max(1.3, card.ease + 0.1 - (5 - q) * (0.08 + (5 - q) * 0.02));
  card.lastReviewed = now;
  await card.save();
  res.json(card);
}));

router.delete('/cards/:id', auth, h(async (req, res) => {
  if (!isId(req.params.id)) throw bad('Invalid card id');
  await Card.deleteOne({ _id: req.params.id, user: req.userId });
  res.json({ deleted: true });
}));

// -------------------------------------------------------------- progress
router.post('/attempts', auth, h(async (req, res) => {
  const { docId, score, total } = req.body;
  const doc = await ownedDoc(req.userId, docId);
  if (!Number.isInteger(score) || !Number.isInteger(total) || total < 1 || score < 0 || score > total) {
    throw bad('Invalid score');
  }
  const breakdown = (Array.isArray(req.body.breakdown) ? req.body.breakdown : [])
    .filter((b) => b && b.topic && Number.isInteger(b.correct) && Number.isInteger(b.total) && b.total > 0 && b.correct >= 0 && b.correct <= b.total)
    .slice(0, 30)
    .map((b) => ({ topic: String(b.topic).slice(0, 40), correct: b.correct, total: b.total }));
  res.status(201).json(await Attempt.create({ user: req.userId, doc: doc._id, docName: doc.name, score, total, breakdown }));
}));

router.get('/progress', auth, h(async (req, res) => {
  const attempts = await Attempt.find({ user: req.userId }).sort({ createdAt: 1 });
  const byDoc = {};
  for (const a of attempts) {
    const key = String(a.doc);
    byDoc[key] = byDoc[key] || { docId: key, docName: a.docName, attempts: 0, score: 0, total: 0, history: [] };
    byDoc[key].attempts += 1;
    byDoc[key].score += a.score;
    byDoc[key].total += a.total;
    byDoc[key].history.push(Math.round((a.score / a.total) * 100));
  }
  const topics = Object.values(byDoc).map((t) => {
    const average = Math.round((t.score / t.total) * 100);
    return { ...t, average, weak: average < WEAK_BELOW };
  });
  res.json({ topics, ...topicStats(attempts), totalAttempts: attempts.length });
}));

function topicStats(attempts) {
  const map = {};
  for (const a of attempts) {
    for (const b of a.breakdown || []) {
      const key = `${a.doc}|${b.topic.toLowerCase()}`;
      map[key] = map[key] || { docId: String(a.doc), docName: a.docName, topic: b.topic, correct: 0, total: 0 };
      map[key].correct += b.correct;
      map[key].total += b.total;
    }
  }
  const all = Object.values(map).map((t) => ({ ...t, percent: Math.round((t.correct / t.total) * 100) }));
  const weakTopics = all.filter((t) => t.percent < WEAK_BELOW && t.total >= 2).sort((a, b) => a.percent - b.percent);
  const trend = attempts.slice(-20).map((a) => ({ date: a.createdAt, percent: Math.round((a.score / a.total) * 100) }));
  return { weakTopics, strongTopics: all.filter((t) => t.percent >= 80 && t.total >= 2).slice(0, 5), trend };
}

// Consecutive days with any study activity (quiz, chat or card review), ending today or yesterday.
function streakFrom(dates) {
  const days = new Set(dates.map((d) => new Date(d).toDateString()));
  let streak = 0;
  const cursor = new Date();
  if (!days.has(cursor.toDateString())) cursor.setTime(cursor.getTime() - DAY);
  while (days.has(cursor.toDateString())) {
    streak += 1;
    cursor.setTime(cursor.getTime() - DAY);
  }
  return streak;
}

router.get('/stats', auth, h(async (req, res) => {
  const [attempts, chats, reviewed, cardsTotal, cardsDue, docs] = await Promise.all([
    Attempt.find({ user: req.userId }).sort({ createdAt: 1 }),
    Chat.find({ user: req.userId }).select('createdAt'),
    Card.find({ user: req.userId, lastReviewed: { $exists: true } }).select('lastReviewed'),
    Card.countDocuments({ user: req.userId }),
    Card.countDocuments({ user: req.userId, due: { $lte: new Date() } }),
    Doc.countDocuments({ user: req.userId }),
  ]);
  const dates = [...attempts.map((a) => a.createdAt), ...chats.map((c) => c.createdAt), ...reviewed.map((c) => c.lastReviewed)];
  const totalScore = attempts.reduce((s, a) => s + a.score, 0);
  const totalQs = attempts.reduce((s, a) => s + a.total, 0);
  res.json({
    streak: streakFrom(dates),
    docs, cardsTotal, cardsDue, questionsAsked: chats.length,
    quizzesTaken: attempts.length,
    averageScore: totalQs ? Math.round((totalScore / totalQs) * 100) : null,
    ...topicStats(attempts),
  });
}));

// --------------------------------------------------------------- planner
router.get('/tasks', auth, h(async (req, res) => {
  res.json(await Task.find({ user: req.userId }).sort({ due: 1, createdAt: -1 }));
}));

router.post('/tasks', auth, h(async (req, res) => {
  if (!req.body.title || !req.body.title.trim()) throw bad('Task title is required');
  res.status(201).json(await Task.create({ user: req.userId, title: req.body.title.trim(), due: req.body.due || undefined }));
}));

router.patch('/tasks/:id', auth, h(async (req, res) => {
  if (!isId(req.params.id)) throw bad('Invalid task id');
  const task = await Task.findOneAndUpdate({ _id: req.params.id, user: req.userId }, { done: !!req.body.done }, { new: true });
  if (!task) throw bad('Task not found', 404);
  res.json(task);
}));

router.delete('/tasks/:id', auth, h(async (req, res) => {
  if (!isId(req.params.id)) throw bad('Invalid task id');
  await Task.deleteOne({ _id: req.params.id, user: req.userId });
  res.json({ deleted: true });
}));

// Multer / upload errors
router.use((err, req, res, next) => res.status(400).json({ error: err.message }));

module.exports = router;
