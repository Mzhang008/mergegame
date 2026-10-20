// Saving, loading and migrating old saves.
const { test, expect } = require('@playwright/test');
const { STORAGE_KEY, board, startWithSave, enterGame, cell, drag, game } = require('./helpers');

test('progress survives a reload', async ({ page }) => {
  await startWithSave(page, { coins: 42, board: board({ 3: ['food', 2], 4: ['food', 2] }) });
  await drag(page, cell(page, 3), cell(page, 4));
  await page.reload();
  await enterGame(page);
  const s = await game(page);
  expect(s.coins).toBe(42);
  expect(s.board[4]).toEqual({ chain: 'food', tier: 3 });
  expect(s.board[3]).toBeNull();
});

test('a pre-1.0 save migrates its chains, album and socket deposits', async ({ page }) => {
  await page.addInitScript(key => {
    if (sessionStorage.getItem('__seeded')) return;
    sessionStorage.setItem('__seeded', '1');
    const b = new Array(63).fill(null);
    b[0] = { chain: 'sushi', tier: 2 };
    b[1] = { chain: 'lantern', tier: 3 };
    b[2] = { chain: 'unknown', tier: 1 };
    b[3] = { chain: 'sakura', tier: 99 };
    localStorage.setItem(key, JSON.stringify({
      version: 5, ts: Date.now(), energy: 80, coins: 300, level: 4, boardRows: 9, board: b,
      questChain: 'lantern', questTier: 3, restorationStep: 2,
      restorationSockets: [{ chain: 'lantern', tier: 4 }],
      spiritAlbum: { sakura: false, sushi: false, lantern: true },
      hasSeenIntro: true, lastBlessingDate: '2999-01-01',
    }));
  }, STORAGE_KEY);
  await page.goto('index.html');
  await enterGame(page);
  const s = await game(page);
  expect(s.board[0]).toEqual({ chain: 'food', tier: 2 });
  expect(s.board[1]).toEqual({ chain: 'tea', tier: 3 });
  expect(s.board[3]).toBeNull();
  expect(s.questChain).toBe('tea');
  expect(s.spiritAlbum).toEqual({ sakura: false, food: false, tea: true });
  // The old lantern deposit no longer fits step 3 (it wants a Stone
  // Lantern), so it goes back onto the board.
  expect(s.restorationSockets).toEqual([null]);
  expect(s.board.filter(i => i && i.chain === 'tea' && i.tier === 4)).toHaveLength(1);
});

test('a corrupted save starts a fresh game instead of crashing', async ({ page }) => {
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  await page.addInitScript(key => localStorage.setItem(key, '{not json'), STORAGE_KEY);
  await page.goto('index.html');
  await expect(page.locator('#splash')).toBeVisible();
  const s = await game(page);
  expect(s.level).toBe(1);
  expect(s.coins).toBe(0);
  expect(errors).toEqual([]);
});

test('a save from a newer version is left alone', async ({ page }) => {
  await page.addInitScript(key => {
    if (!sessionStorage.getItem('__seeded')) {
      sessionStorage.setItem('__seeded', '1');
      localStorage.setItem(key, JSON.stringify({ version: 999, coins: 5000 }));
    }
  }, STORAGE_KEY);
  await page.goto('index.html');
  expect((await game(page)).coins).toBe(0);
});

test('reset wipes progress but keeps settings', async ({ page }) => {
  await startWithSave(page, { coins: 900, level: 7, audioOn: false, hapticsOn: false, board: board({ 5: ['tea', 6] }) });
  page.on('dialog', d => d.accept());
  await page.locator('#menu-btn').click();
  await page.locator('.sheet-tab[data-tab="settings"]').click();
  await page.locator('#reset').click();
  const s = await game(page);
  expect(s.coins).toBe(0);
  expect(s.level).toBe(1);
  expect(s.board.filter(Boolean)).toHaveLength(0);
  expect(s.audioOn).toBe(false);
  expect(s.hapticsOn).toBe(false);
  await expect(page.locator('#dialogue')).toBeVisible();
});
