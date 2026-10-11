# STUDY.EXE // Desktop Widget Guide

A compact, 1990s retro cybercore desktop widget that stays visible on top of your Windows apps while you study.

---

## 🚀 How to Launch the Widget

1. Open **File Explorer** and go to:
   ```text
   C:\Users\HUSNA\.gemini\antigravity\scratch\study-exe\desktop-widget
   ```
2. Double-click **`launch_widget.bat`** (or right-click `widget.py` -> Open with -> Python).
3. The compact retro widget will appear in the top-right corner of your screen!

---

## 🎮 How to Use the Widget

- **Move it anywhere:** Click and drag the top bar (`💾 STUDY.EXE // WIDGET`) to reposition it anywhere on your desktop.
- **Always on top:** It automatically floats above your browser, PDF readers, and notes.
- **Check off tasks:** Click the `[✓]` button next to any upcoming task to mark it completed instantly.
- **Focus Timer:** 
  - Click **▶ START** to begin your 25-minute Pomodoro focus block.
  - Switch to **☕ BREAK (5M)** when taking a rest.
  - The timer uses exact system timestamps so it never lags.
- **Open Full Dashboard:** Click **`🌐 OPEN FULL DASHBOARD`** to open the complete STUDY.EXE website in your browser.
- **Minimize / Hide:** Click **`_`** in the top-right corner. A small floating `[RESTORE STUDY]` button will appear so you can reopen the widget anytime with one click.
- **Close Safely:** Click **`✕`** in the top-right corner to exit the widget.

---

## 💾 How Data Sharing Works

- All your tasks and study progress are stored in:
  `C:\Users\HUSNA\.gemini\antigravity\scratch\study-exe\study_data.json`
- Both the web dashboard and the desktop widget read and write to this same offline file.
- When you add a task on the website, the desktop widget updates automatically.
- When you mark a task complete on the desktop widget, the change is saved immediately to the file.
- An untouched safety backup is preserved at `study_data_backup.json`.
- 100% offline. Zero external servers. Zero telemetry.
