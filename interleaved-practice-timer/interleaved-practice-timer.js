const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => [...document.querySelectorAll(sel)];

const state = {
  items: [],
  plan: [],
  index: 0,
  remaining: 0,
  total: 0,
  running: false,
  timerId: null,
  ticks: {},
  audioCtx: null,
};

const presets = {
  guitar: [
    ['Barre F clean release', 4],
    ['Travis pattern, slow and relaxed', 5],
    ['Bach phrase: left-hand shift', 4],
    ['Pick grip reset + open-string rhythm', 3],
  ],
  piano: [
    ['LH leap, m. 12–16', 5],
    ['RH scale turn, dotted rhythm', 4],
    ['Memory start at section B', 3],
    ['Mock performance: ending only', 4],
  ],
};

function load() {
  const saved = localStorage.getItem('interleavedPracticeTimer');
  if (saved) {
    try {
      const parsed = JSON.parse(saved);
      Object.assign(state, { items: parsed.items || [], ticks: parsed.ticks || {} });
      $('#sessionName').value = parsed.sessionName || $('#sessionName').value;
      $('#defaultMinutes').value = parsed.defaultMinutes || 5;
      $('#rounds').value = parsed.rounds || 3;
      $('#goalTicks').value = parsed.goalTicks || 5;
      $('#breakSeconds').value = parsed.breakSeconds ?? 10;
      $('#notes').value = parsed.notes || '';
      if (parsed.theme) document.documentElement.dataset.theme = parsed.theme;
    } catch (e) {
      console.warn('Could not load saved session', e);
    }
  }
  if (!state.items.length) state.items = presets.guitar.map(([name, minutes]) => ({ name, minutes }));
  renderItems();
  generatePlan();
}

function currentSettings() {
  return {
    sessionName: $('#sessionName').value.trim() || 'Interleaved practice',
    defaultMinutes: Number($('#defaultMinutes').value) || 5,
    rounds: Number($('#rounds').value) || 3,
    goalTicks: Number($('#goalTicks').value) || 5,
    breakSeconds: Number($('#breakSeconds').value) || 0,
    mode: $('input[name="mode"]:checked').value,
    notes: $('#notes').value,
    theme: document.documentElement.dataset.theme || 'light',
  };
}

function save() {
  localStorage.setItem('interleavedPracticeTimer', JSON.stringify({ ...currentSettings(), items: state.items, ticks: state.ticks }));
}

function renderItems() {
  const list = $('#itemList');
  list.innerHTML = '';
  const tmpl = $('#itemTemplate');
  state.items.forEach((item, i) => {
    const node = tmpl.content.cloneNode(true);
    const li = node.querySelector('li');
    const title = node.querySelector('.item-title');
    const duration = node.querySelector('.item-duration');
    title.value = item.name;
    duration.value = item.minutes;
    title.addEventListener('input', () => { state.items[i].name = title.value; save(); });
    duration.addEventListener('input', () => { state.items[i].minutes = Number(duration.value) || 1; save(); });
    node.querySelector('.remove').addEventListener('click', () => {
      state.items.splice(i, 1);
      renderItems();
      generatePlan();
    });
    li.draggable = true;
    li.addEventListener('dragstart', (e) => e.dataTransfer.setData('text/plain', i));
    li.addEventListener('dragover', (e) => e.preventDefault());
    li.addEventListener('drop', (e) => {
      e.preventDefault();
      const from = Number(e.dataTransfer.getData('text/plain'));
      const [moved] = state.items.splice(from, 1);
      state.items.splice(i, 0, moved);
      renderItems();
      generatePlan();
    });
    list.appendChild(node);
  });
}

function addItem() {
  const name = $('#itemName').value.trim();
  if (!name) return;
  state.items.push({ name, minutes: Number($('#itemMinutes').value) || Number($('#defaultMinutes').value) || 5 });
  $('#itemName').value = '';
  renderItems();
  generatePlan();
}

function shuffleArray(arr) {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function makePlan() {
  const { mode, rounds, breakSeconds } = currentSettings();
  const items = state.items.filter(x => x.name.trim());
  const plan = [];
  if (!items.length) return plan;

  const pushWork = (item, label = item.name) => plan.push({ type: 'work', name: label, itemName: item.name, seconds: Math.max(1, item.minutes) * 60 });
  const pushBreak = () => { if (breakSeconds > 0) plan.push({ type: 'break', name: 'Microbreak: reset, breathe, hear next target', seconds: breakSeconds }); };

  if (mode === 'serial') {
    for (let r = 1; r <= rounds; r++) items.forEach(item => { pushWork(item, `Round ${r}: ${item.name}`); pushBreak(); });
  }
  if (mode === 'interval') {
    const cue = items[0];
    for (let r = 1; r <= rounds * Math.max(1, items.length); r++) {
      const filler = items[(r - 1) % items.length];
      pushWork(filler, `Work: ${filler.name}`);
      pushBreak();
      plan.push({ type: 'cue', name: `Timer cue: perform ${cue.name}`, itemName: cue.name, seconds: 30 });
    }
  }
  if (mode === 'switch') {
    for (let r = 1; r <= rounds; r++) shuffleArray(items).forEach(item => { pushWork(item, `Switch now: ${item.name}`); pushBreak(); });
  }
  if (mode === 'random') {
    for (let r = 1; r <= rounds; r++) shuffleArray(items).forEach((item, i) => { pushWork(item, `Draw ${i + 1}: ${item.name}`); pushBreak(); });
  }
  if (mode === 'newmusic') {
    for (let r = 1; r <= rounds; r++) {
      items.forEach((item, i) => {
        pushWork(item, `First pass: ${item.name}`);
        const contrast = items[(i + 1) % items.length];
        if (contrast && contrast.name !== item.name) pushWork(contrast, `Intervening work: ${contrast.name}`);
        pushWork(item, `Return pass: ${item.name}`);
        pushBreak();
      });
    }
  }
  return plan;
}

function generatePlan() {
  stopTimer();
  state.plan = makePlan();
  state.index = 0;
  state.remaining = state.plan[0]?.seconds || 0;
  state.total = state.remaining;
  renderPlan();
  renderTimer();
  save();
}

function renderPlan() {
  const plan = $('#plan');
  const goal = Number($('#goalTicks').value) || 5;
  plan.innerHTML = '';
  state.plan.forEach((step, i) => {
    const li = document.createElement('li');
    li.className = i === state.index ? 'active' : '';
    const mins = Math.floor(step.seconds / 60);
    const secs = String(step.seconds % 60).padStart(2, '0');
    li.innerHTML = `<strong>${step.name}</strong> <span class="muted">${mins}:${secs}</span>`;
    if (step.type !== 'break' && step.itemName) {
      const ticks = document.createElement('span');
      ticks.className = 'tickbox';
      const count = state.ticks[step.itemName] || 0;
      for (let t = 0; t < goal; t++) {
        const dot = document.createElement('span');
        dot.className = `tick ${t < count ? 'done' : ''}`;
        ticks.appendChild(dot);
      }
      li.appendChild(ticks);
    }
    plan.appendChild(li);
  });
}

function renderTimer() {
  const step = state.plan[state.index];
  if (!step) {
    $('#phaseLabel').textContent = 'Ready';
    $('#currentTask').textContent = 'Add items and generate a session';
    $('#nextTask').textContent = '';
    $('#timeDisplay').textContent = '00:00';
    $('#progress').value = 0;
    return;
  }
  $('#phaseLabel').textContent = step.type === 'break' ? 'Break' : step.type === 'cue' ? 'Cue' : 'Practice';
  $('#currentTask').textContent = step.name;
  const next = state.plan[state.index + 1];
  $('#nextTask').textContent = next ? `Next: ${next.name}` : 'Last step';
  $('#timeDisplay').textContent = `${String(Math.floor(state.remaining / 60)).padStart(2, '0')}:${String(state.remaining % 60).padStart(2, '0')}`;
  $('#progress').value = state.total ? 100 * (1 - state.remaining / state.total) : 0;
  renderPlan();
}

function ensureAudio() {
  if (!state.audioCtx) state.audioCtx = new (window.AudioContext || window.webkitAudioContext)();
}

function beep() {
  ensureAudio();
  const ctx = state.audioCtx;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.frequency.value = 880;
  gain.gain.setValueAtTime(0.0001, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.2, ctx.currentTime + 0.02);
  gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.25);
  osc.start();
  osc.stop(ctx.currentTime + 0.28);
  if ('vibrate' in navigator) navigator.vibrate([120, 50, 120]);
}

function startPause() {
  if (!state.plan.length) generatePlan();
  ensureAudio();
  state.running ? stopTimer() : startTimer();
}

function startTimer() {
  state.running = true;
  $('#startPause').textContent = 'Pause';
  state.timerId = setInterval(() => {
    state.remaining -= 1;
    if (state.remaining <= 0) {
      beep();
      nextStep();
    } else renderTimer();
  }, 1000);
}

function stopTimer() {
  state.running = false;
  $('#startPause').textContent = 'Start';
  if (state.timerId) clearInterval(state.timerId);
  state.timerId = null;
}

function nextStep() {
  if (state.index < state.plan.length - 1) {
    state.index += 1;
    state.remaining = state.plan[state.index].seconds;
    state.total = state.remaining;
  } else {
    stopTimer();
    state.remaining = 0;
    state.total = 1;
  }
  renderTimer();
}

function reset() {
  stopTimer();
  state.index = 0;
  state.remaining = state.plan[0]?.seconds || 0;
  state.total = state.remaining;
  renderTimer();
}

function currentItemName() {
  return state.plan[state.index]?.itemName;
}

function goodPass() {
  const name = currentItemName();
  if (!name) return;
  state.ticks[name] = (state.ticks[name] || 0) + 1;
  save();
  renderPlan();
}

function missPass() {
  const name = currentItemName();
  if (!name) return;
  state.ticks[name] = 0;
  save();
  renderPlan();
}

function exportJson() {
  const data = JSON.stringify({ ...currentSettings(), items: state.items, ticks: state.ticks, exportedAt: new Date().toISOString() }, null, 2);
  const blob = new Blob([data], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'interleaved-practice-session.json';
  a.click();
  URL.revokeObjectURL(url);
}

function importJson(file) {
  const reader = new FileReader();
  reader.onload = () => {
    const parsed = JSON.parse(reader.result);
    state.items = parsed.items || [];
    state.ticks = parsed.ticks || {};
    $('#sessionName').value = parsed.sessionName || '';
    $('#defaultMinutes').value = parsed.defaultMinutes || 5;
    $('#rounds').value = parsed.rounds || 3;
    $('#goalTicks').value = parsed.goalTicks || 5;
    $('#breakSeconds').value = parsed.breakSeconds ?? 10;
    $('#notes').value = parsed.notes || '';
    if (parsed.mode) $(`input[name="mode"][value="${parsed.mode}"]`).checked = true;
    renderItems();
    generatePlan();
  };
  reader.readAsText(file);
}

$('#addItem').addEventListener('click', addItem);
$('#itemName').addEventListener('keydown', (e) => { if (e.key === 'Enter') addItem(); });
$('#generate').addEventListener('click', generatePlan);
$('#shuffle').addEventListener('click', () => { state.plan = shuffleArray(state.plan); state.index = 0; state.remaining = state.plan[0]?.seconds || 0; state.total = state.remaining; renderTimer(); });
$('#save').addEventListener('click', save);
$('#startPause').addEventListener('click', startPause);
$('#next').addEventListener('click', nextStep);
$('#reset').addEventListener('click', reset);
$('#goodPass').addEventListener('click', goodPass);
$('#missPass').addEventListener('click', missPass);
$('#beepTest').addEventListener('click', beep);
$('#exportJson').addEventListener('click', exportJson);
$('#importJson').addEventListener('change', (e) => e.target.files[0] && importJson(e.target.files[0]));
$('#themeToggle').addEventListener('click', () => { document.documentElement.dataset.theme = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark'; save(); });
$$('input[name="mode"], #rounds, #goalTicks, #breakSeconds, #defaultMinutes, #notes, #sessionName').forEach(el => el.addEventListener('change', save));
$$('[data-preset]').forEach(btn => btn.addEventListener('click', () => {
  const preset = btn.dataset.preset;
  if (preset === 'clear') state.items = [];
  else state.items = presets[preset].map(([name, minutes]) => ({ name, minutes }));
  state.ticks = {};
  renderItems();
  generatePlan();
}));

document.addEventListener('visibilitychange', () => { if (document.hidden && state.running) stopTimer(); });
load();
