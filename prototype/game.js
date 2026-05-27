// Sakura Merge - Prototype v0.4
// Three chains (Sakura/Sushi/Lantern), localStorage persistence,
// offline energy regen, Hana intro + per-step dialogue.

const CONFIG = {
  rows: 9,
  cols: 7,
  energyMax: 120,
  energyStart: 120,
  energyRegenMs: 4000,
  energyPerTap: 1,
  itemsPerTapMin: 1,
  itemsPerTapMax: 3,
  maxTier: 7,
  xpCurveBase: 100,
  xpCurveExp: 1.3,
  spawnStaggerMs: 80,
  storageKey: 'sakuraMerge_save',
  storageVersion: 4,
};

const CHAINS = {
  sakura: {
    hint: '🌸',
    tiers: [
      null,
      { emoji: '🌱', name: 'Sakura Bud',           size: 18 },
      { emoji: '🌸', name: 'Pink Petal',           size: 22 },
      { emoji: '🌷', name: 'Blooming Branch',      size: 26 },
      { emoji: '💮', name: 'Sakura Bonsai',        size: 30 },
      { emoji: '🌺', name: 'Young Sakura Tree',    size: 34 },
      { emoji: '🌳', name: 'Full Sakura Bloom',    size: 40 },
      { emoji: '🌲', name: 'Eternal Sakura Spirit', size: 46 },
    ],
  },
  sushi: {
    hint: '🍙',
    tiers: [
      null,
      { emoji: '🌾', name: 'Rice Grain',     size: 18 },
      { emoji: '🍚', name: 'Rice Bowl',      size: 22 },
      { emoji: '🍙', name: 'Onigiri',        size: 26 },
      { emoji: '🍣', name: 'Maki Roll',      size: 30 },
      { emoji: '🍤', name: 'Tempura Plate',  size: 34 },
      { emoji: '🍱', name: 'Bento Box',      size: 40 },
      { emoji: '🍶', name: 'Imperial Feast', size: 46 },
    ],
  },
  lantern: {
    hint: '🏮',
    tiers: [
      null,
      { emoji: '📜', name: 'Paper Scrap',      size: 18 },
      { emoji: '📃', name: 'Folded Paper',     size: 22 },
      { emoji: '🎴', name: 'Painted Paper',    size: 26 },
      { emoji: '🏮', name: 'Small Lantern',    size: 30 },
      { emoji: '🪔', name: 'Lit Lantern',      size: 34 },
      { emoji: '🎐', name: 'Floating Lantern', size: 40 },
      { emoji: '🌟', name: 'Spirit Lantern',   size: 46 },
    ],
  },
};
const CHAIN_NAMES = Object.keys(CHAINS);
function getItem(chain, tier) { return CHAINS[chain].tiers[tier]; }

const QUEST_REWARDS = {
  2: { coins: 6,    xp: 10 },
  3: { coins: 15,   xp: 25 },
  4: { coins: 40,   xp: 60 },
  5: { coins: 100,  xp: 140 },
  6: { coins: 230,  xp: 320 },
  7: { coins: 600,  xp: 700 },
};

const RESTORATION_STEPS = [
  {
    name: 'Clear the path',
    sockets: [{ chain: 'sakura', tier: 3 }],
    coins: 30,
    art: '🌿 ⛩️ 🌿',
    dialogue: [
      "The path is clear! I can already feel the wind change.",
      "Welcome the spirits next — they remember the taste of rice. The Rice Sack will help you cook offerings.",
    ],
  },
  {
    name: 'Welcome the spirits',
    sockets: [
      { chain: 'sakura', tier: 3 },
      { chain: 'sushi',  tier: 3 },
    ],
    coins: 100,
    art: '🌸 ⛩️ 🍙',
    dialogue: [
      "...The shrine bells stirred. They heard us.",
      "Now we need light. Paper lanterns guided spirits home in the old days — the Paper Pile will let us fold new ones.",
    ],
  },
  {
    name: 'Light the lanterns',
    sockets: [{ chain: 'lantern', tier: 4 }],
    coins: 200,
    art: '🌸 🏮 ⛩️ 🏮 🌸',
    dialogue: [
      "The lanterns glow once more. I had forgotten that color.",
      "The tea house is next. We will need a proper Maki Roll for the table.",
    ],
  },
  {
    name: 'Open the tea house',
    sockets: [{ chain: 'sushi', tier: 4 }],
    coins: 350,
    art: '🌸 🍣 ⛩️ 🏮 🌸',
    dialogue: [
      "The aroma drifts through the trees. They are coming back, all of them.",
      "One last thing — the Spirit Tree at the village heart. It needs sakura petals AND lantern light to wake.",
    ],
  },
  {
    name: 'Awaken the Spirit Tree',
    sockets: [
      { chain: 'sakura',  tier: 5 },
      { chain: 'lantern', tier: 5 },
    ],
    coins: 700,
    art: '🌟 🌲 ⛩️ 🌲 🌟',
    dialogue: [
      "...",
      "It blooms. After so long, it blooms.",
      "Thank you, traveler. The village is whole, and you are part of it now. 🌸",
    ],
  },
];
const VILLAGE_ART_INITIAL = '🪨 🌿 🪨';

const HANA_INTRO = [
  "...You came. The torii gate opened for you.",
  "I am Hana, last apprentice Miko of this village. Long ago the spirits forgot the way home, and the village faded.",
  "Help me restore it. The Sakura Tree below will give you petals to gather.",
  "Drag two of the same kind together — they merge into something greater. ✨",
];

function makeInitialState() {
  return {
    energy: CONFIG.energyStart,
    coins: 0,
    xp: 0,
    level: 1,
    board: new Array(CONFIG.rows * CONFIG.cols).fill(null),
    draggingIdx: null,
    questChain: 'sakura',
    questTier: 3,
    restorationStep: 0,
    restorationSockets: [],
    spawnedCells: new Set(),
    spawnOrder: [],
    mergedCell: null,
    audioOn: true,
    hasSeenIntro: false,
  };
}
const state = makeInitialState();

const el = {
  board: document.getElementById('board'),
  energy: document.getElementById('energy'),
  coins: document.getElementById('coins'),
  xp: document.getElementById('xp'),
  level: document.getElementById('level'),
  questText: document.getElementById('quest-text'),
  questReward: document.getElementById('quest-reward'),
  questDeliver: document.getElementById('quest-deliver'),
  stepNum: document.getElementById('step-num'),
  stepTotal: document.getElementById('step-total'),
  stepName: document.getElementById('step-name'),
  stepCost: document.getElementById('step-cost'),
  stepComplete: document.getElementById('step-complete'),
  sockets: document.getElementById('sockets'),
  villageArt: document.getElementById('village-art'),
  audioToggle: document.getElementById('audio-toggle'),
  reset: document.getElementById('reset'),
  toast: document.getElementById('toast'),
  dialogue: document.getElementById('dialogue'),
  dialogueText: document.getElementById('dialogue-text'),
  dialogueNext: document.getElementById('dialogue-next'),
};

// ---- Persistence ----

function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }

function sanitizeItem(item) {
  if (!item || !CHAINS[item.chain]) return null;
  if (item.tier < 1 || item.tier > CONFIG.maxTier) return null;
  return { chain: item.chain, tier: item.tier };
}

function saveState() {
  try {
    localStorage.setItem(CONFIG.storageKey, JSON.stringify({
      version: CONFIG.storageVersion,
      ts: Date.now(),
      energy: state.energy,
      coins: state.coins,
      xp: state.xp,
      level: state.level,
      board: state.board,
      questChain: state.questChain,
      questTier: state.questTier,
      restorationStep: state.restorationStep,
      restorationSockets: state.restorationSockets,
      audioOn: state.audioOn,
      hasSeenIntro: state.hasSeenIntro,
    }));
  } catch (e) { /* storage full or disabled - skip */ }
}

function loadState() {
  try {
    const raw = localStorage.getItem(CONFIG.storageKey);
    if (!raw) return false;
    const snap = JSON.parse(raw);
    if (snap.version !== CONFIG.storageVersion) return false;

    const boardSize = CONFIG.rows * CONFIG.cols;
    const board = new Array(boardSize).fill(null);
    (snap.board || []).slice(0, boardSize).forEach((item, i) => {
      const valid = sanitizeItem(item);
      if (valid) board[i] = valid;
    });

    state.energy = clamp(snap.energy ?? CONFIG.energyMax, 0, CONFIG.energyMax);
    state.coins = snap.coins || 0;
    state.xp = snap.xp || 0;
    state.level = snap.level || 1;
    state.board = board;
    state.questChain = CHAINS[snap.questChain] ? snap.questChain : 'sakura';
    state.questTier = clamp(snap.questTier || 3, 2, CONFIG.maxTier);
    state.restorationStep = clamp(snap.restorationStep || 0, 0, RESTORATION_STEPS.length);
    state.restorationSockets = (snap.restorationSockets || []).map(sanitizeItem);
    state.audioOn = typeof snap.audioOn === 'boolean' ? snap.audioOn : true;
    state.hasSeenIntro = !!snap.hasSeenIntro;

    if (snap.ts) {
      const elapsedSec = (Date.now() - snap.ts) / 1000;
      const regen = Math.floor(elapsedSec / (CONFIG.energyRegenMs / 1000));
      if (regen > 0) state.energy = Math.min(CONFIG.energyMax, state.energy + regen);
    }
    return true;
  } catch (e) {
    return false;
  }
}

// ---- Audio ----

let audioCtx = null;
function ensureAudio() {
  if (!state.audioOn) return null;
  if (!audioCtx) {
    try { audioCtx = new (window.AudioContext || window.webkitAudioContext)(); }
    catch (e) { return null; }
  }
  if (audioCtx.state === 'suspended') audioCtx.resume();
  return audioCtx;
}

function playTone(freq, duration, type = 'sine', volume = 0.1, attack = 0.005) {
  const ctx = ensureAudio();
  if (!ctx) return;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = type;
  osc.frequency.value = freq;
  gain.gain.setValueAtTime(0, ctx.currentTime);
  gain.gain.linearRampToValueAtTime(volume, ctx.currentTime + attack);
  gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + duration);
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start();
  osc.stop(ctx.currentTime + duration);
}

function playTap()      { playTone(600 + Math.random() * 80, 0.05, 'triangle', 0.07); }
function playInvalid()  { playTone(180, 0.12, 'sawtooth', 0.06); }
function playQuest()    { playTone(1000, 0.18, 'sine', 0.12); setTimeout(() => playTone(1500, 0.14, 'sine', 0.1), 70); }
function playMerge(tier) {
  const base = 380 + (tier - 2) * 70;
  playTone(base, 0.09, 'sine', 0.12);
  setTimeout(() => playTone(base * 1.5, 0.16, 'sine', 0.12), 70);
  if (tier >= 6) setTimeout(() => playTone(base * 2.2, 0.22, 'sine', 0.1), 150);
}
function playLevelUp() {
  [523, 659, 784, 1047].forEach((f, i) => setTimeout(() => playTone(f, 0.18, 'sine', 0.12), i * 70));
}
function playRestoration() {
  playTone(659, 0.45, 'sine', 0.15, 0.01);
  setTimeout(() => playTone(784, 0.55, 'sine', 0.13, 0.01), 90);
  setTimeout(() => playTone(988, 0.6, 'sine', 0.11, 0.01), 200);
}

// ---- Dialogue ----

let dialogueQueue = [];

function showDialogue(lines) {
  dialogueQueue = [...lines];
  advanceDialogue();
}

function advanceDialogue() {
  if (dialogueQueue.length === 0) {
    el.dialogue.classList.add('hidden');
    saveState();
    return;
  }
  el.dialogue.classList.remove('hidden');
  el.dialogueText.textContent = dialogueQueue.shift();
}

// ---- Sockets / helpers ----

function initSockets() {
  const step = RESTORATION_STEPS[state.restorationStep];
  state.restorationSockets = step ? new Array(step.sockets.length).fill(null) : [];
}

function emptyCellIndices() {
  const out = [];
  for (let i = 0; i < state.board.length; i++) if (!state.board[i]) out.push(i);
  return out;
}

// ---- Generator ----

function tapGenerator(chainName) {
  ensureAudio();
  if (state.energy < CONFIG.energyPerTap) { playInvalid(); return toast('Out of energy!', 'warn'); }
  const empties = emptyCellIndices();
  if (empties.length === 0) { playInvalid(); return toast('Board is full', 'warn'); }

  state.energy -= CONFIG.energyPerTap;
  const range = CONFIG.itemsPerTapMax - CONFIG.itemsPerTapMin + 1;
  const wantCount = CONFIG.itemsPerTapMin + Math.floor(Math.random() * range);
  const spawnCount = Math.min(empties.length, wantCount);

  state.spawnedCells.clear();
  state.spawnOrder = [];
  for (let i = 0; i < spawnCount; i++) {
    const pick = Math.floor(Math.random() * empties.length);
    const idx = empties.splice(pick, 1)[0];
    state.board[idx] = { chain: chainName, tier: 1 };
    state.spawnedCells.add(idx);
    state.spawnOrder.push(idx);
  }
  playTap();
  render();
  saveState();
}

// ---- Drag & drop ----

const drag = {
  active: false,
  source: null,
  ghost: null,
  pointerId: null,
  cancelling: false,
};

function onItemPointerDown(e, source) {
  if (drag.active || drag.cancelling) return;
  ensureAudio();
  drag.active = true;
  drag.source = source;
  drag.pointerId = e.pointerId;

  const def = getItem(source.chain, source.tier);
  drag.ghost = document.createElement('div');
  drag.ghost.className = 'drag-ghost';
  if (source.tier === CONFIG.maxTier) drag.ghost.classList.add('tier-7');
  drag.ghost.style.fontSize = def.size + 'px';
  drag.ghost.textContent = def.emoji;
  document.body.appendChild(drag.ghost);

  moveGhost(e.clientX, e.clientY, e.pointerType);

  if (source.type === 'cell') {
    state.draggingIdx = source.idx;
  } else if (source.type === 'socket') {
    state.restorationSockets[source.idx] = null;
  }
  render();
  highlightDropTargets(source.chain, source.tier);

  e.preventDefault();
}

function onPointerMove(e) {
  if (!drag.active) return;
  moveGhost(e.clientX, e.clientY, e.pointerType);
}

function onPointerUp(e) {
  if (!drag.active) return;
  const target = getDropTarget(e.clientX, e.clientY);
  const success = target ? handleDrop(target) : false;
  if (success) finishDrag();
  else snapBackAndCleanup();
}

function finishDrag() {
  removeGhostImmediately();
  state.draggingIdx = null;
  drag.active = false;
  drag.source = null;
  clearDropTargets();
  render();
  saveState();
}

function snapBackAndCleanup() {
  clearDropTargets();
  if (!drag.ghost || !drag.source) {
    restoreSource();
    finishDrag();
    return;
  }
  let sourceEl;
  if (drag.source.type === 'cell') {
    sourceEl = document.querySelector(`.cell[data-idx="${drag.source.idx}"]`);
  } else {
    sourceEl = document.querySelector(`.socket[data-idx="${drag.source.idx}"]`);
  }
  if (!sourceEl) {
    restoreSource();
    finishDrag();
    return;
  }
  const rect = sourceEl.getBoundingClientRect();
  drag.ghost.style.left = (rect.left + rect.width / 2) + 'px';
  drag.ghost.style.top = (rect.top + rect.height / 2) + 'px';
  drag.ghost.classList.add('snap-back');
  drag.cancelling = true;
  setTimeout(() => {
    drag.cancelling = false;
    restoreSource();
    finishDrag();
  }, 270);
}

function restoreSource() {
  if (!drag.source) return;
  if (drag.source.type === 'socket') {
    state.restorationSockets[drag.source.idx] = { chain: drag.source.chain, tier: drag.source.tier };
  }
}

function removeGhostImmediately() {
  if (drag.ghost) drag.ghost.remove();
  drag.ghost = null;
}

function moveGhost(x, y, pointerType) {
  if (!drag.ghost) return;
  const offsetY = pointerType === 'touch' ? -55 : 0;
  drag.ghost.style.left = x + 'px';
  drag.ghost.style.top = (y + offsetY) + 'px';
}

function getDropTarget(x, y) {
  const elem = document.elementFromPoint(x, y);
  if (!elem) return null;
  const cell = elem.closest('.cell');
  if (cell) return { type: 'cell', idx: +cell.dataset.idx };
  const socket = elem.closest('.socket');
  if (socket) return { type: 'socket', idx: +socket.dataset.idx };
  return null;
}

function handleDrop(target) {
  const src = drag.source;
  if (target.type === 'cell') return dropOnCell(src, target.idx);
  if (target.type === 'socket') return dropOnSocket(src, target.idx);
  return false;
}

function dropOnCell(src, toIdx) {
  if (src.type === 'cell' && src.idx === toIdx) return true;
  const toItem = state.board[toIdx];

  if (!toItem) {
    if (src.type === 'cell') state.board[src.idx] = null;
    state.board[toIdx] = { chain: src.chain, tier: src.tier };
    playTap();
    return true;
  }

  const sameChain = toItem.chain === src.chain;
  const sameTier = toItem.tier === src.tier;
  if (sameChain && sameTier && src.tier < CONFIG.maxTier) {
    if (src.type === 'cell') state.board[src.idx] = null;
    const newTier = src.tier + 1;
    state.board[toIdx] = { chain: src.chain, tier: newTier };
    state.mergedCell = toIdx;
    const next = getItem(src.chain, newTier);
    const msg = (newTier === CONFIG.maxTier)
      ? `★ ${next.name} forged!`
      : `Merged → ${next.name} (T${newTier})`;
    toast(msg, 'success');
    playMerge(newTier);
    return true;
  }

  toast(!sameChain ? 'Different chains' : 'Different tiers', 'warn');
  playInvalid();
  return false;
}

function dropOnSocket(src, socketIdx) {
  const step = RESTORATION_STEPS[state.restorationStep];
  if (!step) return false;
  const req = step.sockets[socketIdx];

  if (src.chain !== req.chain || src.tier !== req.tier) {
    toast(`Socket needs T${req.tier} ${req.chain}`, 'warn');
    playInvalid();
    return false;
  }
  if (state.restorationSockets[socketIdx] !== null) {
    toast('Socket already filled', 'warn');
    playInvalid();
    return false;
  }

  if (src.type === 'cell') state.board[src.idx] = null;
  state.restorationSockets[socketIdx] = { chain: src.chain, tier: src.tier };
  toast('Deposited', 'success');
  playTap();
  return true;
}

function highlightDropTargets(chain, tier) {
  document.querySelectorAll('.cell').forEach(cell => {
    const idx = +cell.dataset.idx;
    const item = state.board[idx];
    if (drag.source && drag.source.type === 'cell' && drag.source.idx === idx) return;
    const empty = !item;
    const matchingMerge = item && item.chain === chain && item.tier === tier && tier < CONFIG.maxTier;
    if (empty || matchingMerge) cell.classList.add('drop-valid');
  });
  const step = RESTORATION_STEPS[state.restorationStep];
  if (step) {
    document.querySelectorAll('.socket').forEach((s, i) => {
      const req = step.sockets[i];
      if (req && req.chain === chain && req.tier === tier && state.restorationSockets[i] === null) {
        s.classList.add('drop-valid');
      }
    });
  }
}

function clearDropTargets() {
  document.querySelectorAll('.drop-valid').forEach(e => e.classList.remove('drop-valid'));
}

// ---- Quest / restoration / level ----

function completeStep() {
  ensureAudio();
  const step = RESTORATION_STEPS[state.restorationStep];
  if (!step) return;
  const allFilled = state.restorationSockets.every(s => s !== null);
  if (!allFilled) return toast('Fill the sockets first', 'warn');
  if (state.coins < step.coins) return toast(`Need ${step.coins - state.coins} more coins`, 'warn');

  state.coins -= step.coins;
  state.restorationStep += 1;
  initSockets();
  toast(`★ ${step.name} restored!`, 'success');
  playRestoration();
  spawnParticles(el.villageArt, 14, ['#ffd700', '#ffaa44', '#ff79b4', '#ffffff']);
  if (state.restorationStep >= RESTORATION_STEPS.length) {
    setTimeout(() => toast('✨ Village fully restored ✨', 'success'), 900);
  }
  if (step.dialogue) setTimeout(() => showDialogue(step.dialogue), 1100);
  render();
  saveState();
}

function deliverQuest() {
  ensureAudio();
  const idx = state.board.findIndex(
    item => item && item.chain === state.questChain && item.tier === state.questTier
  );
  if (idx === -1) return toast(`Need a T${state.questTier} ${state.questChain} item!`, 'warn');

  state.board[idx] = null;
  const reward = QUEST_REWARDS[state.questTier];
  state.coins += reward.coins;
  state.xp += reward.xp;
  toast(`+${reward.coins} coins · +${reward.xp} XP`, 'success');
  playQuest();

  let leveled = false;
  while (state.xp >= xpForNextLevel(state.level)) {
    state.xp -= xpForNextLevel(state.level);
    state.level += 1;
    leveled = true;
  }
  if (leveled) {
    setTimeout(() => {
      toast(`Level up! → ${state.level}`, 'success');
      playLevelUp();
      spawnParticles(el.level, 16, ['#ffd700', '#ff79b4', '#fff', '#ffaa44']);
    }, 600);
  }

  pickNextQuest();
  render();
  saveState();
}

function pickNextQuest() {
  const lvl = state.level;
  let tierCandidates;
  if (lvl < 3) tierCandidates = [2, 3];
  else if (lvl < 6) tierCandidates = [3, 4];
  else if (lvl < 10) tierCandidates = [3, 4, 5];
  else if (lvl < 15) tierCandidates = [4, 5, 6];
  else tierCandidates = [5, 6, 7];
  state.questChain = CHAIN_NAMES[Math.floor(Math.random() * CHAIN_NAMES.length)];
  state.questTier = tierCandidates[Math.floor(Math.random() * tierCandidates.length)];
}

function xpForNextLevel(level) {
  return Math.floor(CONFIG.xpCurveBase * Math.pow(level, CONFIG.xpCurveExp));
}

function regenEnergy() {
  if (state.energy < CONFIG.energyMax) {
    state.energy = Math.min(CONFIG.energyMax, state.energy + 1);
    renderStats();
  }
}

function resetGame() {
  const hasProgress = state.coins > 0 || state.xp > 0 || state.restorationStep > 0 || state.level > 1;
  if (hasProgress && !confirm('Reset all progress? This cannot be undone.')) return;
  Object.assign(state, makeInitialState());
  initSockets();
  render();
  saveState();
  toast('Reset!');
  setTimeout(() => showDialogue(HANA_INTRO), 200);
}

function renderAudioToggle() {
  el.audioToggle.textContent = state.audioOn ? '🔊' : '🔇';
  el.audioToggle.classList.toggle('muted', !state.audioOn);
}

function toggleAudio() {
  state.audioOn = !state.audioOn;
  renderAudioToggle();
  if (state.audioOn) playTap();
  saveState();
}

// ---- Particles ----

function spawnParticles(target, count = 12, colors = ['#ffd700', '#ff79b4', '#fff']) {
  if (!target) return;
  const rect = target.getBoundingClientRect();
  const cx = rect.left + rect.width / 2;
  const cy = rect.top + rect.height / 2;
  for (let i = 0; i < count; i++) {
    const p = document.createElement('div');
    p.className = 'particle';
    p.style.left = cx + 'px';
    p.style.top = cy + 'px';
    const angle = (i / count) * Math.PI * 2 + (Math.random() - 0.5) * 0.3;
    const dist = 50 + Math.random() * 60;
    p.style.setProperty('--dx', Math.cos(angle) * dist + 'px');
    p.style.setProperty('--dy', Math.sin(angle) * dist + 'px');
    p.style.background = colors[i % colors.length];
    p.style.color = colors[i % colors.length];
    document.body.appendChild(p);
    setTimeout(() => p.remove(), 900);
  }
}

// ---- Rendering ----

function render() {
  renderBoard();
  renderStats();
  renderQuest();
  renderRestoration();
}

function renderBoard() {
  el.board.innerHTML = '';
  const frag = document.createDocumentFragment();
  for (let i = 0; i < state.board.length; i++) {
    const cell = document.createElement('div');
    cell.className = 'cell';
    cell.dataset.idx = i;

    const item = state.board[i];
    const isDragSource = state.draggingIdx === i;

    if (item && !isDragSource) {
      cell.classList.add('has-item', 'tier-' + item.tier, 'chain-' + item.chain);
      const def = getItem(item.chain, item.tier);
      const span = document.createElement('span');
      span.className = 'item';
      span.style.fontSize = def.size + 'px';
      span.textContent = def.emoji;
      cell.appendChild(span);
      const badge = document.createElement('div');
      badge.className = 'tier-badge';
      badge.textContent = 'T' + item.tier;
      cell.appendChild(badge);
      cell.addEventListener('pointerdown', e => onItemPointerDown(e, {
        type: 'cell', idx: i, chain: item.chain, tier: item.tier,
      }));
    }

    if (state.spawnedCells.has(i)) {
      cell.classList.add('spawned');
      const order = state.spawnOrder.indexOf(i);
      const itemEl = cell.querySelector('.item');
      if (itemEl && order > 0) itemEl.style.animationDelay = (order * CONFIG.spawnStaggerMs) + 'ms';
    }
    if (state.mergedCell === i) cell.classList.add('merged');

    frag.appendChild(cell);
  }
  el.board.appendChild(frag);

  requestAnimationFrame(() => {
    state.spawnedCells.clear();
    state.spawnOrder = [];
    state.mergedCell = null;
  });
}

function renderStats() {
  el.energy.textContent = Math.floor(state.energy);
  el.coins.textContent = state.coins.toLocaleString();
  el.xp.textContent = state.xp.toLocaleString();
  el.level.textContent = state.level;
  document.body.classList.toggle('low-energy', state.energy < 10);
}

function renderQuest() {
  const def = getItem(state.questChain, state.questTier);
  const reward = QUEST_REWARDS[state.questTier];
  el.questText.textContent = `Deliver a ${def.name}`;
  el.questReward.textContent = `+${reward.coins} coins, +${reward.xp} XP · ${def.emoji} T${state.questTier}`;
  const hasItem = state.board.some(
    item => item && item.chain === state.questChain && item.tier === state.questTier
  );
  el.questDeliver.disabled = !hasItem;
  el.questDeliver.style.opacity = hasItem ? '1' : '0.45';
}

function renderRestoration() {
  const step = RESTORATION_STEPS[state.restorationStep];

  if (!step) {
    el.stepNum.textContent = RESTORATION_STEPS.length;
    el.stepName.textContent = 'Village fully restored ✨';
    el.stepCost.textContent = '—';
    el.villageArt.textContent = RESTORATION_STEPS[RESTORATION_STEPS.length - 1].art;
    el.sockets.innerHTML = '';
    el.stepComplete.disabled = true;
    el.stepComplete.style.opacity = '0.4';
    return;
  }

  el.stepNum.textContent = state.restorationStep + 1;
  el.stepName.textContent = step.name;
  el.stepCost.textContent = step.coins;
  el.villageArt.textContent = state.restorationStep === 0
    ? VILLAGE_ART_INITIAL
    : RESTORATION_STEPS[state.restorationStep - 1].art;

  el.sockets.innerHTML = '';
  for (let i = 0; i < step.sockets.length; i++) {
    const req = step.sockets[i];
    const socket = document.createElement('div');
    socket.className = 'socket chain-' + req.chain;
    socket.dataset.idx = i;
    const item = state.restorationSockets[i];
    if (item) {
      socket.classList.add('filled');
      const def = getItem(item.chain, item.tier);
      const span = document.createElement('span');
      span.className = 'item';
      span.style.fontSize = def.size + 'px';
      span.textContent = def.emoji;
      socket.appendChild(span);
      socket.addEventListener('pointerdown', e => onItemPointerDown(e, {
        type: 'socket', idx: i, chain: item.chain, tier: item.tier,
      }));
    } else {
      socket.classList.add('empty');
      const hint = document.createElement('span');
      hint.className = 'socket-hint';
      hint.textContent = CHAINS[req.chain].hint + 'T' + req.tier;
      socket.appendChild(hint);
    }
    el.sockets.appendChild(socket);
  }

  const ready = state.restorationSockets.length > 0
    && state.restorationSockets.every(s => s !== null)
    && state.coins >= step.coins;
  el.stepComplete.disabled = !ready;
  el.stepComplete.style.opacity = ready ? '1' : '0.45';
}

let toastTimer = null;
function toast(msg, kind = '') {
  el.toast.textContent = msg;
  el.toast.className = 'toast show ' + kind;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { el.toast.className = 'toast ' + kind; }, 1600);
}

// ---- Init ----

if (!loadState()) initSockets();
el.stepTotal.textContent = RESTORATION_STEPS.length;
renderAudioToggle();

CHAIN_NAMES.forEach(chain => {
  const btn = document.getElementById('gen-' + chain);
  if (btn) btn.addEventListener('click', () => tapGenerator(chain));
});
el.questDeliver.addEventListener('click', deliverQuest);
el.stepComplete.addEventListener('click', completeStep);
el.reset.addEventListener('click', resetGame);
el.audioToggle.addEventListener('click', toggleAudio);
el.dialogueNext.addEventListener('click', advanceDialogue);
el.dialogue.addEventListener('click', e => {
  if (e.target === el.dialogue) advanceDialogue();
});

document.addEventListener('pointermove', onPointerMove);
document.addEventListener('pointerup', onPointerUp);
document.addEventListener('pointercancel', () => { if (drag.active) { restoreSource(); finishDrag(); } });

setInterval(() => { regenEnergy(); saveState(); }, CONFIG.energyRegenMs);
render();

if (!state.hasSeenIntro) {
  setTimeout(() => {
    state.hasSeenIntro = true;
    showDialogue(HANA_INTRO);
  }, 400);
}
