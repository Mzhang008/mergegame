const { expect } = require('@playwright/test');

const STORAGE_KEY = 'sakuraMerge_save';

// Build a board array from {index: [chain, tier]}.
function board(cells = {}, rows = 9) {
  const b = new Array(rows * 7).fill(null);
  for (const [idx, [chain, tier]] of Object.entries(cells)) b[idx] = { chain, tier };
  return b;
}

// Seed a save before the game's script runs (once per tab, so tests can
// reload to check persistence), merged over quiet defaults: intro seen,
// today's blessing claimed, sound and vibration off.
async function seedSave(page, save = {}, { blessedToday = true } = {}) {
  await page.addInitScript(({ key, save, blessedToday }) => {
    if (sessionStorage.getItem('__seeded')) return;
    sessionStorage.setItem('__seeded', '1');
    const d = new Date();
    const today = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    localStorage.setItem(key, JSON.stringify({
      version: 6, ts: Date.now(), regenAnchor: Date.now(), energy: 120,
      coins: 0, xp: 0, level: 1, boardRows: 9, board: [],
      questChain: 'sakura', questTier: 3, restorationStep: 0, restorationSockets: [],
      hasSeenIntro: true, audioOn: false, hapticsOn: false,
      ...(blessedToday ? { lastBlessingDate: today } : {}),
      ...(typeof save === 'function' ? {} : save),
    }));
  }, { key: STORAGE_KEY, save, blessedToday });
}

// Seed, open the game and tap through the splash.
async function startWithSave(page, save = {}, opts = {}) {
  await seedSave(page, save, opts);
  await page.goto('index.html');
  await enterGame(page);
}

async function enterGame(page) {
  await page.locator('#splash').click();
  await expect(page.locator('#splash')).toHaveCount(0);
}

async function dismissDialogue(page) {
  const dialogue = page.locator('#dialogue');
  await expect(dialogue).toBeVisible();
  while (await dialogue.isVisible()) await page.locator('#dialogue-next').click();
}

const cell = (page, idx) => page.locator(`.cell[data-idx="${idx}"]`);
const socket = (page, idx) => page.locator(`.socket[data-idx="${idx}"]`);

// Drag with the mouse from one element to another and wait for the drop
// animation to finish.
async function drag(page, from, to) {
  const a = await from.boundingBox();
  const b = await to.boundingBox();
  await page.mouse.move(a.x + a.width / 2, a.y + a.height / 2);
  await page.mouse.down();
  await page.mouse.move(b.x + b.width / 2, b.y + b.height / 2, { steps: 10 });
  await page.mouse.up();
  await page.waitForFunction(() => !drag.active && !drag.settling);
}

// JSON-safe snapshot of the game state.
const game = page => page.evaluate(() => JSON.parse(JSON.stringify(state)));

module.exports = { STORAGE_KEY, board, seedSave, startWithSave, enterGame, dismissDialogue, cell, socket, drag, game };
