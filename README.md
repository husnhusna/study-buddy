# 💾 STUDY.EXE // Retro Cybercore Student Productivity Terminal

> An all-in-one student dashboard and floating Windows desktop widget inspired by 1990s cybercore & Y2K computer interfaces. Manage assignments, exam revision, Pomodoro focus sessions, and lecture notes without cognitive overload.

---

## ⚡ Features

### 1. 📋 Mission Control & Dashboard
- **Live Status & Metrics:** Real-time counters for pending tasks, completed assignments, upcoming deadlines, and exam topics mastered.
- **Priority Queue:** Smart sorting of tasks due today or overdue.
- **Cyber Quotes:** Rotating retro study quotes to keep you motivated.

### 2. 📝 Task Manager
- **Parameters:** Title, Subject/Course, Due Date, and Priority (`HIGH`, `MEDIUM`, `LOW`).
- **Visual Urgency Badges:** Distinct tags for `[OVERDUE]`, `[DUE TODAY]`, `[UPCOMING]`, and `[COMPLETED]`.
- **Filters & Search:** Filter by status or priority level.
- **Fast Actions:** 1-click completion checkboxes and inline renaming.

### 3. 📖 Exam Revision Planner
- **Course & Syllabus Modules:** Group topics under subjects.
- **Mastery Tracker:** 3-state cycling (`○ NOT STARTED` &rarr; `◐ IN PROGRESS` &rarr; `● MASTERED`).
- **Dynamic Neon Progress Bars:** Automatically updates completion percentages.

### 4. ⏱️ Focus Timer (Pomodoro Engine)
- **Dual Modes:** 25-minute study intervals and 5-minute recharge breaks.
- **Background-Safe:** Uses absolute system clock timestamps (`Date.now()` / `time.time()`) so the timer never drifts or throttles when you switch browser tabs.
- **Retro 8-Bit Audio Synth:** Web Audio API synthesizer chimes upon session completion (100% offline, zero audio files).

### 5. 📒 Quick Notes
- **Scratchpad:** Instant lecture note-taking with real-time auto-saving.
- **Searchable Memory Log:** Filter notes by keyword instantly.

### 6. 🪟 Windows Desktop Widget
- **Always-on-top Panel:** Compact frameless cybercore widget that floats above all other Windows apps.
- **Repositionable:** Click-and-drag header to place anywhere on your monitor.
- **Desktop Focus Timer:** Integrated 25m/5m Pomodoro timer with Start, Pause, and Reset controls.
- **One-Click Check-Off:** Mark upcoming tasks completed directly from your desktop.

### 7. 💾 100% Offline Data & Backups
- **Private Local Storage:** Stores your data on your computer.
- **JSON Backup Vault:** 1-click export and import of `.json` backups.

---

## 🚀 Getting Started

### Method A: Web Dashboard
Open `index.html` directly in any modern web browser, or serve it with Python:
```bash
python -m http.server 8000
```
Then visit: `http://localhost:8000`

### Method B: Desktop Widget (Windows)
Navigate to the `desktop-widget` folder and double-click:
```text
launch_widget.bat
```
Or run via Python:
```bash
python desktop-widget/widget.py
```

---

## 🛠️ Tech Stack

- **Frontend:** Pure HTML5, CSS3 (Custom 90s Cybercore / Y2K Design System), Vanilla JavaScript.
- **Desktop Widget:** Python 3 & Tkinter (Zero external dependencies, standard library only).
- **Backend / Bridge:** Python standard library HTTP server (`server_sync.py`).

---

## 📜 License
MIT License. Created for students and retro aesthetic lovers.
