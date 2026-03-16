@echo off
title Qatar Air Defense — Web Server
cd /d "%~dp0"
echo Starting web server on http://localhost:8000
echo Press Ctrl+C to stop.
start "" "http://localhost:8000"
python -m http.server 8000
