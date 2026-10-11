"""
STUDY.EXE // Windows Desktop Widget
A compact, frameless, always-on-top retro cybercore desktop widget.
Built using Python 3 & Tkinter (100% standard library, zero external dependencies).
"""

import os
import sys
import json
import time
import webbrowser
import tkinter as tk
from tkinter import ttk

# Attempt winsound on Windows for retro beeps
try:
    import winsound
    HAS_WINSOUND = True
except ImportError:
    HAS_WINSOUND = False

# File paths
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA_FILE = os.path.join(BASE_DIR, "study_data.json")
INDEX_HTML = os.path.join(BASE_DIR, "index.html")

# Color Palette (1990s Cybercore / Y2K)
COLOR_BG_DARK = "#070b14"
COLOR_BG_PANEL = "#0f182c"
COLOR_BG_CARD = "#14223d"
COLOR_LIME = "#39ff14"
COLOR_PURPLE = "#a855f7"
COLOR_PINK = "#ff007f"
COLOR_CYAN = "#00f0ff"
COLOR_TEXT = "#f0f4fc"
COLOR_TEXT_DIM = "#94a3b8"
COLOR_TEXT_MUTED = "#64748b"

FONT_MONO = ("Consolas", 9)
FONT_MONO_BOLD = ("Consolas", 9, "bold")
FONT_TITLE = ("Consolas", 10, "bold")
FONT_DIGITS = ("Consolas", 22, "bold")
FONT_MINI = ("Consolas", 8)

class StudyExeWidget:
    def __init__(self, root):
        self.root = root
        self.root.title("STUDY.EXE Widget")
        
        # Configure Frameless & Always-on-top
        self.root.overrideredirect(True)
        self.root.wm_attributes("-topmost", True)
        self.root.configure(bg=COLOR_BG_DARK)

        # Set window size and initial position (top-right of screen)
        self.width = 330
        self.height = 490
        screen_w = self.root.winfo_screenwidth()
        pos_x = max(20, screen_w - self.width - 25)
        pos_y = 60
        self.root.geometry(f"{self.width}x{self.height}+{pos_x}+{pos_y}")

        # Drag tracking variables
        self.drag_start_x = 0
        self.drag_start_y = 0

        # Timer state
        self.timer_seconds = 25 * 60
        self.timer_total = 25 * 60
        self.timer_running = False
        self.timer_end_time = None
        self.timer_mode = "focus"  # 'focus' (25m) or 'break' (5m)

        # Cached data modification time
        self.last_data_mtime = 0
        self.tasks = []
        self.subjects = []

        # Build UI
        self.create_ui()

        # Initial data load
        self.load_data()

        # Start periodic background checks
        self.root.after(1000, self.timer_tick)
        self.root.after(2500, self.auto_refresh_data)

    def play_beep(self, freq=800, dur=100):
        if HAS_WINSOUND:
            try:
                winsound.Beep(freq, dur)
            except Exception:
                pass

    def create_ui(self):
        # Outer Glowing Frame
        self.outer_frame = tk.Frame(
            self.root, 
            bg=COLOR_BG_DARK, 
            highlightbackground=COLOR_LIME, 
            highlightcolor=COLOR_LIME, 
            highlightthickness=1
        )
        self.outer_frame.pack(fill="both", expand=True)

        # 1. Custom Titlebar (Draggable)
        self.titlebar = tk.Frame(self.outer_frame, bg=COLOR_BG_PANEL, height=28)
        self.titlebar.pack(fill="x", side="top")
        self.titlebar.pack_propagate(False)

        # Bind dragging to titlebar and title label
        self.titlebar.bind("<Button-1>", self.start_drag)
        self.titlebar.bind("<B1-Motion>", self.do_drag)

        title_label = tk.Label(
            self.titlebar, 
            text="💾 STUDY.EXE // WIDGET", 
            fg=COLOR_LIME, 
            bg=COLOR_BG_PANEL, 
            font=FONT_TITLE
        )
        title_label.pack(side="left", padx=8)
        title_label.bind("<Button-1>", self.start_drag)
        title_label.bind("<B1-Motion>", self.do_drag)

        # Window Controls (Hide/Minimize & Close)
        close_btn = tk.Button(
            self.titlebar, 
            text="✕", 
            command=self.close_widget, 
            fg="#ffffff", 
            bg=COLOR_BG_PANEL, 
            activebackground=COLOR_PINK, 
            activeforeground="#ffffff", 
            font=FONT_TITLE, 
            bd=0, 
            padx=8, 
            cursor="hand2"
        )
        close_btn.pack(side="right")

        min_btn = tk.Button(
            self.titlebar, 
            text="_", 
            command=self.minimize_widget, 
            fg=COLOR_TEXT_DIM, 
            bg=COLOR_BG_PANEL, 
            activebackground=COLOR_BG_CARD, 
            activeforeground=COLOR_LIME, 
            font=FONT_TITLE, 
            bd=0, 
            padx=8, 
            cursor="hand2"
        )
        min_btn.pack(side="right")

        pin_label = tk.Label(
            self.titlebar,
            text="[ON TOP]",
            fg=COLOR_CYAN,
            bg=COLOR_BG_PANEL,
            font=FONT_MINI
        )
        pin_label.pack(side="right", padx=4)

        # Main Body Container
        self.body = tk.Frame(self.outer_frame, bg=COLOR_BG_DARK, padx=10, pady=8)
        self.body.pack(fill="both", expand=True)

        # 2. Today's Pending Summary Card
        self.summary_card = tk.Frame(self.body, bg=COLOR_BG_PANEL, padx=8, pady=6)
        self.summary_card.pack(fill="x", pady=(0, 6))

        self.summary_label = tk.Label(
            self.summary_card, 
            text="PENDING TASKS: 0", 
            fg=COLOR_LIME, 
            bg=COLOR_BG_PANEL, 
            font=FONT_MONO_BOLD
        )
        self.summary_label.pack(side="left")

        self.progress_text = tk.Label(
            self.summary_card, 
            text="0% DONE", 
            fg=COLOR_PURPLE, 
            bg=COLOR_BG_PANEL, 
            font=FONT_MINI
        )
        self.progress_text.pack(side="right")

        # Mini Progress Bar
        self.progress_canvas = tk.Canvas(
            self.summary_card, 
            height=4, 
            bg="#090e1a", 
            highlightthickness=0
        )
        self.progress_canvas.pack(fill="x", side="bottom", pady=(4, 0))

        # 3. Tasks Header
        tasks_hdr = tk.Frame(self.body, bg=COLOR_BG_DARK)
        tasks_hdr.pack(fill="x", pady=(2, 4))
        
        tk.Label(
            tasks_hdr, 
            text="🎯 UPCOMING PRIORITIES", 
            fg=COLOR_TEXT_DIM, 
            bg=COLOR_BG_DARK, 
            font=FONT_MINI
        ).pack(side="left")

        # Tasks Container (shows up to 3 upcoming tasks)
        self.tasks_container = tk.Frame(self.body, bg=COLOR_BG_DARK)
        self.tasks_container.pack(fill="x", pady=(0, 6))

        # 4. Compact Focus Timer Card
        timer_card = tk.Frame(self.body, bg=COLOR_BG_PANEL, padx=8, pady=8)
        timer_card.pack(fill="x", pady=(0, 8))

        # Mode Selector Buttons
        timer_mode_row = tk.Frame(timer_card, bg=COLOR_BG_PANEL)
        timer_mode_row.pack(fill="x", pady=(0, 4))

        self.btn_mode_focus = tk.Button(
            timer_mode_row, 
            text="🧠 FOCUS (25M)", 
            command=lambda: self.set_timer_mode("focus"),
            fg=COLOR_LIME, 
            bg=COLOR_BG_CARD, 
            activebackground=COLOR_LIME, 
            activeforeground="#000",
            font=FONT_MINI, 
            bd=1, 
            relief="solid",
            cursor="hand2"
        )
        self.btn_mode_focus.pack(side="left", expand=True, fill="x", padx=(0, 2))

        self.btn_mode_break = tk.Button(
            timer_mode_row, 
            text="☕ BREAK (5M)", 
            command=lambda: self.set_timer_mode("break"),
            fg=COLOR_TEXT_DIM, 
            bg=COLOR_BG_PANEL, 
            activebackground=COLOR_CYAN, 
            activeforeground="#000",
            font=FONT_MINI, 
            bd=1, 
            relief="solid",
            cursor="hand2"
        )
        self.btn_mode_break.pack(side="left", expand=True, fill="x", padx=(2, 0))

        # Timer Digits Display
        self.timer_label = tk.Label(
            timer_card, 
            text="25:00", 
            fg=COLOR_LIME, 
            bg=COLOR_BG_PANEL, 
            font=FONT_DIGITS
        )
        self.timer_label.pack(pady=2)

        self.timer_subtext = tk.Label(
            timer_card, 
            text="[READY — PRESS START]", 
            fg=COLOR_TEXT_MUTED, 
            bg=COLOR_BG_PANEL, 
            font=FONT_MINI
        )
        self.timer_subtext.pack(pady=(0, 6))

        # Timer Control Buttons (Start/Pause, Reset)
        timer_ctrls = tk.Frame(timer_card, bg=COLOR_BG_PANEL)
        timer_ctrls.pack(fill="x")

        self.btn_timer_toggle = tk.Button(
            timer_ctrls, 
            text="▶ START", 
            command=self.toggle_timer,
            fg="#000000", 
            bg=COLOR_LIME, 
            activebackground="#55ff33", 
            font=FONT_MONO_BOLD, 
            bd=0, 
            pady=4,
            cursor="hand2"
        )
        self.btn_timer_toggle.pack(side="left", expand=True, fill="x", padx=(0, 4))

        self.btn_timer_reset = tk.Button(
            timer_ctrls, 
            text="⏹ RESET", 
            command=self.reset_timer,
            fg="#ffffff", 
            bg=COLOR_PINK, 
            activebackground="#ff3399", 
            font=FONT_MONO_BOLD, 
            bd=0, 
            pady=4,
            cursor="hand2"
        )
        self.btn_timer_reset.pack(side="left", expand=True, fill="x")

        # 5. Open Full Website Dashboard Button
        dash_btn = tk.Button(
            self.body, 
            text="🌐 OPEN FULL DASHBOARD", 
            command=self.open_full_dashboard,
            fg=COLOR_CYAN, 
            bg=COLOR_BG_CARD, 
            activebackground=COLOR_CYAN, 
            activeforeground="#000",
            font=FONT_MONO_BOLD, 
            bd=1, 
            relief="solid", 
            pady=6,
            cursor="hand2"
        )
        dash_btn.pack(fill="x", side="bottom")

    # =========================================================
    # Window Movement & Controls
    # =========================================================

    def start_drag(self, event):
        self.drag_start_x = event.x
        self.drag_start_y = event.y

    def do_drag(self, event):
        deltax = event.x - self.drag_start_x
        deltay = event.y - self.drag_start_y
        x = self.root.winfo_x() + deltax
        y = self.root.winfo_y() + deltay
        self.root.geometry(f"+{x}+{y}")

    def close_widget(self):
        self.play_beep(600, 80)
        self.root.destroy()
        sys.exit(0)

    def minimize_widget(self):
        """Hides the frameless window or temporarily minimizes it."""
        self.play_beep(500, 80)
        self.root.withdraw()
        # Create a small floating restore bubble so user can reopen easily
        self.create_restore_bubble()

    def create_restore_bubble(self):
        self.bubble = tk.Toplevel()
        self.bubble.overrideredirect(True)
        self.bubble.wm_attributes("-topmost", True)
        self.bubble.configure(bg=COLOR_LIME)

        screen_w = self.root.winfo_screenwidth()
        self.bubble.geometry(f"120x26+{screen_w - 130}+20")

        lbl = tk.Label(
            self.bubble, 
            text="💾 RESTORE STUDY", 
            bg=COLOR_LIME, 
            fg="#000000", 
            font=FONT_MINI, 
            cursor="hand2"
        )
        lbl.pack(fill="both", expand=True)
        lbl.bind("<Button-1>", self.restore_from_bubble)

    def restore_from_bubble(self, event=None):
        self.play_beep(800, 80)
        if hasattr(self, 'bubble') and self.bubble:
            self.bubble.destroy()
        self.root.deiconify()

    def open_full_dashboard(self):
        self.play_beep(900, 100)
        # Open full dashboard in default browser
        url = "http://127.0.0.1:8000"
        webbrowser.open(url)

    # =========================================================
    # Data Loading & Synchronization
    # =========================================================

    def load_data(self):
        try:
            if os.path.exists(DATA_FILE):
                mtime = os.path.getmtime(DATA_FILE)
                with open(DATA_FILE, "r", encoding="utf-8") as f:
                    data = json.load(f)
                self.last_data_mtime = mtime
                self.tasks = data.get("tasks", [])
                self.subjects = data.get("subjects", [])
            else:
                self.tasks = []
                self.subjects = []
        except Exception as e:
            # Fallback safe
            pass
        self.render_tasks()

    def save_data(self):
        try:
            data = {}
            if os.path.exists(DATA_FILE):
                with open(DATA_FILE, "r", encoding="utf-8") as f:
                    data = json.load(f)
            data["tasks"] = self.tasks
            data["subjects"] = self.subjects
            data["savedAt"] = time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())
            with open(DATA_FILE, "w", encoding="utf-8") as f:
                json.dump(data, f, indent=2)
            self.last_data_mtime = os.path.getmtime(DATA_FILE)
        except Exception as e:
            pass

    def auto_refresh_data(self):
        """Polls data file to reflect new tasks added via web dashboard."""
        try:
            if os.path.exists(DATA_FILE):
                mtime = os.path.getmtime(DATA_FILE)
                if mtime > self.last_data_mtime:
                    self.load_data()
        except Exception:
            pass
        self.root.after(2500, self.auto_refresh_data)

    def render_tasks(self):
        # Clear existing task widgets
        for widget in self.tasks_container.winfo_children():
            widget.destroy()

        today_str = time.strftime("%Y-%m-%d")
        total_tasks = len(self.tasks)
        pending_tasks = [t for t in self.tasks if not t.get("completed", False)]
        completed_count = total_tasks - len(pending_tasks)

        # Update Summary Labels
        self.summary_label.config(text=f"PENDING: {len(pending_tasks)} TASKS")
        pct = 0 if total_tasks == 0 else int((completed_count / total_tasks) * 100)
        self.progress_text.config(text=f"{completed_count}/{total_tasks} ({pct}%)")

        # Redraw Progress Bar
        self.progress_canvas.delete("all")
        bar_width = int(280 * (pct / 100.0))
        if bar_width > 0:
            self.progress_canvas.create_rectangle(0, 0, bar_width, 4, fill=COLOR_LIME, width=0)

        # Sort pending tasks: due today/overdue first, then by priority
        def sort_key(t):
            due = t.get("dueDate", "9999-99-99")
            prio_val = {"high": 1, "medium": 2, "low": 3}.get(t.get("priority", "medium"), 2)
            return (due, prio_val)

        sorted_pending = sorted(pending_tasks, key=sort_key)
        upcoming_display = sorted_pending[:3]

        if not upcoming_display:
            empty_frame = tk.Frame(self.tasks_container, bg=COLOR_BG_CARD, padx=8, pady=10)
            empty_frame.pack(fill="x")
            tk.Label(
                empty_frame, 
                text="> NO PENDING TASKS", 
                fg=COLOR_LIME, 
                bg=COLOR_BG_CARD, 
                font=FONT_MONO_BOLD
            ).pack()
            tk.Label(
                empty_frame, 
                text="All caught up! Add tasks in dashboard.", 
                fg=COLOR_TEXT_DIM, 
                bg=COLOR_BG_CARD, 
                font=FONT_MINI
            ).pack()
            return

        for task in upcoming_display:
            self.create_task_row(task, today_str)

    def create_task_row(self, task, today_str):
        row = tk.Frame(self.tasks_container, bg=COLOR_BG_CARD, padx=6, pady=4)
        row.pack(fill="x", pady=2)

        # Checkbox complete button
        chk = tk.Button(
            row, 
            text="✓", 
            command=lambda tid=task["id"]: self.complete_task(tid),
            fg=COLOR_LIME, 
            bg=COLOR_BG_PANEL, 
            activebackground=COLOR_LIME, 
            activeforeground="#000",
            font=FONT_MINI, 
            bd=1, 
            relief="solid", 
            width=2, 
            cursor="hand2"
        )
        chk.pack(side="left", padx=(0, 6))

        # Title & Meta Info
        info_frame = tk.Frame(row, bg=COLOR_BG_CARD)
        info_frame.pack(side="left", fill="x", expand=True)

        title = task.get("title", "Untitled")
        if len(title) > 22:
            title = title[:20] + "..."

        t_lbl = tk.Label(
            info_frame, 
            text=title, 
            fg=COLOR_TEXT, 
            bg=COLOR_BG_CARD, 
            font=FONT_MONO_BOLD, 
            anchor="w"
        )
        t_lbl.pack(fill="x")

        # Meta line: Subject & Due badge
        due = task.get("dueDate", "")
        prio = task.get("priority", "medium").upper()
        prio_color = COLOR_PINK if prio == "HIGH" else (COLOR_PURPLE if prio == "MEDIUM" else COLOR_LIME)

        meta_frame = tk.Frame(info_frame, bg=COLOR_BG_CARD)
        meta_frame.pack(fill="x")

        tk.Label(
            meta_frame, 
            text=f"[{prio[:1]}]", 
            fg=prio_color, 
            bg=COLOR_BG_CARD, 
            font=FONT_MINI
        ).pack(side="left")

        due_txt = "TODAY" if due == today_str else (f"DUE {due[5:]}" if len(due) >= 10 else due)
        tk.Label(
            meta_frame, 
            text=f"{task.get('subject', '')} • {due_txt}", 
            fg=COLOR_TEXT_DIM, 
            bg=COLOR_BG_CARD, 
            font=FONT_MINI
        ).pack(side="left", padx=4)

    def complete_task(self, task_id):
        self.play_beep(1200, 120)
        for t in self.tasks:
            if t.get("id") == task_id:
                t["completed"] = True
                break
        self.save_data()
        self.render_tasks()

    # =========================================================
    # Focus Timer Logic
    # =========================================================

    def set_timer_mode(self, mode):
        self.play_beep(700, 60)
        self.pause_timer()
        self.timer_mode = mode
        if mode == "focus":
            self.timer_total = 25 * 60
            self.timer_seconds = 25 * 60
            self.btn_mode_focus.config(bg=COLOR_BG_CARD, fg=COLOR_LIME)
            self.btn_mode_break.config(bg=COLOR_BG_PANEL, fg=COLOR_TEXT_DIM)
            self.timer_label.config(fg=COLOR_LIME)
        else:
            self.timer_total = 5 * 60
            self.timer_seconds = 5 * 60
            self.btn_mode_break.config(bg=COLOR_BG_CARD, fg=COLOR_CYAN)
            self.btn_mode_focus.config(bg=COLOR_BG_PANEL, fg=COLOR_TEXT_DIM)
            self.timer_label.config(fg=COLOR_CYAN)

        self.timer_subtext.config(text="[READY — PRESS START]")
        self.update_timer_display()

    def toggle_timer(self):
        self.play_beep(800, 60)
        if self.timer_running:
            self.pause_timer()
        else:
            self.start_timer()

    def start_timer(self):
        self.timer_running = True
        self.timer_end_time = time.time() + self.timer_seconds
        self.btn_timer_toggle.config(text="⏸ PAUSE", bg=COLOR_PURPLE)
        self.timer_subtext.config(text="[SESSION RUNNING]", fg=COLOR_LIME)

    def pause_timer(self):
        self.timer_running = False
        self.timer_end_time = None
        self.btn_timer_toggle.config(text="▶ START", bg=COLOR_LIME)
        self.timer_subtext.config(text="[PAUSED]", fg=COLOR_TEXT_DIM)

    def reset_timer(self):
        self.play_beep(600, 60)
        self.pause_timer()
        self.timer_seconds = self.timer_total
        self.timer_subtext.config(text="[TIMER RESET]")
        self.update_timer_display()

    def timer_tick(self):
        if self.timer_running and self.timer_end_time:
            remaining = int(self.timer_end_time - time.time())
            if remaining <= 0:
                self.timer_seconds = 0
                self.update_timer_display()
                self.timer_completed()
            else:
                self.timer_seconds = remaining
                self.update_timer_display()

        self.root.after(500, self.timer_tick)

    def update_timer_display(self):
        m = self.timer_seconds // 60
        s = self.timer_seconds % 60
        self.timer_label.config(text=f"{m:02d}:{s:02d}")

    def timer_completed(self):
        self.pause_timer()
        # Chime celebration
        for freq in [523, 659, 783, 1046]:
            self.play_beep(freq, 120)
            time.sleep(0.05)

        is_focus = (self.timer_mode == "focus")
        alert_msg = "[SESSION COMPLETE! TAKE A BREAK]" if is_focus else "[BREAK COMPLETE! TIME TO FOCUS]"
        self.timer_subtext.config(text=alert_msg, fg=COLOR_PINK)
        self.timer_label.config(text="00:00")

def main():
    root = tk.Tk()
    app = StudyExeWidget(root)
    root.mainloop()

if __name__ == "__main__":
    main()
