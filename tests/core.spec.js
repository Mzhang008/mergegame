// Board, merging, quests and selling.
const { test, expect } = require('@playwright/test');
const { board, startWithSave, cell, drag, game } = require('./helpers');

test('each generator spawns tier-1 items of its own chain and costs 1 energy', async ({ page }) => {
  await startWithSave(page);
  for (const chain of ['sakura', 'food', 'tea']) {
    const before = await game(page);
    await page.locator(`#gen-${chain}`).click();
    const after = await game(page);
    const spawned = after.board.filter(i => i && i.chain === chain).length;
    expect(spawned).toBeGreaterThan(0);
    expect(after.board.filter(i => i && i.chain === chain).every(i => i.tier === 1)).toBe(true);
    expect(after.energy).toBe(before.energy - 1);
  }
});

test('two items of the same chain and tier merge into the next tier', async ({ page }) => {
  await startWithSave(page, { board: board({ 10: ['food', 4], 12: ['food', 4] }) });
  await drag(page, cell(page, 10), cell(page, 12));
  const s = await game(page);
  expect(s.board[10]).toBeNull();
  expect(s.board[12]).toEqual({ chain: 'food', tier: 5 });
  await expect(page.locator('.cell[data-idx="12"] img')).toHaveAttribute('alt', 'Sake Set');
});

test('items from different chains do not merge and snap back', async ({ page }) => {
  await startWithSave(page, { board: board({ 10: ['sakura', 3], 12: ['tea', 3] }) });
  await drag(page, cell(page, 10), cell(page, 12));
  const s = await game(page);
  expect(s.board[10]).toEqual({ chain: 'sakura', tier: 3 });
  expect(s.board[12]).toEqual({ chain: 'tea', tier: 3 });
});

test('dropping on an empty cell moves the item', async ({ page }) => {
  await startWithSave(page, { board: board({ 10: ['tea', 2] }) });
  await drag(page, cell(page, 10), cell(page, 40));
  const s = await game(page);
  expect(s.board[10]).toBeNull();
  expect(s.board[40]).toEqual({ chain: 'tea', tier: 2 });
});

test('merges of tier 3 and up earn festival petals', async ({ page }) => {
  await startWithSave(page, { board: board({ 1: ['sakura', 1], 2: ['sakura', 1], 10: ['tea', 3], 11: ['tea', 3] }) });
  await drag(page, cell(page, 1), cell(page, 2));
  expect((await game(page)).petals).toBe(0);
  await drag(page, cell(page, 10), cell(page, 11));
  expect((await game(page)).petals).toBe(2);
  await expect(page.locator('#petals')).toHaveText('2');
});

test('delivering a quest pays coins and XP and picks a new quest', async ({ page }) => {
  await startWithSave(page, { board: board({ 5: ['sakura', 3] }), questChain: 'sakura', questTier: 3 });
  await expect(page.locator('#quest-text')).toHaveText('Blossom Branch');
  await page.locator('#quest-deliver').click();
  const s = await game(page);
  expect(s.coins).toBe(15);
  expect(s.xp).toBe(25);
  expect(s.board[5]).toBeNull();
});

test('the deliver button is disabled until the item is on the board', async ({ page }) => {
  await startWithSave(page, { questChain: 'tea', questTier: 4 });
  await expect(page.locator('#quest-deliver')).toBeDisabled();
});

test('skipping a quest always offers a different one', async ({ page }) => {
  await startWithSave(page, { questChain: 'food', questTier: 3 });
  for (let i = 0; i < 5; i++) {
    const before = await game(page);
    await page.locator('#quest-skip').click();
    const after = await game(page);
    expect(after.questChain + after.questTier).not.toBe(before.questChain + before.questTier);
  }
});

test('selling an item pays its price and Undo puts it back', async ({ page }) => {
  await startWithSave(page, { coins: 100, board: board({ 17: ['sakura', 7] }) });
  const from = cell(page, 17);
  const a = await from.boundingBox();
  await page.mouse.move(a.x + a.width / 2, a.y + a.height / 2);
  await page.mouse.down();
  await expect(page.locator('#sell-zone')).toBeVisible();
  await expect(page.locator('#sell-value')).toHaveText('150 coins');
  const z = await page.locator('#sell-zone').boundingBox();
  await page.mouse.move(z.x + z.width / 2, z.y + z.height / 2, { steps: 10 });
  await page.mouse.up();
  await page.waitForFunction(() => !drag.active && !drag.settling);
  let s = await game(page);
  expect(s.board[17]).toBeNull();
  expect(s.coins).toBe(250);
  await expect(page.locator('#sell-zone')).toBeHidden();
  await page.locator('.toast-action').click();
  s = await game(page);
  expect(s.board[17]).toEqual({ chain: 'sakura', tier: 7 });
  expect(s.coins).toBe(100);
});

test('generators stop when energy runs out', async ({ page }) => {
  await startWithSave(page, { energy: 0 });
  await page.locator('#gen-sakura').click();
  const s = await game(page);
  expect(s.board.filter(Boolean)).toHaveLength(0);
  await expect(page.locator('#toast')).toContainText('Out of energy');
});

test('a full board tells the player how to make room', async ({ page }) => {
  const full = {};
  for (let i = 0; i < 63; i++) full[i] = [['sakura', 'food', 'tea'][i % 3], 1 + (i % 7)];
  await startWithSave(page, { board: board(full) });
  await page.locator('#gen-tea').click();
  await expect(page.locator('#toast')).toContainText('Board is full');
  expect((await game(page)).energy).toBe(120);
});
