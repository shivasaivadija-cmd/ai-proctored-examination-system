from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import settings
from app.core.database import engine, Base
from app.api import auth, interview, dashboard, realtime, resume, admin, verification
from sqlalchemy import text, inspect

# Create all DB tables on startup (development convenience)
# In production, use Alembic migrations instead
Base.metadata.create_all(bind=engine)

# Migration helper: add reset columns if they don't exist (SQLite compatibility)
def migrate_columns():
    inspector = inspect(engine)
    with engine.connect() as conn:
        # users table
        user_cols = [col['name'] for col in inspector.get_columns('users')]
        if 'reset_token' not in user_cols:
            conn.execute(text('ALTER TABLE users ADD COLUMN reset_token VARCHAR'))
            conn.commit()
        if 'reset_token_expiry' not in user_cols:
            conn.execute(text('ALTER TABLE users ADD COLUMN reset_token_expiry DATETIME'))
            conn.commit()
        if 'is_admin' not in user_cols:
            conn.execute(text('ALTER TABLE users ADD COLUMN is_admin INTEGER DEFAULT 0'))
            conn.commit()

migrate_columns()

app = FastAPI(
    title=settings.APP_NAME,
    description="AI-powered interview preparation platform using Claude (Anthropic)",
    version="1.0.0",
    docs_url="/docs",           # Swagger UI
    redoc_url="/redoc",         # ReDoc UI
)

# ─── CORS ─────────────────────────────────────────────────────────────────────
app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.FRONTEND_URL, "http://localhost:5173", "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ─── Routers ──────────────────────────────────────────────────────────────────
app.include_router(auth.router)
app.include_router(verification.router)
app.include_router(interview.router)
app.include_router(dashboard.router)
app.include_router(realtime.router)
app.include_router(resume.router)
app.include_router(admin.router)


@app.get("/", tags=["Health"])
def health_check():
    return {"status": "ok", "app": settings.APP_NAME, "version": "1.0.0"}


@app.get("/health", tags=["Health"])
def health():
    return {"status": "healthy"}
