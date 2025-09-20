/* -------------------------
   App State & DOM
   ------------------------- */
const taskInput = document.getElementById('taskInput');
const dueDateInput = document.getElementById('dueDate');
const addTaskBtn = document.getElementById('addTask');
const taskListEl = document.getElementById('taskList');

const totalCountEl = document.getElementById('total-count');
const completedCountEl = document.getElementById('completed-count');
const pendingCountEl = document.getElementById('pending-count');
const progressPercentEl = document.getElementById('progress-percent');
const progressFillEl = document.getElementById('progress-fill');

const themeToggleBtn = document.getElementById('theme-toggle');

let tasks = []; // in-memory list of task objects
let themeOrder = ['theme-light','theme-dark','theme-neon'];

/* -------------------------
   Helpers
   ------------------------- */
function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2,7);
}

function parseDateLocal(isoDateStr) {
  if (!isoDateStr) return null;
  const [y,m,d] = isoDateStr.split('-').map(Number);
  return new Date(y, m-1, d);
}

function formatDateNice(isoDateStr) {
  const d = parseDateLocal(isoDateStr);
  if (!d) return '';
  const opts = { month:'short', day:'numeric' };
  return d.toLocaleDateString(undefined, opts);
}

/* -------------------------
   Persistence
   ------------------------- */
function loadFromStorage() {
  try {
    const raw = localStorage.getItem('todo_v1');
    tasks = raw ? JSON.parse(raw) : [];
  } catch(e) {
    tasks = [];
  }
}

function saveToStorage() {
  localStorage.setItem('todo_v1', JSON.stringify(tasks));
}

function saveTheme(themeName) {
  localStorage.setItem('todo_theme', themeName);
}

function loadTheme() {
  const savedTheme = localStorage.getItem('todo_theme');
  if (savedTheme && themeOrder.includes(savedTheme)) return savedTheme;
  return 'theme-light'; // default
}

/* -------------------------
   Task factory & render
   ------------------------- */
function createTaskEl(task) {
  const li = document.createElement('li');
  li.className = 'task';
  if (task.completed) li.classList.add('completed');
  li.setAttribute('data-id', task.id);

  // complete button
  const completeBtn = document.createElement('button');
  completeBtn.className = 'complete-btn';
  completeBtn.setAttribute('aria-label', task.completed ? 'Mark incomplete' : 'Mark complete');
  completeBtn.innerHTML = task.completed ? '✔' : '';

  completeBtn.addEventListener('click', () => {
    toggleComplete(task.id);
  });

  // text content
  const title = document.createElement('div');
  title.className = 'title';
  title.textContent = task.text;

  // meta: due date (if any)
  const meta = document.createElement('div');
  meta.className = 'meta';
  if (task.due) {
    meta.textContent = `📅 ${formatDateNice(task.due)}`;
  }

  // actions: delete
  const actions = document.createElement('div');
  actions.className = 'actions';
  const delBtn = document.createElement('button');
  delBtn.className = 'action-btn';
  delBtn.title = 'Delete task';
  delBtn.innerHTML = '✖';
  delBtn.addEventListener('click', () => deleteTask(task.id));
  actions.appendChild(delBtn);

  li.appendChild(completeBtn);

  const contentWrap = document.createElement('div');
  contentWrap.style.display = 'flex';
  contentWrap.style.flexDirection = 'column';
  contentWrap.style.marginLeft = '8px';
  contentWrap.appendChild(title);
  if (task.due) contentWrap.appendChild(meta);

  li.appendChild(contentWrap);
  li.appendChild(actions);

  return li;
}

/* -------------------------
   Render tasks with filter & sort
   ------------------------- */
let filterValue = 'all';
let sortValue = 'created_desc';

function renderTasks() {
  let filtered = tasks.slice();
  if (filterValue === 'pending') filtered = filtered.filter(t => !t.completed);
  if (filterValue === 'completed') filtered = filtered.filter(t => t.completed);

  if (sortValue === 'due_asc') {
    filtered.sort((a,b) => {
      if (!a.due && !b.due) return 0;
      if (!a.due) return 1;
      if (!b.due) return -1;
      return parseDateLocal(a.due) - parseDateLocal(b.due);
    });
  } else if (sortValue === 'due_desc') {
    filtered.sort((a,b) => {
      if (!a.due && !b.due) return 0;
      if (!a.due) return 1;
      if (!b.due) return -1;
      return parseDateLocal(b.due) - parseDateLocal(a.due);
    });
  } else if (sortValue === 'created_asc') {
    filtered.sort((a,b) => a.createdAt - b.createdAt);
  } else {
    filtered.sort((a,b) => b.createdAt - a.createdAt);
  }

  taskListEl.innerHTML = '';
  if (filtered.length === 0) {
    const empty = document.createElement('div');
    empty.style.padding = '18px';
    empty.style.color = 'var(--muted)';
    empty.textContent = 'No tasks — add something to get started';
    taskListEl.appendChild(empty);
  } else {
    filtered.forEach(task => taskListEl.appendChild(createTaskEl(task)));
  }

  updateStats();
}

/* -------------------------
   Stats
   ------------------------- */
function updateStats() {
  const total = tasks.length;
  const completed = tasks.filter(t => t.completed).length;
  const pending = total - completed;
  const progress = total === 0 ? 0 : Math.round((completed / total) * 100);

  totalCountEl.textContent = total;
  completedCountEl.textContent = completed;
  pendingCountEl.textContent = pending;
  progressPercentEl.textContent = `${progress}%`;
  progressFillEl.style.width = `${progress}%`;
}

/* -------------------------
   CRUD helpers
   ------------------------- */
function addTask(text, dueIso=null) {
  const newTask = {
    id: uid(),
    text: text,
    due: dueIso || null,
    completed: false,
    createdAt: Date.now()
  };
  tasks.push(newTask);
  saveToStorage();
  renderTasks();
}

function toggleComplete(id) {
  const t = tasks.find(x => x.id === id);
  if (!t) return;
  t.completed = !t.completed;
  saveToStorage();
  renderTasks();
}

function deleteTask(id) {
  tasks = tasks.filter(t => t.id !== id);
  saveToStorage();
  renderTasks();
}

/* -------------------------
   Event wiring
   ------------------------- */
addTaskBtn.addEventListener('click', () => {
  const text = taskInput.value.trim();
  const due = dueDateInput.value || null;
  if (!text) return;
  addTask(text, due);
  taskInput.value = '';
  dueDateInput.value = '';
  taskInput.focus();
});

taskInput.addEventListener('keypress', (e) => {
  if (e.key === 'Enter') addTaskBtn.click();
});

/* -------------------------
   Custom dropdowns
   ------------------------- */
document.querySelectorAll('.custom-select').forEach(dropdown => {
  const selected = dropdown.querySelector('.selected');
  const optionsContainer = dropdown.querySelector('.options');
  const options = dropdown.querySelectorAll('li');

  selected.addEventListener('click', () => {
    dropdown.classList.toggle('open');
  });

  options.forEach(option => {
    option.addEventListener('click', () => {
      selected.textContent = option.textContent;
      dropdown.classList.remove('open');

      // Update filter or sort value
      const type = dropdown.dataset.type;
      if (type === 'filter') filterValue = option.dataset.value;
      if (type === 'sort') sortValue = option.dataset.value;

      renderTasks();
    });
  });
});

document.addEventListener('click', e => {
  document.querySelectorAll('.custom-select').forEach(dropdown => {
    if (!dropdown.contains(e.target)) dropdown.classList.remove('open');
  });
});

/* Theme cycle with persistence */
themeToggleBtn.addEventListener('click', () => {
  const body = document.body;
  const cur = themeOrder.indexOf(body.classList[0]) !== -1 ? body.classList[0] : themeOrder[0];
  const idx = themeOrder.indexOf(cur);
  const next = themeOrder[(idx + 1) % themeOrder.length];
  body.classList.remove(...themeOrder);
  body.classList.add(next);

  const map = { 'theme-light':'🌙', 'theme-dark':'☀️', 'theme-neon':'⚡' };
  themeToggleBtn.textContent = map[next] || '🔆';

  saveTheme(next);
});

/* -------------------------
   Init
   ------------------------- */
function init() {
  loadFromStorage();
  const savedTheme = loadTheme();
  document.body.classList.remove(...themeOrder);
  document.body.classList.add(savedTheme);
  const map = { 'theme-light':'🌙', 'theme-dark':'☀️', 'theme-neon':'⚡' };
  themeToggleBtn.textContent = map[savedTheme] || '🔆';

  renderTasks();
  taskInput.focus();
}

document.addEventListener('DOMContentLoaded', init);
