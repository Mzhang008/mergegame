// Sakura Merge - Prototype v0.1
// Validates the core merge loop: tap-spawn, click-select-merge, quest delivery.

const CONFIG = {
  rows: 9,
  cols: 7,
  energyMax: 120,
  energyStart: 120,
  energyRegenMs: 5000,        // 5s for prototype (production: 45s)
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

const state = {
  energy: CONFIG.energyStart,
  coins: 0,
  xp: 0,
  level: 1,
  board: new Array(CONFIG.rows * CONFIG.cols).fill(null),
  selectedIdx: null,
  questTier: 3,
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
  generator: document.getElementById('generator'),
  reset: document.getElementById('reset'),
  toast: document.getElementById('toast'),
};

function emptyCellIndices() {
  const out = [];
  for (let i = 0; i < state.board.length; i++) if (!state.board[i]) out.push(i);
  return out;
}

function tapGenerator() {
  if (state.energy < CONFIG.energyPerTap) return toast('Out of energy — wait for regen!', 'warn');
  const empties = emptyCellIndices();
  if (empties.length === 0) return toast('Board is full — merge some items!', 'warn');

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

function handleCellClick(idx) {
  const item = state.board[idx];

  if (!item) {
    state.selectedIdx = null;
    return render();
  }

  if (state.selectedIdx === null || state.selectedIdx === idx) {
    state.selectedIdx = state.selectedIdx === idx ? null : idx;
    return render();
  }

  const sel = state.board[state.selectedIdx];
  if (sel.tier === item.tier && item.tier < CONFIG.maxTier) {
    state.board[state.selectedIdx] = null;
    state.board[idx] = { tier: item.tier + 1 };
    state.selectedIdx = null;
    state.mergedCell = idx;
    render();
    const next = SAKURA_CHAIN[item.tier + 1];
    if (item.tier + 1 === CONFIG.maxTier) {
      toast(`★ ${next.name} forged!`, 'success');
    } else {
      toast(`Merged → ${next.name} (T${item.tier + 1})`, 'success');
    }
  } else {
    state.selectedIdx = idx;
    render();
  }
}

function deliverQuest() {
  const tier = state.questTier;
  const idx = state.board.findIndex(item => item && item.tier === tier);
  if (idx === -1) return toast(`Need a Tier-${tier} ${SAKURA_CHAIN[tier].name}!`, 'warn');

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
  state.selectedIdx = null;
  state.questTier = 3;
  state.spawnedCells.clear();
  state.mergedCell = null;
  render();
  toast('Reset!');
}

function render() {
  renderBoard();
  renderStats();
  renderQuest();
}

function renderBoard() {
  el.board.innerHTML = '';
  const frag = document.createDocumentFragment();
  for (let i = 0; i < state.board.length; i++) {
    const cell = document.createElement('div');
    cell.className = 'cell';
    cell.dataset.idx = i;

    const item = state.board[i];
    if (item) {
      cell.classList.add('has-item', `tier-${item.tier}`);
      const def = SAKURA_CHAIN[item.tier];
      const itemSpan = document.createElement('span');
      itemSpan.className = 'item';
      itemSpan.style.fontSize = def.size + 'px';
      itemSpan.textContent = def.emoji;
      cell.appendChild(itemSpan);
      const badge = document.createElement('div');
      badge.className = 'tier-badge';
      badge.textContent = 'T' + item.tier;
      cell.appendChild(badge);
    }

    if (state.selectedIdx === i) cell.classList.add('selected');
    if (state.spawnedCells.has(i)) cell.classList.add('spawned');
    if (state.mergedCell === i) cell.classList.add('merged');

    cell.addEventListener('click', () => handleCellClick(i));
    frag.appendChild(cell);
  }
  el.board.appendChild(frag);

  // Clear one-shot animation flags after they render
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

let toastTimer = null;
function toast(msg, kind = '') {
  el.toast.textContent = msg;
  el.toast.className = 'toast show ' + kind;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { el.toast.className = 'toast ' + kind; }, 1600);
}

el.generator.addEventListener('click', tapGenerator);
el.questDeliver.addEventListener('click', deliverQuest);
el.reset.addEventListener('click', resetGame);

setInterval(regenEnergy, CONFIG.energyRegenMs);
render();
