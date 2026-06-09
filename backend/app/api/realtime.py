"""
Real-time interview API:
- /tts          → text-to-speech (gTTS → base64 mp3)
- /transcribe   → speech-to-text (Groq Whisper)
- /mcq-question → generate MCQ question with options
- /check-answer → check selected MCQ option instantly
"""
import io
import base64
import json
import re
import tempfile
import os
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from fastapi.responses import JSONResponse
from sqlalchemy.orm import Session
from pydantic import BaseModel
from gtts import gTTS
from groq import Groq
from app.core.config import settings
from app.core.database import get_db
from app.core.security import get_current_user
from app.models.user import User
from app.services.ai_service import generate_question, _call_groq, _safe_json

router = APIRouter(prefix="/api/realtime", tags=["RealTime Interview"])
groq_client = Groq(api_key=settings.GROQ_API_KEY)


# ── Schemas ───────────────────────────────────────────────────────────────────
class TTSRequest(BaseModel):
    text: str
    lang: str = "en"


class MCQRequest(BaseModel):
    domain: str
    difficulty: str
    question_index: int
    previous_questions: list[str] = []


class CheckAnswerRequest(BaseModel):
    question: str
    options: list[str]
    correct_answer: str
    user_answer: str
    explanation: str


# ── TTS: text → base64 mp3 ────────────────────────────────────────────────────
@router.post("/tts")
def text_to_speech(payload: TTSRequest, current_user: User = Depends(get_current_user)):
    """Convert question text to speech. Returns base64-encoded mp3."""
    try:
        tts = gTTS(text=payload.text, lang=payload.lang, slow=False)
        buf = io.BytesIO()
        tts.write_to_fp(buf)
        buf.seek(0)
        audio_b64 = base64.b64encode(buf.read()).decode("utf-8")
        return {"audio_base64": audio_b64, "format": "mp3"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"TTS error: {str(e)}")


# ── STT: audio file → transcript (Groq Whisper) ───────────────────────────────
@router.post("/transcribe")
async def transcribe_audio(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
):
    """Transcribe uploaded audio using Groq Whisper."""
    try:
        audio_bytes = await file.read()
        # Write to temp file (Groq needs a file path)
        suffix = ".webm" if "webm" in (file.content_type or "") else ".wav"
        with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as tmp:
            tmp.write(audio_bytes)
            tmp_path = tmp.name

        with open(tmp_path, "rb") as f:
            transcription = groq_client.audio.transcriptions.create(
                model="whisper-large-v3-turbo",
                file=(os.path.basename(tmp_path), f, file.content_type or "audio/webm"),
                response_format="text",
            )
        os.unlink(tmp_path)
        return {"transcript": str(transcription).strip()}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Transcription error: {str(e)}")


# ── Generate MCQ question ─────────────────────────────────────────────────────
@router.post("/mcq-question")
def get_mcq_question(
    payload: MCQRequest,
    current_user: User = Depends(get_current_user),
):
    """Generate a fresh MCQ question with 4 options."""
    try:
        result = generate_question(
            domain=payload.domain,
            difficulty=payload.difficulty,
            previous_questions=payload.previous_questions,
            question_index=payload.question_index,
        )
        return result
    except Exception as e:
        raise HTTPException(status_code=503, detail=f"AI error: {str(e)}")


# ── Check MCQ answer instantly ────────────────────────────────────────────────
@router.post("/check-answer")
def check_answer(payload: CheckAnswerRequest, current_user: User = Depends(get_current_user)):
    """Instantly check if selected MCQ option is correct."""
    is_correct = payload.user_answer.strip() == payload.correct_answer.strip()
    return {
        "is_correct":     is_correct,
        "correct_answer": payload.correct_answer,
        "explanation":    payload.explanation,
        "score":          10 if is_correct else 0,
    }
