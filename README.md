# 🤖 AI Interview Preparation Agent
### Full-Stack · FastAPI + React + Claude AI

---

## 📁 FOLDER STRUCTURE (Complete)

```
ai-interview-agent/
│
├── 📁 backend/                          ← Python FastAPI server
│   ├── app/
│   │   ├── __init__.py
│   │   ├── main.py                      ← App entry point + CORS + routes
│   │   │
│   │   ├── 📁 api/                      ← Route handlers (controllers)
│   │   │   ├── auth.py                  ← /register, /login, /me
│   │   │   └── interview.py             ← /start, /question, /answer, /feedback, /history
│   │   │
│   │   ├── 📁 core/                     ← App-wide configuration
│   │   │   ├── config.py                ← Reads .env settings
│   │   │   ├── database.py              ← SQLAlchemy engine + session
│   │   │   └── security.py             ← JWT create/verify, bcrypt hashing
│   │   │
│   │   ├── 📁 models/                   ← Database table definitions (ORM)
│   │   │   └── user.py                  ← User, InterviewSession, Question,
│   │   │                                    Answer, PerformanceReport tables
│   │   │
│   │   ├── 📁 schemas/                  ← Request/Response shapes (validation)
│   │   │   └── interview.py             ← Pydantic models for all endpoints
│   │   │
│   │   ├── 📁 services/                 ← Business logic
│   │   │   └── ai_service.py            ← ALL Claude API calls (3 prompts)
│   │   │
│   │   └── 📁 utils/                    ← Helpers (extend as needed)
│   │
│   ├── 📁 alembic/                      ← DB migration tool (production)
│   │   └── versions/
│   │
│   ├── requirements.txt                 ← Python packages to install
│   └── .env.example                     ← Copy to .env and fill in keys
│
├── 📁 frontend/                         ← React Vite app
│   ├── index.html                       ← Root HTML file
│   ├── vite.config.js                   ← Dev server + API proxy
│   ├── tailwind.config.js               ← Styling configuration
│   ├── postcss.config.js
│   ├── package.json                     ← npm packages
│   │
│   └── 📁 src/
│       ├── main.jsx                     ← React entry point
│       ├── App.jsx                      ← Router + route guards
│       ├── index.css                    ← Tailwind + custom styles
│       │
│       ├── 📁 pages/                    ← Full page components
│       │   ├── AuthPages.jsx            ← Login + Register
│       │   ├── InterviewPage.jsx        ← Setup + Interview flow
│       │   └── DashboardAndReport.jsx   ← Dashboard + Final report
│       │
│       ├── 📁 components/              ← Reusable UI pieces
│       │   ├── common/                  ← Button, Card, Input, Spinner
│       │   ├── interview/               ← QuestionCard, FeedbackCard, Timer
│       │   ├── dashboard/               ← StatsCard, HistoryList
│       │   └── auth/                    ← AuthForm, AuthLayout
│       │
│       ├── 📁 services/
│       │   └── api.js                   ← Axios instance + all API calls
│       │
│       ├── 📁 store/
│       │   └── index.js                 ← Zustand global state
│       │
│       ├── 📁 hooks/                    ← Custom React hooks (useInterview etc.)
│       └── 📁 utils/                    ← Helper functions
│
└── 📁 docs/                             ← Documentation, diagrams
```

---

## ⚙️ TECH STACK — What We Used & Why

| Layer        | Technology         | Why We Chose It                                    |
|-------------|--------------------|----------------------------------------------------|
| **AI**       | Anthropic Claude   | Best LLM for conversational, accurate evaluation   |
| **Backend**  | FastAPI (Python)   | Fast, async, auto-generates API docs (Swagger)     |
| **Auth**     | JWT + bcrypt       | Stateless, secure, industry standard               |
| **Database** | SQLite → PostgreSQL| SQLite for dev (zero setup), Postgres for prod     |
| **ORM**      | SQLAlchemy         | Python objects ↔ database tables                   |
| **Validation**| Pydantic          | Auto-validates all request/response shapes         |
| **Frontend** | React + Vite       | Fast dev server, component-based UI                |
| **Styling**  | Tailwind CSS       | Utility-first, no custom CSS files needed          |
| **State**    | Zustand            | Lightweight global state (simpler than Redux)      |
| **Charts**   | Recharts           | React-native charting library                      |
| **HTTP**     | Axios              | Promise-based API calls with interceptors          |
| **Routing**  | React Router v6    | Client-side page navigation                        |

---

## 🗄️ DATABASE DESIGN

```
┌──────────┐     ┌─────────────────────┐     ┌───────────┐
│  users   │────▷│  interview_sessions │────▷│ questions │
│          │     │                     │     │           │
│ id       │     │ id                  │     │ id        │
│ name     │     │ user_id (FK)        │     │ session_id│
│ email    │     │ domain              │     │ text      │
│ password │     │ difficulty          │     │ type      │
│          │     │ status              │     │ order     │
└──────────┘     │ total_score         │     └─────┬─────┘
                 │ questions_asked     │           │
                 └──────┬──────────────┘           │
                        │                    ┌─────▽─────┐
                        │                    │  answers  │
                 ┌──────▽──────────────┐     │           │
                 │ performance_reports │     │ id        │
                 │                     │     │ question_id│
                 │ id                  │     │ text      │
                 │ session_id (FK)     │     │ score     │
                 │ overall_score       │     │ feedback  │
                 │ technical_score     │     │ strengths │
                 │ communication_score │     │ improve.. │
                 │ summary             │     └───────────┘
                 │ recommendation      │
                 └─────────────────────┘
```

---

## 🤖 AI WORKFLOW — How Claude is Used (3 Prompt Types)

### Prompt 1: Generate Question
```
Input:  domain, difficulty, list of previous questions, question index
Output: { "question": "...", "type": "technical" }
```

### Prompt 2: Evaluate Answer
```
Input:  domain, difficulty, question text, candidate's answer
Output: { "score": 7.5, "feedback": "...", "strengths": [...], 
          "improvements": [...], "follow_up_question": "..." }
```

### Prompt 3: Generate Final Report
```
Input:  domain, difficulty, all Q&A pairs with scores
Output: { "overall_score": 7.2, "technical_score": ..., 
          "summary": "...", "recommendation": "hire" }
```

---

## 🔄 REQUEST FLOW (How a full interview works)

```
User clicks "Start Interview"
    │
    ▼
POST /api/interview/start-interview
    │ Creates InterviewSession in DB
    │ Returns session_id
    ▼
POST /api/interview/generate-question (×1 to 8)
    │ FastAPI calls Claude AI
    │ Claude generates contextual question
    │ Saved to questions table
    │ Returns question text
    ▼
POST /api/interview/submit-answer
    │ FastAPI sends {question + answer} to Claude
    │ Claude scores 0-10, gives feedback
    │ Saved to answers table
    │ Returns evaluation (score, strengths, improvements)
    ▼
POST /api/interview/feedback
    │ Collects all Q&As from DB
    │ Sends to Claude for holistic report
    │ Saves PerformanceReport to DB
    │ Marks session as "completed"
    │ Returns full report with radar chart data
    ▼
GET /api/interview/history
    │ Returns all past sessions for dashboard
```

---

## 🚀 INSTALLATION GUIDE — Step by Step

### Prerequisites
- Python 3.10+
- Node.js 18+
- Anthropic API Key (get from https://console.anthropic.com)

---

### BACKEND SETUP

```bash
# 1. Navigate to backend folder
cd ai-interview-agent/backend

# 2. Create a virtual environment (isolated Python)
python -m venv venv

# 3. Activate it
# On Mac/Linux:
source venv/bin/activate
# On Windows:
venv\Scripts\activate

# 4. Install all Python packages
pip install -r requirements.txt

# 5. Create your .env file
cp .env.example .env

# 6. Edit .env — add your Anthropic API key:
# ANTHROPIC_API_KEY=sk-ant-...your-key-here...

# 7. Start the server
uvicorn app.main:app --reload --port 8000

# ✅ Backend runs on: http://localhost:8000
# ✅ Swagger UI docs: http://localhost:8000/docs
```

---

### FRONTEND SETUP

```bash
# 1. Navigate to frontend folder
cd ai-interview-agent/frontend

# 2. Install all npm packages
npm install

# 3. Start development server
npm run dev

# ✅ Frontend runs on: http://localhost:5173
```

---

### DATABASE
- **Development**: SQLite is used automatically — a file `interview_agent.db` is created on first run. No setup needed.
- **Production**: Change `DATABASE_URL` in `.env` to a PostgreSQL URL.
- Tables are created automatically on startup (`Base.metadata.create_all`).

---

## 📡 API ENDPOINTS REFERENCE

| Method | Endpoint                          | Auth | Purpose                        |
|--------|-----------------------------------|------|--------------------------------|
| POST   | `/api/auth/register`              | ❌   | Create new user                |
| POST   | `/api/auth/login`                 | ❌   | Get JWT token                  |
| GET    | `/api/auth/me`                    | ✅   | Get current user info          |
| POST   | `/api/interview/start-interview`  | ✅   | Create new session             |
| POST   | `/api/interview/generate-question`| ✅   | Get AI-generated question      |
| POST   | `/api/interview/submit-answer`    | ✅   | Submit answer → AI evaluates   |
| POST   | `/api/interview/feedback`         | ✅   | End interview + full report    |
| GET    | `/api/interview/history`          | ✅   | Past interview sessions        |

---

## 🎤 HOW TO EXPLAIN THIS TO YOUR TEAM LEAD

### Simple Explanation (2 minutes)

> **"We're building an AI-powered mock interview platform. Think of it as having a senior engineer available 24/7 to practice interviews with you."**
>
> **How it works:**
> 1. User logs in, picks a role (Frontend Dev, Data Analyst, etc.) and difficulty
> 2. The app asks Claude AI to generate interview questions tailored to that role
> 3. The candidate types their answer
> 4. Claude AI reads the answer and gives an instant score (0-10), what was good, and what to improve
> 5. After 8 questions, Claude generates a full performance report with a radar chart and a hire/reject recommendation
> 6. All interview history is saved so users can track their improvement over time

### Technical Summary for Team Lead

> **Backend**: FastAPI (Python) — chosen for speed and automatic API documentation. SQLite for development, ready to switch to PostgreSQL for production.
>
> **Frontend**: React + Tailwind — responsive, clean UI with real-time feedback cards and charts.
>
> **AI Layer**: We built 3 specialized Claude prompts — one to generate questions (contextually, avoiding repetition), one to evaluate answers (returning structured JSON scores), and one to generate the final report. All AI calls go through a single `ai_service.py` file, making it easy to swap models or adjust prompts.
>
> **Security**: JWT tokens for authentication, bcrypt for password hashing — industry standard.
>
> **Scalability**: Modular structure — each concern (auth, interview, AI) is separated. Adding a new domain (e.g., DevOps questions) is a config change, not a code change.

### Key Technical Decisions to Mention

| Decision | Why |
|----------|-----|
| FastAPI over Django/Flask | Auto-generates Swagger docs, async support, faster development |
| SQLite for dev | Zero setup, switches to Postgres with one env variable change |
| Zustand over Redux | 90% less boilerplate, same power for our use case |
| Structured JSON prompts | Claude returns predictable JSON → no brittle text parsing |
| Vite over CRA | 10x faster hot reload during development |

---

## 🔮 OPTIONAL ENHANCEMENTS (Phase 2)

| Feature | How to Implement |
|---------|-----------------|
| Voice Input | Web Speech API → convert to text → existing submit flow |
| Resume Upload | PDF parse with PyMuPDF → inject into question prompt |
| Coding Round | Monaco Editor in React + code execution sandbox |
| Multi-agent Panel | Multiple Claude personas in one conversation |
| Company Patterns | Add `company` field to session → inject into prompts |
| Emotion Detection | Webcam + facial analysis API during video interview |

---

## ✅ TESTING CHECKLIST

```
□ Register a new user account
□ Login and get JWT token stored
□ Start Frontend Developer interview (beginner)
□ Answer 3–4 questions, check scores appear
□ Click "End & Get Report" → verify radar chart appears
□ Check Dashboard shows the completed session
□ Start Data Analyst interview (advanced)
□ Test with short/empty answers → verify error handling
□ Test with wrong API key → verify graceful error message
□ Check /api/docs in browser → test all endpoints in Swagger
```
