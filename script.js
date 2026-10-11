/**
 * STUDY.EXE // CYBER PRODUCTIVITY TERMINAL
 * Plain Vanilla JavaScript implementation.
 * Designed to be clean, modular, and beginner-friendly.
 */

/* ===================================================================
   1. GLOBAL STATE & CONSTANTS
   =================================================================== */

// Key used to store everything safely inside your browser's private localStorage.
const STORAGE_KEY = "STUDY_EXE_DATA_V1";

// Default motivating retro cyber quotes for the dashboard
const MOTIVATIONAL_QUOTES = [
  "\"BYTE BY BYTE, YOU COMPILE SUCCESS. INITIALIZE YOUR FOCUS SESSIONS.\"",
  "\"MEMORY CAPACITY: EXPANDING. STAY DISCIPLINED, OPERATOR.\"",
  "\"EVERY SMALL TASK INITIALIZED IS AN ERROR ELIMINATED FROM THE FINAL EXAM.\"",
  "\"SYSTEM STABLE. COGNITIVE ENGINE AT MAXIMUM POWER.\"",
  "\"FOCUS DEEP: 25 MINUTES OF PURE CONCENTRATION OUTPERFORMS HOURS OF CHAOS.\"",
  "\"EXECUTION BEATS OVERTHINKING. CRUSH TODAY'S OBJECTIVES.\"",
  "\"LEARNING IN PROGRESS: SYNAPSES FIRING AT 100% EFFICIENCY.\""
];

// Master application state object
let state = {
  tasks: [],
  subjects: [],
  notes: [],
  activeNoteId: null,
  timer: {
    mode: "focus", // 'focus' (25m), 'shortBreak' (5m), 'longBreak' (15m)
    totalSeconds: 25 * 60,
    remainingSeconds: 25 * 60,
    isRunning: false,
    endTime: null, // Target timestamp for tab-throttling immunity
    completedSessions: 0
  },
  settings: {
    soundEnabled: true,
    scanlinesEnabled: true
  }
};

// Timer interval reference holder
let timerIntervalId = null;

// Debounce timer reference for auto-saving notes
let noteSaveDebounceTimeout = null;

/* ===================================================================
   2. RETRO 8-BIT AUDIO SYNTHESIZER (WEB AUDIO API)
   =================================================================== */

/**
 * Generates classic retro synth sound effects entirely offline
 * using the browser's native AudioContext. No external mp3 files needed!
 */
class RetroSynth {
  constructor() {
    this.ctx = null;
  }

  // AudioContext must be initiated after user interaction
  init() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === "suspended") {
      this.ctx.resume();
    }
  }

  // Play a short retro UI blip when clicking buttons
  playClick() {
    if (!state.settings.soundEnabled) return;
    try {
      this.init();
      if (!this.ctx) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = "triangle";
      osc.frequency.setValueAtTime(440, this.ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(880, this.ctx.currentTime + 0.05);

      gain.gain.setValueAtTime(0.08, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.05);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start();
      osc.stop(this.ctx.currentTime + 0.05);
    } catch (e) {
      // Audio fallback silent
    }
  }

  // Play a celebratory retro chime when a timer ends or big task is completed
  playChime() {
    if (!state.settings.soundEnabled) return;
    try {
      this.init();
      if (!this.ctx) return;
      const notes = [523.25, 659.25, 783.99, 1046.50]; // C5, E5, G5, C6
      notes.forEach((freq, idx) => {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        const startTime = this.ctx.currentTime + (idx * 0.1);

        osc.type = "square";
        osc.frequency.setValueAtTime(freq, startTime);

        gain.gain.setValueAtTime(0.12, startTime);
        gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.25);

        osc.connect(gain);
        gain.connect(this.ctx.destination);

        osc.start(startTime);
        osc.stop(startTime + 0.25);
      });
    } catch (e) {
      // Audio fallback silent
    }
  }
}

const synth = new RetroSynth();

/* ===================================================================
   3. PERSISTENCE & LOCAL STORAGE ENGINE
   =================================================================== */

/**
 * Loads saved data from localStorage on startup.
 * Handles missing, invalid, or corrupted data gracefully without crashing.
 */
function loadDataFromStorage() {
  try {
    const rawData = localStorage.getItem(STORAGE_KEY);
    if (!rawData) {
      setTicker("SYSTEM INITIALIZED. LOCAL STORAGE READY.");
      return;
    }

    const parsed = JSON.parse(rawData);

    // Validate and merge safely into state
    if (parsed && typeof parsed === "object") {
      if (Array.isArray(parsed.tasks)) state.tasks = parsed.tasks;
      if (Array.isArray(parsed.subjects)) state.subjects = parsed.subjects;
      if (Array.isArray(parsed.notes)) state.notes = parsed.notes;

      if (parsed.settings && typeof parsed.settings === "object") {
        if (typeof parsed.settings.soundEnabled === "boolean") {
          state.settings.soundEnabled = parsed.settings.soundEnabled;
        }
        if (typeof parsed.settings.scanlinesEnabled === "boolean") {
          state.settings.scanlinesEnabled = parsed.settings.scanlinesEnabled;
        }
      }

      if (parsed.timer && typeof parsed.timer === "object") {
        if (typeof parsed.timer.completedSessions === "number") {
          state.timer.completedSessions = parsed.timer.completedSessions;
        }
      }

      setTicker("DATA RESTORED FROM DISK SUCCESSFULLY.");
    }
  } catch (err) {
    console.error("Warning: Error parsing saved data:", err);
    setTicker("NOTICE: STORAGE PARSE ERROR. USING CLEAN SESSION.", true);
  }

  // Attempt shared file sync if served via local server bridge
  syncWithSharedDataFile();
}

/**
 * Saves current master state into localStorage.
 * Updates system ticker and handles quota errors cleanly.
 */
function saveDataToStorage() {
  try {
    const exportableState = {
      tasks: state.tasks,
      subjects: state.subjects,
      notes: state.notes,
      settings: state.settings,
      timer: {
        completedSessions: state.timer.completedSessions
      },
      savedAt: new Date().toISOString()
    };

    localStorage.setItem(STORAGE_KEY, JSON.stringify(exportableState));
    updateStorageTelemetry();
    syncExportToSharedDataFile(exportableState);
  } catch (err) {
    console.error("Local storage error:", err);
    setTicker("ERROR: FAILED TO WRITE TO LOCAL DISK!", true);
  }
}

/**
 * Sync helpers for shared desktop widget data
 */
function syncWithSharedDataFile() {
  if (window.location.protocol === "http:" || window.location.protocol === "https:") {
    fetch("/api/data")
      .then(res => res.ok ? res.json() : null)
      .then(remote => {
        if (remote && typeof remote === "object") {
          let updated = false;
          if (Array.isArray(remote.tasks) && remote.tasks.length > 0 && state.tasks.length === 0) {
            state.tasks = remote.tasks;
            updated = true;
          }
          if (Array.isArray(remote.subjects) && remote.subjects.length > 0 && state.subjects.length === 0) {
            state.subjects = remote.subjects;
            updated = true;
          }
          if (Array.isArray(remote.notes) && remote.notes.length > 0 && state.notes.length === 0) {
            state.notes = remote.notes;
            updated = true;
          }
          if (updated) {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
            renderDashboard();
            renderTasks();
            renderRevision();
            renderNotes();
            updateStorageTelemetry();
            setTicker("SYNCED WITH SHARED DESKTOP FILE.");
          }
        }
      })
      .catch(() => {});
  }
}

function syncExportToSharedDataFile(data) {
  if (window.location.protocol === "http:" || window.location.protocol === "https:") {
    fetch("/api/data", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data)
    }).catch(() => {});
  }
}

/**
 * Updates telemetry numbers and system screen indicators.
 */
function updateStorageTelemetry() {
  const elTasks = document.getElementById("sysTasksCount");
  const elSubs = document.getElementById("sysSubjectsCount");
  const elNotes = document.getElementById("sysNotesCount");

  if (elTasks) elTasks.textContent = `${state.tasks.length} records`;
  if (elSubs) elSubs.textContent = `${state.subjects.length} records`;
  if (elNotes) elNotes.textContent = `${state.notes.length} records`;
}

/**
 * Sets a brief message in the bottom status bar.
 */
function setTicker(msg, isError = false) {
  const ticker = document.getElementById("statusTicker");
  const led = document.getElementById("statusLed");
  if (!ticker) return;

  ticker.textContent = msg;
  if (isError) {
    ticker.style.color = "var(--hot-pink)";
    if (led) {
      led.className = "status-led";
      led.style.backgroundColor = "var(--hot-pink)";
      led.style.boxShadow = "0 0 8px var(--hot-pink-glow)";
    }
  } else {
    ticker.style.color = "var(--text-dim)";
    if (led) {
      led.className = "status-led led-green";
      led.style.backgroundColor = "";
      led.style.boxShadow = "";
    }
  }
}

/* ===================================================================
   4. NAVIGATION & TAB SWITCHING
   =================================================================== */

function switchTab(tabId) {
  synth.playClick();

  // Deactivate all tab buttons and panels
  const allTabs = document.querySelectorAll(".nav-tab");
  const allPanels = document.querySelectorAll(".tab-content");

  allTabs.forEach(t => {
    t.classList.remove("active");
    t.setAttribute("aria-selected", "false");
  });

  allPanels.forEach(p => {
    p.classList.remove("active");
  });

  // Activate selected tab and panel
  const activeBtn = document.getElementById(`tabBtn-${tabId}`);
  const activePanel = document.getElementById(`view-${tabId}`);

  if (activeBtn && activePanel) {
    activeBtn.classList.add("active");
    activeBtn.setAttribute("aria-selected", "true");
    activePanel.classList.add("active");
  }

  // Trigger view updates when switching
  if (tabId === "dashboard") {
    renderDashboard();
  } else if (tabId === "tasks") {
    renderTasks();
  } else if (tabId === "revision") {
    renderRevision();
  } else if (tabId === "notes") {
    renderNotes();
  } else if (tabId === "system") {
    updateStorageTelemetry();
  }
}

/* ===================================================================
   5. DASHBOARD VIEW CONTROLLER
   =================================================================== */

function renderDashboard() {
  // Update Live Date string in Welcome Banner
  const dateEl = document.getElementById("welcomeDateStr");
  if (dateEl) {
    const now = new Date();
    dateEl.textContent = now.toLocaleDateString("en-US", {
      month: "long",
      day: "numeric",
      year: "numeric"
    }).toUpperCase();
  }

  // Calculate stats
  const pendingCount = state.tasks.filter(t => !t.completed).length;
  const completedCount = state.tasks.filter(t => t.completed).length;

  // Due Soon: within next 48 hours or overdue
  const todayStr = getLocalDateString(new Date());
  const dueSoonCount = state.tasks.filter(t => {
    if (t.completed) return false;
    return t.dueDate <= todayStr || isDueSoon(t.dueDate);
  }).length;

  // Revision topics completed count
  let totalMasteredTopics = 0;
  state.subjects.forEach(s => {
    totalMasteredTopics += s.topics.filter(tp => tp.status === "completed").length;
  });

  // Update counters
  const elPending = document.getElementById("statPendingTasks");
  const elCompleted = document.getElementById("statCompletedTasks");
  const elDueSoon = document.getElementById("statDueSoonTasks");
  const elRevCompleted = document.getElementById("statRevisionCompleted");
  const elTasksBadge = document.getElementById("tasksBadge");
  const elDashSessions = document.getElementById("dashFocusSessionsCount");

  if (elPending) elPending.textContent = pendingCount;
  if (elCompleted) elCompleted.textContent = completedCount;
  if (elDueSoon) elDueSoon.textContent = dueSoonCount;
  if (elRevCompleted) elRevCompleted.textContent = totalMasteredTopics;
  if (elTasksBadge) elTasksBadge.textContent = pendingCount;
  if (elDashSessions) elDashSessions.textContent = state.timer.completedSessions;

  // Render Priorities List
  renderDashboardPriorities();

  // Render Revision Summary
  renderDashboardRevisionSummary();
}

/**
 * Renders priority tasks in Dashboard (due today, overdue, or high priority pending).
 */
function renderDashboardPriorities() {
  const container = document.getElementById("dashboardPrioritiesList");
  const countBadge = document.getElementById("prioritiesCount");
  if (!container) return;

  const todayStr = getLocalDateString(new Date());

  // Prioritize pending tasks: Overdue & Today first, then High priority, then sorted by due date
  const priorityTasks = state.tasks
    .filter(t => !t.completed)
    .sort((a, b) => {
      // Overdue first
      const aOverdue = a.dueDate < todayStr;
      const bOverdue = b.dueDate < todayStr;
      if (aOverdue && !bOverdue) return -1;
      if (!aOverdue && bOverdue) return 1;

      // Due date comparison
      if (a.dueDate < b.dueDate) return -1;
      if (a.dueDate > b.dueDate) return 1;

      // Priority comparison
      const prioWeight = { high: 3, medium: 2, low: 1 };
      return prioWeight[b.priority] - prioWeight[a.priority];
    })
    .slice(0, 5); // Take top 5

  if (countBadge) {
    countBadge.textContent = `${priorityTasks.length} ITEMS`;
  }

  if (priorityTasks.length === 0) {
    container.innerHTML = `
      <div class="retro-terminal-prompt">
        <p class="text-lime">> NO PENDING PRIORITIES</p>
        <p class="text-dim">All caught up! Add a new task or enjoy your free time.</p>
      </div>
    `;
    return;
  }

  let html = "";
  priorityTasks.forEach(task => {
    const isOverdue = task.dueDate < todayStr;
    const isToday = task.dueDate === todayStr;

    let urgencyTag = "";
    if (isOverdue) {
      urgencyTag = `<span class="badge-urgent">[OVERDUE]</span>`;
    } else if (isToday) {
      urgencyTag = `<span class="badge-today">[DUE TODAY]</span>`;
    } else {
      urgencyTag = `<span class="badge-upcoming">[DUE ${task.dueDate}]</span>`;
    }

    html += `
      <div class="task-item priority-${task.priority}">
        <button class="task-checkbox-btn" onclick="toggleTaskCompletion('${task.id}')" aria-label="Mark task ${escapeHtml(task.title)} complete">
          ✓
        </button>
        <div class="task-info-block">
          <div class="task-title-line">
            <span class="task-title-text">${escapeHtml(task.title)}</span>
            ${urgencyTag}
          </div>
          <div class="task-meta-line">
            <span class="task-subject-tag">${escapeHtml(task.subject)}</span>
            <span class="task-due-date">Priority: ${task.priority.toUpperCase()}</span>
          </div>
        </div>
      </div>
    `;
  });

  container.innerHTML = html;
}

/**
 * Mini overview of revision subjects on the dashboard.
 */
function renderDashboardRevisionSummary() {
  const container = document.getElementById("dashboardRevisionSummary");
  if (!container) return;

  if (state.subjects.length === 0) {
    container.innerHTML = `
      <div class="retro-terminal-prompt">
        <p class="text-purple">> NO REVISION SUBJECTS</p>
        <p class="text-dim">Add courses in the Revision tab to track exam readiness.</p>
      </div>
    `;
    return;
  }

  let html = "";
  state.subjects.slice(0, 3).forEach(subject => {
    const total = subject.topics.length;
    const completed = subject.topics.filter(t => t.status === "completed").length;
    const pct = total === 0 ? 0 : Math.round((completed / total) * 100);

    html += `
      <div class="subject-mini-item">
        <div class="subject-progress-labels">
          <span class="text-main font-bold">${escapeHtml(subject.name)}</span>
          <span class="text-lime">${completed}/${total} topics (${pct}%)</span>
        </div>
        <div class="subject-progress-track">
          <div class="subject-progress-fill" style="width: ${pct}%;"></div>
        </div>
      </div>
    `;
  });

  container.innerHTML = html;
}

/* ===================================================================
   6. TASK MANAGER VIEW CONTROLLER
   =================================================================== */

let taskFilter = "all"; // 'all' | 'pending' | 'completed'
let taskPriorityFilter = "all"; // 'all' | 'high' | 'medium' | 'low'

function renderTasks() {
  const container = document.getElementById("tasksListContainer");
  if (!container) return;

  // Update subject datalist for autocomplete
  updateSubjectDatalist();

  // Update filter counters
  const totalCount = state.tasks.length;
  const pendingCount = state.tasks.filter(t => !t.completed).length;
  const completedCount = state.tasks.filter(t => t.completed).length;

  document.getElementById("countFilterAll").textContent = totalCount;
  document.getElementById("countFilterPending").textContent = pendingCount;
  document.getElementById("countFilterCompleted").textContent = completedCount;
  document.getElementById("tasksBadge").textContent = pendingCount;

  // Filter tasks
  let filtered = state.tasks.filter(task => {
    if (taskFilter === "pending" && task.completed) return false;
    if (taskFilter === "completed" && !task.completed) return false;
    if (taskPriorityFilter !== "all" && task.priority !== taskPriorityFilter) return false;
    return true;
  });

  // Sort tasks: pending first, then by due date
  const todayStr = getLocalDateString(new Date());
  filtered.sort((a, b) => {
    if (a.completed !== b.completed) return a.completed ? 1 : -1;
    if (a.dueDate < b.dueDate) return -1;
    if (a.dueDate > b.dueDate) return 1;
    return 0;
  });

  // Empty state handling
  if (filtered.length === 0) {
    let emptyMsg = "NO TASKS FOUND.";
    let subMsg = "Fill in the form above to initialize your first assignment!";
    if (taskFilter === "completed") {
      emptyMsg = "NO COMPLETED TASKS YET.";
      subMsg = "Check off tasks as you finish them to see them here.";
    } else if (taskFilter === "pending") {
      emptyMsg = "ALL TASKS ARE COMPLETED!";
      subMsg = "Great job! Your queue is clear.";
    }

    container.innerHTML = `
      <div class="retro-terminal-prompt">
        <p class="text-lime">> ${emptyMsg}</p>
        <p class="text-dim">${subMsg}</p>
      </div>
    `;
    return;
  }

  // Render list of tasks
  let html = "";
  filtered.forEach(task => {
    const isCompleted = task.completed;
    const isOverdue = !isCompleted && task.dueDate < todayStr;
    const isToday = !isCompleted && task.dueDate === todayStr;

    let badgeHtml = "";
    if (isCompleted) {
      badgeHtml = `<span class="badge-completed">[COMPLETED]</span>`;
    } else if (isOverdue) {
      badgeHtml = `<span class="badge-urgent">[OVERDUE]</span>`;
    } else if (isToday) {
      badgeHtml = `<span class="badge-today">[DUE TODAY]</span>`;
    } else {
      badgeHtml = `<span class="badge-upcoming">[DUE ${task.dueDate}]</span>`;
    }

    html += `
      <div class="task-item priority-${task.priority} ${isCompleted ? 'is-completed' : ''}" id="task-card-${task.id}">
        <button class="task-checkbox-btn" onclick="toggleTaskCompletion('${task.id}')" title="Toggle completion" aria-label="Toggle task status">
          ${isCompleted ? '✓' : ''}
        </button>
        <div class="task-info-block">
          <div class="task-title-line">
            <span class="task-title-text">${escapeHtml(task.title)}</span>
            ${badgeHtml}
          </div>
          <div class="task-meta-line">
            <span class="task-subject-tag">${escapeHtml(task.subject)}</span>
            <span class="task-due-date">📅 Due: ${task.dueDate}</span>
            <span class="text-dim">Priority: ${task.priority.toUpperCase()}</span>
          </div>
        </div>
        <div class="task-actions">
          <button class="retro-btn btn-neon-sm" onclick="editTask('${task.id}')" title="Edit task" aria-label="Edit task">
            ✎ EDIT
          </button>
          <button class="retro-btn btn-pink-sm" onclick="confirmDeleteTask('${task.id}')" title="Delete task" aria-label="Delete task">
            🗑️ DELETE
          </button>
        </div>
      </div>
    `;
  });

  container.innerHTML = html;
}

/**
 * Handles adding a new task from the Task form with validation.
 */
function handleAddTask(e) {
  e.preventDefault();

  const titleInput = document.getElementById("taskTitleInput");
  const subjectInput = document.getElementById("taskSubjectInput");
  const dateInput = document.getElementById("taskDueDateInput");
  const priorityInput = document.getElementById("taskPriorityInput");

  const titleErr = document.getElementById("taskTitleError");
  const subjectErr = document.getElementById("taskSubjectError");
  const dateErr = document.getElementById("taskDueDateError");

  // Reset errors
  titleErr.classList.remove("visible");
  subjectErr.classList.remove("visible");
  dateErr.classList.remove("visible");

  const titleVal = titleInput.value.trim();
  const subjectVal = subjectInput.value.trim();
  const dateVal = dateInput.value;
  const priorityVal = priorityInput.value;

  let hasError = false;

  if (!titleVal) {
    titleErr.classList.add("visible");
    hasError = true;
  }

  if (!subjectVal) {
    subjectErr.classList.add("visible");
    hasError = true;
  }

  if (!dateVal || isNaN(Date.parse(dateVal))) {
    dateErr.classList.add("visible");
    hasError = true;
  }

  if (hasError) {
    synth.playClick();
    return;
  }

  // Create new task object
  const newTask = {
    id: "task_" + Date.now() + "_" + Math.floor(Math.random() * 1000),
    title: titleVal,
    subject: subjectVal,
    dueDate: dateVal,
    priority: priorityVal,
    completed: false,
    createdAt: new Date().toISOString()
  };

  state.tasks.unshift(newTask);
  saveDataToStorage();

  // Reset form inputs except subject for ease of batch entry
  titleInput.value = "";
  titleInput.focus();

  synth.playClick();
  setTicker(`TASK INITIALIZED: "${newTask.title.substring(0, 20)}..."`);
  renderTasks();
  renderDashboard();
}

/**
 * Toggles a task between completed and pending.
 */
function toggleTaskCompletion(taskId) {
  const task = state.tasks.find(t => t.id === taskId);
  if (!task) return;

  task.completed = !task.completed;
  saveDataToStorage();

  if (task.completed) {
    synth.playChime();
    setTicker(`TASK COMPLETED: "${task.title}"`);
  } else {
    synth.playClick();
    setTicker(`TASK MARKED PENDING: "${task.title}"`);
  }

  renderTasks();
  renderDashboard();
}

/**
 * Prompts confirmation and deletes a task.
 */
function confirmDeleteTask(taskId) {
  const task = state.tasks.find(t => t.id === taskId);
  if (!task) return;

  showRetroModal({
    title: "[DELETE TASK CONFIRMATION]",
    icon: "🗑️",
    message: `Are you sure you want to permanently delete task "${escapeHtml(task.title)}"?`,
    confirmText: "DELETE TASK",
    onConfirm: () => {
      state.tasks = state.tasks.filter(t => t.id !== taskId);
      saveDataToStorage();
      synth.playClick();
      setTicker("TASK REMOVED FROM SYSTEM DISK.");
      renderTasks();
      renderDashboard();
    }
  });
}

/**
 * Prompts user to edit a task's title.
 */
function editTask(taskId) {
  const task = state.tasks.find(t => t.id === taskId);
  if (!task) return;

  const newTitle = prompt("Update task title:", task.title);
  if (newTitle !== null && newTitle.trim() !== "") {
    task.title = newTitle.trim();
    saveDataToStorage();
    synth.playClick();
    setTicker(`TASK UPDATED: "${task.title}"`);
    renderTasks();
    renderDashboard();
  }
}

/**
 * Populates datalist for subject input based on existing subjects and tasks.
 */
function updateSubjectDatalist() {
  const datalist = document.getElementById("subjectDatalist");
  if (!datalist) return;

  const subjectsSet = new Set();
  state.subjects.forEach(s => subjectsSet.add(s.name));
  state.tasks.forEach(t => subjectsSet.add(t.subject));

  datalist.innerHTML = Array.from(subjectsSet)
    .map(s => `<option value="${escapeHtml(s)}">`)
    .join("");
}

/* ===================================================================
   7. EXAM REVISION PLANNER CONTROLLER
   =================================================================== */

function renderRevision() {
  const container = document.getElementById("subjectsContainer");
  if (!container) return;

  if (state.subjects.length === 0) {
    container.innerHTML = `
      <div class="retro-terminal-prompt">
        <p class="text-purple">> NO REVISION SUBJECTS CONFIGURED</p>
        <p class="text-dim">Add an exam or course above (e.g. "Linear Algebra", "Cell Biology") to build your syllabus topic checklist.</p>
      </div>
    `;
    return;
  }

  let html = "";
  state.subjects.forEach(subject => {
    const totalTopics = subject.topics.length;
    const completedTopics = subject.topics.filter(t => t.status === "completed").length;
    const pct = totalTopics === 0 ? 0 : Math.round((completedTopics / totalTopics) * 100);

    html += `
      <div class="cyber-card subject-card" id="subject-card-${subject.id}">
        <!-- Subject Header -->
        <div class="subject-header-row">
          <div class="subject-title">
            <span>📖</span> ${escapeHtml(subject.name)}
          </div>
          <button class="retro-btn btn-pink-sm" onclick="confirmDeleteSubject('${subject.id}')" title="Delete subject and topics">
            🗑️ DELETE SUBJECT
          </button>
        </div>

        <!-- Subject Progress Bar -->
        <div class="subject-progress-container">
          <div class="subject-progress-labels">
            <span class="text-dim">REVISION MASTERY PROGRESS:</span>
            <span class="text-lime font-bold">${completedTopics} / ${totalTopics} TOPICS (${pct}%)</span>
          </div>
          <div class="subject-progress-track">
            <div class="subject-progress-fill" style="width: ${pct}%;"></div>
          </div>
        </div>

        <!-- Add Topic Form -->
        <form class="add-topic-row" onsubmit="handleAddTopic(event, '${subject.id}')">
          <input type="text" id="topicInput-${subject.id}" class="retro-input-sm" placeholder="Add topic (e.g. Eigenvectors, Chapter 3 notes...)" autocomplete="off" required>
          <button type="submit" class="retro-btn btn-neon-sm">
            ➕ ADD TOPIC
          </button>
        </form>

        <!-- Topics List -->
        <div class="topics-list">
          ${renderTopicsList(subject)}
        </div>
      </div>
    `;
  });

  container.innerHTML = html;
}

/**
 * Renders the topic rows for a given subject.
 */
function renderTopicsList(subject) {
  if (subject.topics.length === 0) {
    return `
      <div class="text-dim" style="font-size: 11px; padding: 6px 0; font-style: italic;">
        No topics added yet. Enter a topic name above and click [ADD TOPIC].
      </div>
    `;
  }

  let html = "";
  subject.topics.forEach(topic => {
    let statusLabel = "○ NOT STARTED";
    if (topic.status === "in_progress") statusLabel = "◐ IN PROGRESS";
    if (topic.status === "completed") statusLabel = "● MASTERED";

    html += `
      <div class="topic-item">
        <span class="topic-name">${escapeHtml(topic.name)}</span>
        <div class="topic-actions">
          <button 
            class="topic-status-toggle status-${topic.status}" 
            onclick="cycleTopicStatus('${subject.id}', '${topic.id}')"
            title="Click to toggle status: Not Started &rarr; In Progress &rarr; Mastered"
          >
            ${statusLabel}
          </button>
          <button class="retro-btn btn-neon-sm" onclick="editTopic('${subject.id}', '${topic.id}')" title="Rename topic" aria-label="Rename topic">
            ✎
          </button>
          <button class="retro-btn btn-pink-sm" onclick="deleteTopic('${subject.id}', '${topic.id}')" title="Delete topic" aria-label="Delete topic">
            ✕
          </button>
        </div>
      </div>
    `;
  });

  return html;
}

/**
 * Handles adding a new subject.
 */
function handleAddSubject(e) {
  e.preventDefault();
  const input = document.getElementById("subjectNameInput");
  const err = document.getElementById("subjectNameError");

  err.classList.remove("visible");
  const name = input.value.trim();

  if (!name) {
    err.classList.add("visible");
    synth.playClick();
    return;
  }

  const newSubject = {
    id: "subj_" + Date.now() + "_" + Math.floor(Math.random() * 1000),
    name: name,
    topics: [],
    createdAt: new Date().toISOString()
  };

  state.subjects.push(newSubject);
  saveDataToStorage();

  input.value = "";
  synth.playClick();
  setTicker(`SUBJECT ADDED: "${newSubject.name}"`);
  renderRevision();
  renderDashboard();
}

/**
 * Handles adding a topic to a subject.
 */
function handleAddTopic(e, subjectId) {
  e.preventDefault();
  const input = document.getElementById(`topicInput-${subjectId}`);
  if (!input) return;

  const topicName = input.value.trim();
  if (!topicName) return;

  const subject = state.subjects.find(s => s.id === subjectId);
  if (!subject) return;

  subject.topics.push({
    id: "topic_" + Date.now() + "_" + Math.floor(Math.random() * 1000),
    name: topicName,
    status: "not_started" // 'not_started' | 'in_progress' | 'completed'
  });

  saveDataToStorage();
  input.value = "";
  input.focus();

  synth.playClick();
  setTicker(`TOPIC ADDED TO ${subject.name.toUpperCase()}`);
  renderRevision();
  renderDashboard();
}

/**
 * Cycles topic status: not_started -> in_progress -> completed -> not_started.
 */
function cycleTopicStatus(subjectId, topicId) {
  const subject = state.subjects.find(s => s.id === subjectId);
  if (!subject) return;

  const topic = subject.topics.find(t => t.id === topicId);
  if (!topic) return;

  if (topic.status === "not_started") {
    topic.status = "in_progress";
    synth.playClick();
  } else if (topic.status === "in_progress") {
    topic.status = "completed";
    synth.playChime();
    setTicker(`TOPIC MASTERED: "${topic.name}"`);
  } else {
    topic.status = "not_started";
    synth.playClick();
  }

  saveDataToStorage();
  renderRevision();
  renderDashboard();
}

/**
 * Deletes a topic from a subject.
 */
function deleteTopic(subjectId, topicId) {
  const subject = state.subjects.find(s => s.id === subjectId);
  if (!subject) return;

  subject.topics = subject.topics.filter(t => t.id !== topicId);
  saveDataToStorage();
  synth.playClick();
  renderRevision();
  renderDashboard();
}

/**
 * Prompts user to rename a revision topic.
 */
function editTopic(subjectId, topicId) {
  const subject = state.subjects.find(s => s.id === subjectId);
  if (!subject) return;

  const topic = subject.topics.find(t => t.id === topicId);
  if (!topic) return;

  const updatedName = prompt("Rename revision topic:", topic.name);
  if (updatedName !== null && updatedName.trim() !== "") {
    topic.name = updatedName.trim();
    saveDataToStorage();
    synth.playClick();
    setTicker(`TOPIC RENAMED: "${topic.name}"`);
    renderRevision();
  }
}

/**
 * Prompts confirmation and deletes an entire subject.
 */
function confirmDeleteSubject(subjectId) {
  const subject = state.subjects.find(s => s.id === subjectId);
  if (!subject) return;

  showRetroModal({
    title: "[DELETE REVISION SUBJECT]",
    icon: "⚠️",
    message: `Are you sure you want to delete "${escapeHtml(subject.name)}" and all its ${subject.topics.length} topics?`,
    confirmText: "DELETE SUBJECT",
    onConfirm: () => {
      state.subjects = state.subjects.filter(s => s.id !== subjectId);
      saveDataToStorage();
      synth.playClick();
      setTicker("REVISION SUBJECT REMOVED.");
      renderRevision();
      renderDashboard();
    }
  });
}

/* ===================================================================
   8. FOCUS TIMER CONTROLLER
   =================================================================== */

const TIMER_DURATIONS = {
  focus: 25 * 60,
  shortBreak: 5 * 60,
  longBreak: 15 * 60
};

function initTimerEvents() {
  const startBtn = document.getElementById("timerStartBtn");
  const resetBtn = document.getElementById("timerResetBtn");
  const modeFocus = document.getElementById("timerModeFocus");
  const modeShort = document.getElementById("timerModeShort");
  const modeLong = document.getElementById("timerModeLong");

  if (startBtn) startBtn.addEventListener("click", toggleTimer);
  if (resetBtn) resetBtn.addEventListener("click", resetTimer);

  if (modeFocus) modeFocus.addEventListener("click", () => setTimerMode("focus"));
  if (modeShort) modeShort.addEventListener("click", () => setTimerMode("shortBreak"));
  if (modeLong) modeLong.addEventListener("click", () => setTimerMode("longBreak"));

  // Check and request notification permissions gracefully on user click
  if ("Notification" in window && Notification.permission === "default") {
    // We will request only when the user starts the timer
  }

  updateTimerDisplay();
}

function setTimerMode(mode) {
  synth.playClick();
  pauseTimer();

  state.timer.mode = mode;
  state.timer.totalSeconds = TIMER_DURATIONS[mode];
  state.timer.remainingSeconds = TIMER_DURATIONS[mode];
  state.timer.endTime = null;

  // Update mode buttons UI
  document.querySelectorAll(".timer-mode-btn").forEach(btn => btn.classList.remove("active"));
  const activeBtn = document.getElementById(
    mode === "focus" ? "timerModeFocus" : (mode === "shortBreak" ? "timerModeShort" : "timerModeLong")
  );
  if (activeBtn) activeBtn.classList.add("active");

  const modeLabel = document.getElementById("timerCurrentModeLabel");
  if (modeLabel) {
    if (mode === "focus") modeLabel.textContent = "CURRENT MODE: FOCUS TIME";
    if (mode === "shortBreak") modeLabel.textContent = "CURRENT MODE: SHORT BREAK";
    if (mode === "longBreak") modeLabel.textContent = "CURRENT MODE: LONG BREAK";
  }

  const statusSubtext = document.getElementById("timerStatusSubtext");
  if (statusSubtext) statusSubtext.textContent = "[SYSTEM READY — PRESS START]";

  updateTimerDisplay();
}

function toggleTimer() {
  synth.playClick();

  // Request browser notification permission if not yet decided
  if ("Notification" in window && Notification.permission === "default") {
    Notification.requestPermission();
  }

  if (state.timer.isRunning) {
    pauseTimer();
  } else {
    startTimer();
  }
}

function startTimer() {
  // Always clean up existing interval first
  if (timerIntervalId) {
    clearInterval(timerIntervalId);
    timerIntervalId = null;
  }

  state.timer.isRunning = true;
  // Use exact target timestamp to protect against tab sleep / throttling
  state.timer.endTime = Date.now() + (state.timer.remainingSeconds * 1000);

  updateTimerControlsUI(true);

  const statusSubtext = document.getElementById("timerStatusSubtext");
  if (statusSubtext) statusSubtext.textContent = "[COGNITIVE ENGINE RUNNING • DO NOT DISTURB]";

  // Run timer tick every 250ms for smooth responsiveness
  timerIntervalId = setInterval(timerTick, 250);
}

function pauseTimer() {
  if (timerIntervalId) {
    clearInterval(timerIntervalId);
    timerIntervalId = null;
  }

  state.timer.isRunning = false;
  state.timer.endTime = null;

  updateTimerControlsUI(false);

  const statusSubtext = document.getElementById("timerStatusSubtext");
  if (statusSubtext) statusSubtext.textContent = "[SESSION PAUSED — CLICK RESUME]";
}

function resetTimer() {
  synth.playClick();
  pauseTimer();

  state.timer.remainingSeconds = state.timer.totalSeconds;
  state.timer.endTime = null;

  const statusSubtext = document.getElementById("timerStatusSubtext");
  if (statusSubtext) statusSubtext.textContent = "[TIMER RESET — READY TO INITIALIZE]";

  updateTimerDisplay();
}

function timerTick() {
  if (!state.timer.isRunning || !state.timer.endTime) return;

  const msRemaining = state.timer.endTime - Date.now();
  const secondsRemaining = Math.max(0, Math.ceil(msRemaining / 1000));

  state.timer.remainingSeconds = secondsRemaining;
  updateTimerDisplay();

  if (secondsRemaining <= 0) {
    handleTimerComplete();
  }
}

function handleTimerComplete() {
  pauseTimer();
  synth.playChime();

  const wasFocus = state.timer.mode === "focus";

  if (wasFocus) {
    state.timer.completedSessions++;
    saveDataToStorage();
    const countEl = document.getElementById("timerSessionsCounter");
    if (countEl) countEl.textContent = state.timer.completedSessions;
    renderDashboard();
  }

  const alertTitle = wasFocus ? "FOCUS SESSION COMPLETE!" : "BREAK SESSION COMPLETE!";
  const alertMsg = wasFocus 
    ? "Awesome work, Operator! You completed 25 minutes of focus. Time to take a well-deserved 5-minute break." 
    : "Break is over! Ready to initialize another focus session?";

  // Browser desktop notification
  if ("Notification" in window && Notification.permission === "granted") {
    try {
      new Notification("STUDY.EXE Alert", {
        body: alertMsg,
        icon: "data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='.9em' font-size='90'>⏱️</text></svg>"
      });
    } catch (e) {
      // Fallback to in-page alert
    }
  }

  // Guaranteed retro in-page modal alert
  showRetroModal({
    title: `[${alertTitle}]`,
    icon: wasFocus ? "🎉" : "☕",
    message: alertMsg,
    confirmText: wasFocus ? "TAKE A BREAK" : "RESUME FOCUS",
    onConfirm: () => {
      if (wasFocus) {
        setTimerMode("shortBreak");
      } else {
        setTimerMode("focus");
      }
    }
  });

  setTicker(`SESSION COMPLETED: ${alertTitle}`);
}

function updateTimerDisplay() {
  const displayEl = document.getElementById("timerDisplay");
  const progressFill = document.getElementById("timerProgressFill");
  if (!displayEl) return;

  const mins = Math.floor(state.timer.remainingSeconds / 60);
  const secs = state.timer.remainingSeconds % 60;
  const formatted = `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;

  displayEl.textContent = formatted;

  // Window title update
  document.title = state.timer.isRunning 
    ? `(${formatted}) STUDY.EXE // FOCUS` 
    : "STUDY.EXE // Cyber Student Productivity Terminal";

  // Progress fill percentage
  if (progressFill && state.timer.totalSeconds > 0) {
    const pct = (state.timer.remainingSeconds / state.timer.totalSeconds) * 100;
    progressFill.style.width = `${pct}%`;
  }
}

function updateTimerControlsUI(isRunning) {
  const icon = document.getElementById("timerStartIcon");
  const text = document.getElementById("timerStartText");
  const btn = document.getElementById("timerStartBtn");

  if (isRunning) {
    if (icon) icon.textContent = "⏸";
    if (text) text.textContent = "PAUSE SESSION";
    if (btn) btn.className = "retro-btn btn-purple btn-lg";
  } else {
    if (icon) icon.textContent = "▶";
    if (text) text.textContent = state.timer.remainingSeconds < state.timer.totalSeconds ? "RESUME SESSION" : "START SESSION";
    if (btn) btn.className = "retro-btn btn-neon btn-lg";
  }
}

/* ===================================================================
   9. QUICK NOTES CONTROLLER
   =================================================================== */

let noteSearchQuery = "";

function renderNotes() {
  const listContainer = document.getElementById("notesListContainer");
  const emptyState = document.getElementById("noteEditorEmptyState");
  const editorContainer = document.getElementById("noteEditorContainer");

  if (!listContainer) return;

  // Filter notes by search
  const filteredNotes = state.notes.filter(note => {
    if (!noteSearchQuery) return true;
    const q = noteSearchQuery.toLowerCase();
    return note.title.toLowerCase().includes(q) || note.content.toLowerCase().includes(q);
  });

  // Render navigation list
  if (filteredNotes.length === 0) {
    listContainer.innerHTML = `
      <div class="text-dim" style="font-size: 11px; padding: 12px; text-align: center; font-style: italic;">
        ${state.notes.length === 0 ? "No notes saved yet." : "No matching notes found."}
      </div>
    `;
  } else {
    let html = "";
    filteredNotes.forEach(note => {
      const isActive = note.id === state.activeNoteId;
      const displayTitle = note.title.trim() ? escapeHtml(note.title) : "UNTITLED LOG";
      const dateStr = new Date(note.updatedAt).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit"
      });

      html += `
        <div class="note-nav-item ${isActive ? 'active' : ''}" onclick="selectNote('${note.id}')" role="button" tabindex="0">
          <span class="note-nav-title">${displayTitle}</span>
          <span class="note-nav-meta">🕒 ${dateStr}</span>
        </div>
      `;
    });
    listContainer.innerHTML = html;
  }

  // Active note editor display
  const activeNote = state.notes.find(n => n.id === state.activeNoteId);
  if (!activeNote) {
    if (emptyState) emptyState.classList.remove("hidden");
    if (editorContainer) editorContainer.classList.add("hidden");
  } else {
    if (emptyState) emptyState.classList.add("hidden");
    if (editorContainer) editorContainer.classList.remove("hidden");

    const titleInput = document.getElementById("activeNoteTitleInput");
    const contentInput = document.getElementById("activeNoteContentInput");

    // Only update value if not currently focused to preserve cursor position
    if (titleInput && document.activeElement !== titleInput) {
      titleInput.value = activeNote.title;
    }
    if (contentInput && document.activeElement !== contentInput) {
      contentInput.value = activeNote.content;
    }
  }
}

function createNewNote() {
  synth.playClick();

  const newNote = {
    id: "note_" + Date.now() + "_" + Math.floor(Math.random() * 1000),
    title: "",
    content: "",
    updatedAt: new Date().toISOString()
  };

  state.notes.unshift(newNote);
  state.activeNoteId = newNote.id;
  saveDataToStorage();

  renderNotes();

  // Focus title input immediately
  setTimeout(() => {
    const titleInput = document.getElementById("activeNoteTitleInput");
    if (titleInput) {
      titleInput.value = "";
      titleInput.focus();
    }
  }, 50);

  setTicker("NEW NOTE INITIALIZED.");
}

function selectNote(noteId) {
  synth.playClick();
  state.activeNoteId = noteId;
  renderNotes();
}

/**
 * Auto-saves the active note as the user types with a debounce delay.
 */
function handleNoteInput() {
  const activeNote = state.notes.find(n => n.id === state.activeNoteId);
  if (!activeNote) return;

  const titleInput = document.getElementById("activeNoteTitleInput");
  const contentInput = document.getElementById("activeNoteContentInput");
  const indicator = document.getElementById("noteSaveIndicator");

  if (indicator) {
    indicator.textContent = "[SAVING...]";
    indicator.style.color = "var(--electric-purple)";
  }

  clearTimeout(noteSaveDebounceTimeout);
  noteSaveDebounceTimeout = setTimeout(() => {
    activeNote.title = titleInput.value;
    activeNote.content = contentInput.value;
    activeNote.updatedAt = new Date().toISOString();

    saveDataToStorage();

    if (indicator) {
      indicator.textContent = "[AUTOSAVED]";
      indicator.style.color = "var(--neon-lime)";
    }

    // Refresh list titles without disrupting editor focus
    const activeItemTitle = document.querySelector(`.note-nav-item.active .note-nav-title`);
    if (activeItemTitle) {
      activeItemTitle.textContent = activeNote.title.trim() ? activeNote.title : "UNTITLED LOG";
    }
  }, 350);
}

function confirmDeleteActiveNote() {
  const activeNote = state.notes.find(n => n.id === state.activeNoteId);
  if (!activeNote) return;

  const displayTitle = activeNote.title.trim() ? `"${activeNote.title}"` : "this note";

  showRetroModal({
    title: "[DELETE NOTE CONFIRMATION]",
    icon: "🗑️",
    message: `Are you sure you want to permanently delete ${escapeHtml(displayTitle)}?`,
    confirmText: "DELETE NOTE",
    onConfirm: () => {
      state.notes = state.notes.filter(n => n.id !== activeNote.id);
      state.activeNoteId = state.notes.length > 0 ? state.notes[0].id : null;
      saveDataToStorage();
      synth.playClick();
      setTicker("NOTE DELETED FROM MEMORY.");
      renderNotes();
    }
  });
}

/* ===================================================================
   10. DATA BACKUP, EXPORT & RESTORE CONTROLLER
   =================================================================== */

/**
 * Exports all user data into a clean JSON file download.
 */
function exportBackupData() {
  synth.playClick();

  const backupObject = {
    appName: "STUDY.EXE",
    version: "1.0",
    exportDate: new Date().toISOString(),
    tasks: state.tasks,
    subjects: state.subjects,
    notes: state.notes,
    timer: {
      completedSessions: state.timer.completedSessions
    },
    settings: state.settings
  };

  const jsonString = JSON.stringify(backupObject, null, 2);
  const blob = new Blob([jsonString], { type: "application/json" });
  const url = URL.createObjectURL(blob);

  const nowStr = getLocalDateString(new Date());
  const a = document.createElement("a");
  a.href = url;
  a.download = `study_exe_backup_${nowStr}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);

  setTicker("BACKUP FILE GENERATED AND DOWNLOADED.");
}

/**
 * Restores data from a user-uploaded JSON file after strict schema validation.
 */
function handleImportFile(file) {
  const feedback = document.getElementById("importFeedback");
  if (!file) return;

  const reader = new FileReader();
  reader.onload = function(event) {
    try {
      const parsed = JSON.parse(event.target.result);

      // Validate schema
      if (!parsed || typeof parsed !== "object") {
        throw new Error("Invalid JSON structure.");
      }

      const tasksValid = Array.isArray(parsed.tasks);
      const subjectsValid = Array.isArray(parsed.subjects);
      const notesValid = Array.isArray(parsed.notes);

      if (!tasksValid && !subjectsValid && !notesValid) {
        throw new Error("File does not contain valid STUDY.EXE data arrays.");
      }

      const taskCount = tasksValid ? parsed.tasks.length : 0;
      const subjCount = subjectsValid ? parsed.subjects.length : 0;
      const noteCount = notesValid ? parsed.notes.length : 0;

      // Ask confirmation before overwriting
      showRetroModal({
        title: "[CONFIRM BACKUP RESTORATION]",
        icon: "⚠️",
        message: `Validated backup found containing: ${taskCount} tasks, ${subjCount} revision subjects, and ${noteCount} notes. Importing will replace your current workspace data. Continue?`,
        confirmText: "RESTORE BACKUP",
        onConfirm: () => {
          if (tasksValid) state.tasks = parsed.tasks;
          if (subjectsValid) state.subjects = parsed.subjects;
          if (notesValid) state.notes = parsed.notes;

          if (parsed.settings && typeof parsed.settings === "object") {
            state.settings = { ...state.settings, ...parsed.settings };
          }

          if (parsed.timer && typeof parsed.timer.completedSessions === "number") {
            state.timer.completedSessions = parsed.timer.completedSessions;
          }

          saveDataToStorage();
          applySettings();
          synth.playChime();

          if (feedback) {
            feedback.textContent = "SUCCESS: Backup successfully restored!";
            feedback.style.color = "var(--neon-lime)";
          }

          setTicker("DATA BACKUP SUCCESSFULLY RESTORED.");
          renderDashboard();
          renderTasks();
          renderRevision();
          renderNotes();
          updateStorageTelemetry();
        }
      });

    } catch (err) {
      console.error("Import failure:", err);
      if (feedback) {
        feedback.textContent = `ERROR: Invalid backup format. (${err.message})`;
        feedback.style.color = "var(--hot-pink)";
      }
      setTicker("ERROR: INVALID BACKUP FILE.", true);
    }
  };

  reader.readAsText(file);
}

/**
 * Completely purges all data with double-check confirmation.
 */
function confirmPurgeAllData() {
  synth.playClick();

  showRetroModal({
    title: "[PURGE ALL DATA — DANGER ZONE]",
    icon: "🔥",
    message: "WARNING: This will permanently erase ALL tasks, revision subjects, notes, and timers from this browser. This cannot be undone!",
    confirmText: "PURGE EVERYTHING",
    onConfirm: () => {
      // Clear localStorage
      try {
        localStorage.removeItem(STORAGE_KEY);
      } catch (e) {}

      // Reset state
      state.tasks = [];
      state.subjects = [];
      state.notes = [];
      state.activeNoteId = null;
      state.timer.completedSessions = 0;

      saveDataToStorage();
      synth.playClick();

      setTicker("ALL SYSTEM DATA PURGED. CLEAN STATE RESTORED.", true);
      renderDashboard();
      renderTasks();
      renderRevision();
      renderNotes();
      updateStorageTelemetry();
    }
  });
}

/* ===================================================================
   11. RETRO MODAL COMPONENT (ACCESSIBLE IN-PAGE ALERT / CONFIRM)
   =================================================================== */

let modalConfirmCallback = null;

function showRetroModal({ title, icon, message, confirmText, onConfirm }) {
  const overlay = document.getElementById("retroModalOverlay");
  const titleEl = document.getElementById("modalTitle");
  const iconEl = document.getElementById("modalIcon");
  const msgEl = document.getElementById("modalMessage");
  const confirmBtn = document.getElementById("modalConfirmBtn");

  if (!overlay) return;

  if (titleEl) titleEl.textContent = title || "[SYSTEM ALERT]";
  if (iconEl) iconEl.textContent = icon || "🔔";
  if (msgEl) msgEl.textContent = message || "";
  if (confirmBtn) confirmBtn.textContent = confirmText || "OK";

  modalConfirmCallback = onConfirm || null;
  overlay.classList.remove("hidden");
  if (confirmBtn) confirmBtn.focus();
}

function closeRetroModal() {
  const overlay = document.getElementById("retroModalOverlay");
  if (overlay) overlay.classList.add("hidden");
  modalConfirmCallback = null;
}

function handleModalConfirm() {
  const cb = modalConfirmCallback;
  closeRetroModal();
  if (typeof cb === "function") {
    cb();
  }
}

/* ===================================================================
   12. SETTINGS & RETRO TOGGLES
   =================================================================== */

function toggleAudio() {
  state.settings.soundEnabled = !state.settings.soundEnabled;
  saveDataToStorage();
  applySettings();
  if (state.settings.soundEnabled) synth.playClick();
  setTicker(`AUDIO FX: ${state.settings.soundEnabled ? "ENABLED" : "MUTED"}`);
}

function toggleScanlines() {
  state.settings.scanlinesEnabled = !state.settings.scanlinesEnabled;
  saveDataToStorage();
  applySettings();
  synth.playClick();
  setTicker(`CRT SCANLINES: ${state.settings.scanlinesEnabled ? "ACTIVE" : "DISABLED"}`);
}

function applySettings() {
  // Sound button
  const audioIcon = document.getElementById("audioIcon");
  if (audioIcon) {
    audioIcon.textContent = state.settings.soundEnabled ? "🔊" : "🔇";
  }

  // CRT Scanlines
  if (state.settings.scanlinesEnabled) {
    document.body.classList.add("scanlines-active");
  } else {
    document.body.classList.remove("scanlines-active");
  }
}

/* ===================================================================
   13. HELPER UTILITIES
   =================================================================== */

function getLocalDateString(d) {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function isDueSoon(dueDateStr) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const due = new Date(dueDateStr + "T00:00:00");
  const diffTime = due - today;
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays > 0 && diffDays <= 2;
}

function escapeHtml(str) {
  if (!str) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function initLiveClock() {
  const clockEl = document.getElementById("sysClock");
  function updateClock() {
    if (!clockEl) return;
    const now = new Date();
    const h = String(now.getHours()).padStart(2, "0");
    const m = String(now.getMinutes()).padStart(2, "0");
    const s = String(now.getSeconds()).padStart(2, "0");
    clockEl.textContent = `${h}:${m}:${s}`;
  }
  updateClock();
  setInterval(updateClock, 1000);
}

function setRandomQuote() {
  const quoteEl = document.getElementById("encouragingQuote");
  if (!quoteEl) return;
  const randIdx = Math.floor(Math.random() * MOTIVATIONAL_QUOTES.length);
  quoteEl.textContent = MOTIVATIONAL_QUOTES[randIdx];
}

/* ===================================================================
   14. INITIALIZATION ON DOM READY
   =================================================================== */

document.addEventListener("DOMContentLoaded", () => {
  // 1. Load data from disk
  loadDataFromStorage();
  applySettings();

  // 2. Set default date picker to today
  const taskDateInput = document.getElementById("taskDueDateInput");
  if (taskDateInput) {
    taskDateInput.value = getLocalDateString(new Date());
  }

  // 3. Setup Navigation events
  document.querySelectorAll(".nav-tab").forEach(tab => {
    tab.addEventListener("click", () => {
      const tabId = tab.getAttribute("data-tab");
      switchTab(tabId);
    });
  });

  // 4. Setup Tasks form & filters
  const taskForm = document.getElementById("taskForm");
  if (taskForm) taskForm.addEventListener("submit", handleAddTask);

  const filterAll = document.getElementById("filterBtn-all");
  const filterPending = document.getElementById("filterBtn-pending");
  const filterCompleted = document.getElementById("filterBtn-completed");
  const prioritySelect = document.getElementById("priorityFilterSelect");

  if (filterAll) {
    filterAll.addEventListener("click", () => {
      synth.playClick();
      taskFilter = "all";
      document.querySelectorAll(".filter-group .retro-chip").forEach(c => c.classList.remove("active"));
      filterAll.classList.add("active");
      renderTasks();
    });
  }
  if (filterPending) {
    filterPending.addEventListener("click", () => {
      synth.playClick();
      taskFilter = "pending";
      document.querySelectorAll(".filter-group .retro-chip").forEach(c => c.classList.remove("active"));
      filterPending.classList.add("active");
      renderTasks();
    });
  }
  if (filterCompleted) {
    filterCompleted.addEventListener("click", () => {
      synth.playClick();
      taskFilter = "completed";
      document.querySelectorAll(".filter-group .retro-chip").forEach(c => c.classList.remove("active"));
      filterCompleted.classList.add("active");
      renderTasks();
    });
  }
  if (prioritySelect) {
    prioritySelect.addEventListener("change", (e) => {
      synth.playClick();
      taskPriorityFilter = e.target.value;
      renderTasks();
    });
  }

  // 5. Setup Revision form
  const subjectForm = document.getElementById("addSubjectForm");
  if (subjectForm) subjectForm.addEventListener("submit", handleAddSubject);

  // 6. Setup Focus Timer
  initTimerEvents();

  // 7. Setup Quick Notes events
  const createNoteBtn = document.getElementById("createNoteBtn");
  if (createNoteBtn) createNoteBtn.addEventListener("click", createNewNote);

  const noteTitleInput = document.getElementById("activeNoteTitleInput");
  const noteContentInput = document.getElementById("activeNoteContentInput");
  if (noteTitleInput) noteTitleInput.addEventListener("input", handleNoteInput);
  if (noteContentInput) noteContentInput.addEventListener("input", handleNoteInput);

  const deleteNoteBtn = document.getElementById("deleteActiveNoteBtn");
  if (deleteNoteBtn) deleteNoteBtn.addEventListener("click", confirmDeleteActiveNote);

  const notesSearchInput = document.getElementById("notesSearchInput");
  if (notesSearchInput) {
    notesSearchInput.addEventListener("input", (e) => {
      noteSearchQuery = e.target.value.trim();
      renderNotes();
    });
  }

  // 8. Setup Data & Backup events
  const exportBtn = document.getElementById("exportBackupBtn");
  if (exportBtn) exportBtn.addEventListener("click", exportBackupData);

  const triggerImportBtn = document.getElementById("triggerImportBtn");
  const fileInput = document.getElementById("importFileInput");
  if (triggerImportBtn && fileInput) {
    triggerImportBtn.addEventListener("click", () => {
      synth.playClick();
      fileInput.click();
    });
    fileInput.addEventListener("change", (e) => {
      if (e.target.files && e.target.files[0]) {
        handleImportFile(e.target.files[0]);
        e.target.value = ""; // Reset for next import
      }
    });
  }

  const clearAllBtn = document.getElementById("clearAllDataBtn");
  if (clearAllBtn) clearAllBtn.addEventListener("click", confirmPurgeAllData);

  // 9. Retro toggles & Modal
  const audioToggle = document.getElementById("toggleAudioBtn");
  if (audioToggle) audioToggle.addEventListener("click", toggleAudio);

  const scanlinesToggle = document.getElementById("toggleScanlinesBtn");
  if (scanlinesToggle) scanlinesToggle.addEventListener("click", toggleScanlines);

  const modalClose = document.getElementById("modalCloseBtn");
  const modalConfirm = document.getElementById("modalConfirmBtn");
  if (modalClose) modalClose.addEventListener("click", closeRetroModal);
  if (modalConfirm) modalConfirm.addEventListener("click", handleModalConfirm);

  // 10. Live clock & quote
  initLiveClock();
  setRandomQuote();

  // 11. Initial Render
  renderDashboard();
  renderTasks();
  renderRevision();
  renderNotes();
  updateStorageTelemetry();
});

// Global API hook for inline HTML button triggers
window.app = {
  switchTab,
  toggleAudio,
  toggleScanlines
};
