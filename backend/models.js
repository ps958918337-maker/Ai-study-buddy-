const mongoose = require('mongoose');
const { Schema } = mongoose;

const User = mongoose.model('User', new Schema({
  name: { type: String, required: true, trim: true },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  passwordHash: { type: String, required: true },
}, { timestamps: true }));

const Doc = mongoose.model('Doc', new Schema({
  user: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  name: { type: String, required: true },
  chunks: { type: Number, default: 0 },
}, { timestamps: true }));

const Attempt = mongoose.model('Attempt', new Schema({
  user: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  doc: { type: Schema.Types.ObjectId, ref: 'Doc', required: true },
  docName: String,
  score: { type: Number, required: true },
  total: { type: Number, required: true },
  breakdown: [{ topic: String, correct: Number, total: Number, _id: false }],
}, { timestamps: true }));

const Card = mongoose.model('Card', new Schema({
  user: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  doc: { type: Schema.Types.ObjectId, ref: 'Doc', required: true },
  docName: String,
  topic: { type: String, default: 'General' },
  front: { type: String, required: true },
  back: { type: String, required: true },
  ease: { type: Number, default: 2.5 },
  interval: { type: Number, default: 0 },
  reps: { type: Number, default: 0 },
  due: { type: Date, default: Date.now, index: true },
  lastReviewed: Date,
}, { timestamps: true }));

const Chat = mongoose.model('Chat', new Schema({
  user: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  question: String,
  answer: String,
  grounded: Boolean,
  mode: String,
  sources: [{ n: Number, doc_name: String, snippet: String, _id: false }],
}, { timestamps: true }));

const Task = mongoose.model('Task', new Schema({
  user: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  title: { type: String, required: true },
  due: Date,
  done: { type: Boolean, default: false },
}, { timestamps: true }));

module.exports = { User, Doc, Attempt, Card, Chat, Task };
