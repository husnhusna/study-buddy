@echo off
title STUDY.EXE Widget Launcher
cd /d "%~dp0"

echo [STUDY.EXE] Launching Desktop Widget...
start "" pythonw widget.py

exit
