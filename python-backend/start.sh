#!/bin/bash
# Railway starts Python backend via this script
# Requires: FFmpeg, Python deps

cd "$(dirname "$0")"

# Install yt-dlp for YouTube downloads
pip install -q yt-dlp 2>/dev/null || true

# Start FastAPI server
exec uvicorn main:app --host 0.0.0.0 --port ${PORT:-8000}
