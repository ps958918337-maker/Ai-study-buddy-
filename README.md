# AI Study Buddy

A web app that answers questions from a student's own notes (Retrieval-Augmented Generation), creates
summaries, flashcards and quizzes, finds weak topics, schedules flashcard reviews, and plans revision.
The app pairs those study tools with a responsive workspace, a personalized dashboard, and clear progress signals.

## Features

1. Note-grounded chat with sources, and a refusal when the answer is not in the notes
2. Answer styles: Standard, Explain simply, Exam answer
3. Chat history saved per user, voice input (Speak) and read-aloud (Listen)
4. Summaries, flashcards, multiple-choice quizzes, and written-answer practice graded by AI (score, missing points, model answer)
5. Topic-level weak-spot tracking: every question has a topic, so weak topics are found automatically
6. One-click "Practice weak topics" quiz built only from those topics
7. Spaced-repetition flashcard review (SM-2 style: Again, Hard, Good, Easy)
8. Dashboard with study streak, quizzes taken, average score, cards due, and score trend chart
9. AI revision plan: pick a document and number of days, and the plan is added to the planner
10. Planner with tasks and a Pomodoro focus timer
11. Exports: summary as .txt, flashcards and whole deck as .csv
12. Dark and light themes, with a responsive workspace and keyboard focus states
13. Backend-only shared-secret protection for the internal AI service

## Architecture

React (Vite)  ->  Node.js + Express API  ->  Python FastAPI AI service
                       |                        |-- sentence-transformers (embeddings)
                    MongoDB                     |-- FAISS (vector search)
          (users, docs, attempts, tasks)        |-- Claude API (grounded answers)

## Folder structure

- `ai_service/` Python service: text extraction, chunking, embeddings, FAISS search, LLM calls
- `backend/` Express REST API: JWT auth, uploads, chat, generation, progress, planner
- `frontend/` React app with seven tabs: Dashboard, Library, Chat, Study, Review, Progress, Planner

## Requirements

Python 3.10+, Node.js 18+, MongoDB running locally (or a MongoDB Atlas URI), and an Anthropic API key.

## Setup and run (three terminals)

1. AI service
   ```
   cd ai_service
   python -m venv venv
   .\venv\Scripts\Activate.ps1       # Windows PowerShell
   pip install -r requirements.txt
   Copy-Item .env.example .env       # set ANTHROPIC_API_KEY and AI_SERVICE_TOKEN
   uvicorn main:app --port 8000
   ```
   The first start downloads the embedding model (about 90 MB).

2. Backend
   ```
   cd backend
   Copy-Item .env.example .env       # then edit the new file
   npm install
   npm start
   ```
   Generate separate private random values for `JWT_SECRET` and `AI_SERVICE_TOKEN` (at least 32 characters each); use the same AI token in both services. For example, generate a value with `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`. Do not commit or share either `.env` file.

3. Frontend
   ```
   cd frontend
   npm install
   npm run dev
   ```
   Open http://localhost:5173, create an account, upload notes, and start asking questions.
   For a deployed frontend, set `FRONTEND_ORIGIN` in `backend/.env` to its exact origin.

## How the grounding works

1. Uploaded text is split into overlapping chunks of about 200 words (40-word overlap).
2. Each chunk is converted to a vector and stored per user.
3. A question is embedded and FAISS returns the most similar chunks.
4. If the best match is below `MIN_SCORE` (default 0.25), the app replies that the answer is not in the notes
   and does not call the LLM. Otherwise the chunks go to the LLM with an instruction to answer only from them.
5. The answer is shown with the source passages used.

## API summary

| Method | Path | Purpose |
|---|---|---|
| POST | /api/auth/register, /api/auth/login | Create account, log in (returns JWT) |
| GET | /api/stats | Dashboard numbers, streak, weak topics, trend |
| GET/POST/DELETE | /api/docs | List, upload, delete notes |
| POST | /api/chat | Grounded question (mode: standard, simple, exam) |
| GET/DELETE | /api/chat/history | Saved chat history |
| POST | /api/generate | Summary, flashcards, quiz or short questions (optional topics list) |
| POST | /api/evaluate | AI grades a written answer |
| POST | /api/plan | AI revision plan saved as planner tasks |
| POST | /api/cards/bulk, GET /api/cards, GET /api/cards/due | Save, list, and fetch due flashcards |
| POST | /api/cards/:id/review | Rate a card (0 again, 1 hard, 2 good, 3 easy) |
| POST | /api/attempts | Save a quiz score with per-topic breakdown |
| GET | /api/progress | Weak and strong topics, trend, per-document average |
| GET/POST/PATCH/DELETE | /api/tasks | Study planner |

## Configuration

- `CLAUDE_MODEL` (ai_service): defaults to `claude-sonnet-5-5`. Change it if your account uses another model.
- `MIN_SCORE` (ai_service): relevance threshold used to decline out-of-notes questions.
- `AI_SERVICE_URL`, `AI_SERVICE_TOKEN`, `FRONTEND_ORIGIN`, `MONGO_URI`, `JWT_SECRET`, `PORT` (backend): see `backend/.env.example`.
- `AI_SERVICE_TOKEN` must be at least 32 characters and match the value in `ai_service/.env`.

## Measuring results for your report

Use a fixed set of questions per subject (some answered in the notes, some not) and record:
answer relevance, refusal accuracy, response time, quiz validity, and AI grading agreement with a teacher's marks. Put the real numbers in Table I
of the research paper.

## Known limits

- Scanned or handwritten PDFs have no text layer and need OCR (listed as future scope).
- Vectors are stored in files under `ai_service/data/`. For many users, move to a database-backed vector store.
- Run the three services behind HTTPS and set a strong `JWT_SECRET` before any public deployment.
