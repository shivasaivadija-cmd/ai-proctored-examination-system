@echo off
cd /d E:\ai-interview-agent\backend
call venv\Scripts\activate
python -m uvicorn app.main:app --reload --port 8000
