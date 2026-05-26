// Sakura Merge - Prototype v0.2
// Drag-and-drop merge + restoration zone with sockets.

const CONFIG = {
  rows: 9,
  cols: 7,
  energyMax: 120,
  energyStart: 120,
  energyRegenMs: 4000,        // 4s for prototype (production: 45s)
  energyPerTap: 1,
  itemsPerTapMin: 1,
  itemsPerTapMax: 3,
  maxTier: 7,
  xpCurveBase: 100,
  xpCurveExp: 1.3,
};

const SAKURA_CHAIN = [
  null,
  { emoji: '🌱', name: 'Sakura Bud',           size: 18 },
  { emoji: '🌸', name: 'Pink Petal',           size: 22 },
  { emoji: '🌷', name: 'Blooming Branch',      size: 26 },
  { emoji: '💮', name: 'Sakura Bonsai',        size: 30 },
  { emoji: '🌺', name: 'Young Sakura Tree',    size: 34 },
  { emoji: '🌳', name: 'Full Sakura Bloom',    size: 40 },
  { emoji: '🌲', name: 'Eternal Sakura Spirit', size: 46 },
];

const QUEST_REWARDS = {
  2: { coins: 6,    xp: 10 },
  3: { coins: 15,   xp: 25 },
  4: { coins: 40,   xp: 60 },
  5: { coins: 100,  xp: 140 },
  6: { coins: 230,  xp: 320 },
  7: { coins: 600,  xp: 700 },
};

const RESTORATION_STEPS = [
  { name: 'Clear the path',    tier: 3, qty: 1, coins: 30,  art: '🌿 ⛩️ 🌿' },
  { name: 'Paint the gate',    tier: 3, qty: 2, coins: 100, art: '🌸 ⛩️ 🌸' },
  { name: 'Plant the grove',   tier: 4, qty: 1, coins: 250, art: '🌸 🌳 ⛩️ 🌳 🌸' },
  { name: 'Awaken the spirit', tier: 5, qty: 1, coins: 500, art: '🌟 🌲 ⛩️ 🌲 🌟' },
];
const VILLAGE_ART_INITIAL = '🪨 🌿 🪨';

const state = {
  energy: CONFIG.energyStart,
  coins: 0,
  xp: 0,
  level: 1,
  board: new Array(CONFIG.rows * CONFIG.cols).fill(null),
  draggingIdx: null,
  questTier: 3,
  restorationStep: 0,
  restorationSockets: [],
  spawnedCells: new Set(),
  mergedCell: null,
};

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
  stepName: document.getElementById('step-name'),
  stepCost: document.getElementById('step-cost'),
  stepComplete: document.getElementById('step-complete'),
  sockets: document.getElementById('sockets'),
  villageArt: document.getElementById('village-art'),
  generator: document.getElementById('generator'),
  reset: document.getElementById('reset'),
  toast: document.getElementById('toast'),
};

function initSockets() {
  const step = RESTORATION_STEPS[state.restorationStep];
  state.restorationSockets = step ? new Array(step.qty).fill(null) : [];
}

function emptyCellIndices() {
  const out = [];
  for (let i = 0; i < state.board.length; i++) if (!state.board[i]) out.push(i);
  return out;
}

function tapGenerator() {
  if (state.energy < CONFIG.energyPerTap) return toast('Out of energy!', 'warn');
  const empties = emptyCellIndices();
  if (empties.length === 0) return toast('Board is full', 'warn');

  state.energy -= CONFIG.energyPerTap;
  const range = CONFIG.itemsPerTapMax - CONFIG.itemsPerTapMin + 1;
  const wantCount = CONFIG.itemsPerTapMin + Math.floor(Math.random() * range);
  const spawnCount = Math.min(empties.length, wantCount);

  state.spawnedCells.clear();
  for (let i = 0; i < spawnCount; i++) {
    const pick = Math.floor(Math.random() * empties.length);
    const idx = empties.splice(pick, 1)[0];
    state.board[idx] = { tier: 1 };
    state.spawnedCells.add(idx);
  }
  render();
}

// ---- Drag & drop ----

const drag = {
  active: false,
  source: null,       // { type: 'cell'|'socket', idx, tier }
  ghost: null,
  pointerId: null,
};

function onItemPointerDown(e, source) {
  if (drag.active) return;
  drag.active = true;
  drag.source = source;
  drag.pointerId = e.pointerId;

  const def = SAKURA_CHAIN[source.tier];
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
  highlightDropTargets(source.tier);

  e.preventDefault();
  try { e.target.setPointerCapture(e.pointerId); } catch (_) {}
}

function onPointerMove(e) {
  if (!drag.active) return;
  moveGhost(e.clientX, e.clientY, e.pointerType);
}

function onPointerUp(e) {
  if (!drag.active) return;
  const target = getDropTarget(e.clientX, e.clientY);
  let success = false;
  if (target) success = handleDrop(target);
  if (!success) restoreSource();
  endDrag();
}

function endDrag() {
  if (drag.ghost) drag.ghost.remove();
  drag.ghost = null;
  state.draggingIdx = null;
  drag.active = false;
  drag.source = null;
  clearDropTargets();
  render();
}

function restoreSource() {
  if (!drag.source) return;
  if (drag.source.type === 'socket') {
    state.restorationSockets[drag.source.idx] = { tier: drag.source.tier };
  }
  // cell sources are restored implicitly: board entry was never removed
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
  if (src.type === 'cell' && src.idx === toIdx) return true; // self-drop, no change
  const toItem = state.board[toIdx];

  if (!toItem) {
    if (src.type === 'cell') state.board[src.idx] = null;
    state.board[toIdx] = { tier: src.tier };
    return true;
  }

  if (toItem.tier === src.tier && src.tier < CONFIG.maxTier) {
    if (src.type === 'cell') state.board[src.idx] = null;
    state.board[toIdx] = { tier: src.tier + 1 };
    state.mergedCell = toIdx;
    const next = SAKURA_CHAIN[src.tier + 1];
    const msg = (src.tier + 1 === CONFIG.maxTier)
      ? `★ ${next.name} forged!`
      : `Merged → ${next.name} (T${src.tier + 1})`;
    toast(msg, 'success');
    return true;
  }

  toast('Cannot merge different tiers', 'warn');
  return false;
}

function dropOnSocket(src, socketIdx) {
  const step = RESTORATION_STEPS[state.restorationStep];
  if (!step) return false;

  if (src.tier !== step.tier) {
    toast(`Socket needs T${step.tier}`, 'warn');
    return false;
  }
  if (state.restorationSockets[socketIdx] !== null) {
    toast('Socket is full', 'warn');
    return false;
  }

  if (src.type === 'cell') state.board[src.idx] = null;
  state.restorationSockets[socketIdx] = { tier: src.tier };
  toast(`T${src.tier} deposited`, 'success');
  return true;
}

function highlightDropTargets(tier) {
  document.querySelectorAll('.cell').forEach(cell => {
    const idx = +cell.dataset.idx;
    const item = state.board[idx];
    if (drag.source && drag.source.type === 'cell' && drag.source.idx === idx) return;
    if (!item || (item.tier === tier && tier < CONFIG.maxTier)) {
      cell.classList.add('drop-valid');
    }
  });
  const step = RESTORATION_STEPS[state.restorationStep];
  if (step && step.tier === tier) {
    document.querySelectorAll('.socket').forEach((s, i) => {
      if (state.restorationSockets[i] === null) s.classList.add('drop-valid');
    });
  }
}

function clearDropTargets() {
  document.querySelectorAll('.drop-valid').forEach(e => e.classList.remove('drop-valid'));
}

// ---- Game actions ----

function completeStep() {
  const step = RESTORATION_STEPS[state.restorationStep];
  if (!step) return;

  const allFilled = state.restorationSockets.every(s => s !== null);
  if (!allFilled) return toast('Fill the sockets first', 'warn');
  if (state.coins < step.coins) return toast(`Need ${step.coins - state.coins} more coins`, 'warn');

  state.coins -= step.coins;
  state.restorationStep += 1;
  initSockets();

  toast(`★ ${step.name} restored!`, 'success');
  if (state.restorationStep >= RESTORATION_STEPS.length) {
    setTimeout(() => toast('✨ Village fully restored ✨', 'success'), 900);
  }
  render();
}

function deliverQuest() {
  const tier = state.questTier;
  const idx = state.board.findIndex(item => item && item.tier === tier);
  if (idx === -1) return toast(`Need a Tier-${tier} item!`, 'warn');

  state.board[idx] = null;
  const reward = QUEST_REWARDS[tier];
  state.coins += reward.coins;
  state.xp += reward.xp;
  toast(`+${reward.coins} coins · +${reward.xp} XP`, 'success');

  let leveled = false;
  while (state.xp >= xpForNextLevel(state.level)) {
    state.xp -= xpForNextLevel(state.level);
    state.level += 1;
    leveled = true;
  }
  if (leveled) setTimeout(() => toast(`Level up! → ${state.level}`, 'success'), 700);

  pickNextQuestTier();
  render();
}

function pickNextQuestTier() {
  const lvl = state.level;
  let candidates;
  if (lvl < 3) candidates = [2, 3];
  else if (lvl < 6) candidates = [3, 4];
  else if (lvl < 10) candidates = [3, 4, 5];
  else if (lvl < 15) candidates = [4, 5, 6];
  else candidates = [5, 6, 7];
  state.questTier = candidates[Math.floor(Math.random() * candidates.length)];
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
  state.energy = CONFIG.energyStart;
  state.coins = 0;
  state.xp = 0;
  state.level = 1;
  state.board = new Array(CONFIG.rows * CONFIG.cols).fill(null);
  state.draggingIdx = null;
  state.questTier = 3;
  state.restorationStep = 0;
  state.spawnedCells.clear();
  state.mergedCell = null;
  initSockets();
  render();
  toast('Reset!');
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
      cell.classList.add('has-item', 'tier-' + item.tier);
      const span = document.createElement('span');
      span.className = 'item';
      span.style.fontSize = SAKURA_CHAIN[item.tier].size + 'px';
      span.textContent = SAKURA_CHAIN[item.tier].emoji;
      cell.appendChild(span);
      const badge = document.createElement('div');
      badge.className = 'tier-badge';
      badge.textContent = 'T' + item.tier;
      cell.appendChild(badge);
      cell.addEventListener('pointerdown', e => onItemPointerDown(e, {
        type: 'cell', idx: i, tier: item.tier
      }));
    }

    if (state.spawnedCells.has(i)) cell.classList.add('spawned');
    if (state.mergedCell === i) cell.classList.add('merged');

    frag.appendChild(cell);
  }
  el.board.appendChild(frag);

  requestAnimationFrame(() => {
    state.spawnedCells.clear();
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
  const def = SAKURA_CHAIN[state.questTier];
  const reward = QUEST_REWARDS[state.questTier];
  el.questText.textContent = `Deliver a ${def.name}`;
  el.questReward.textContent = `+${reward.coins} coins, +${reward.xp} XP · needs T${state.questTier}`;
  const hasItem = state.board.some(item => item && item.tier === state.questTier);
  el.questDeliver.disabled = !hasItem;
  el.questDeliver.style.opacity = hasItem ? '1' : '0.45';
}

function renderRestoration() {
  const totalSteps = RESTORATION_STEPS.length;
  const step = RESTORATION_STEPS[state.restorationStep];

  if (!step) {
    el.stepNum.textContent = totalSteps;
    el.stepName.textContent = 'Village fully restored ✨';
    el.stepCost.textContent = '—';
    el.villageArt.textContent = RESTORATION_STEPS[totalSteps - 1].art;
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
  for (let i = 0; i < step.qty; i++) {
    const socket = document.createElement('div');
    socket.className = 'socket';
    socket.dataset.idx = i;
    const item = state.restorationSockets[i];
    if (item) {
      socket.classList.add('filled');
      const span = document.createElement('span');
      span.className = 'item';
      span.style.fontSize = SAKURA_CHAIN[item.tier].size + 'px';
      span.textContent = SAKURA_CHAIN[item.tier].emoji;
      socket.appendChild(span);
      socket.addEventListener('pointerdown', e => onItemPointerDown(e, {
        type: 'socket', idx: i, tier: item.tier
      }));
    } else {
      socket.classList.add('empty');
      const hint = document.createElement('span');
      hint.className = 'socket-hint';
      hint.textContent = 'T' + step.tier;
      socket.appendChild(hint);
    }
    el.sockets.appendChild(socket);
  }

  const allFilled = state.restorationSockets.length > 0
    && state.restorationSockets.every(s => s !== null);
  const canAfford = state.coins >= step.coins;
  el.stepComplete.disabled = !(allFilled && canAfford);
  el.stepComplete.style.opacity = (allFilled && canAfford) ? '1' : '0.45';
}

let toastTimer = null;
function toast(msg, kind = '') {
  el.toast.textContent = msg;
  el.toast.className = 'toast show ' + kind;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { el.toast.className = 'toast ' + kind; }, 1600);
}

// ---- Init ----

initSockets();
el.generator.addEventListener('click', tapGenerator);
el.questDeliver.addEventListener('click', deliverQuest);
el.stepComplete.addEventListener('click', completeStep);
el.reset.addEventListener('click', resetGame);

document.addEventListener('pointermove', onPointerMove);
document.addEventListener('pointerup', onPointerUp);
document.addEventListener('pointercancel', () => { if (drag.active) { restoreSource(); endDrag(); } });

setInterval(regenEnergy, CONFIG.energyRegenMs);
render();
