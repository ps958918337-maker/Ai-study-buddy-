require('dotenv').config();
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const routes = require('./routes');

if (!process.env.JWT_SECRET) {
  console.error('JWT_SECRET is missing. Copy .env.example to .env and set it.');
  process.exit(1);
}

if (process.env.JWT_SECRET.length < 32 || process.env.JWT_SECRET.startsWith('replace_') || process.env.JWT_SECRET === 'change_this_to_a_long_random_string') {
  console.error('JWT_SECRET must be a private random value with at least 32 characters.');
  process.exit(1);
}

if (!process.env.AI_SERVICE_TOKEN || process.env.AI_SERVICE_TOKEN.length < 32 || process.env.AI_SERVICE_TOKEN.startsWith('replace_')) {
  console.error('AI_SERVICE_TOKEN must be a private random value with at least 32 characters, shared with the AI service.');
  process.exit(1);
}

const app = express();
app.use(cors({ origin: process.env.FRONTEND_ORIGIN || 'http://localhost:5173' }));
app.use(express.json({ limit: '1mb' }));
app.get('/health', (req, res) => res.json({ ok: true }));
app.use('/api', routes);

const PORT = process.env.PORT || 5000;
const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/ai_study_buddy';

async function startServer() {
  let mongoUri = MONGO_URI;

  if (process.env.MONGO_URI && process.env.MONGO_URI !== 'mongodb://127.0.0.1:27017/ai_study_buddy') {
    mongoUri = process.env.MONGO_URI;
  } else {
    try {
      const mongoServer = await MongoMemoryServer.create();
      mongoUri = mongoServer.getUri();
      console.log(`Using in-memory MongoDB at ${mongoUri}`);
    } catch (error) {
      console.warn('Falling back to default Mongo connection:', error.message);
    }
  }

  try {
    await mongoose.connect(mongoUri);
    app.listen(PORT, () => console.log(`API running on http://localhost:${PORT}`));
  } catch (err) {
    console.error('MongoDB connection failed:', err.message);
    process.exit(1);
  }
}

startServer();
