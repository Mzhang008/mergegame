// Village restoration, story beats, levels and the Spirit Album.
const { test, expect } = require('@playwright/test');
const { board, startWithSave, dismissDialogue, cell, socket, drag, game } = require('./helpers');

test('restoring a step: fill the spots, pay, Hana speaks, the village changes', async ({ page }) => {
  await startWithSave(page, {
    coins: 150, restorationStep: 1, restorationSockets: [null, null],
    board: board({ 10: ['sakura', 3], 11: ['food', 3] }),
  });
  await expect(page.locator('#step-name')).toHaveText('Welcome the spirits');
  await expect(page.locator('#step-complete')).toBeDisabled();

  await drag(page, cell(page, 10), socket(page, 0));
  await drag(page, cell(page, 11), socket(page, 1));
  await expect(page.locator('#step-complete')).toBeEnabled();
  await page.locator('#step-complete').click();

  const s = await game(page);
  expect(s.restorationStep).toBe(2);
  expect(s.coins).toBe(50);
  await expect(page.locator('#step-name')).toHaveText('Light the lanterns');
  await expect(page.locator('#dialogue-text')).toContainText('shrine bells');
  await dismissDialogue(page);
  await expect(page.locator('#village-scene')).toHaveAttribute('src', 'art/village-2.svg');
});

test('a spot only accepts the exact item it shows', async ({ page }) => {
  await startWithSave(page, { restorationStep: 2, restorationSockets: [null], board: board({ 10: ['tea', 4] }) });
  await drag(page, cell(page, 10), socket(page, 0));
  expect((await game(page)).restorationSockets).toEqual([null]);
  await expect(page.locator('#toast')).toContainText('Stone Lantern');
});

test('restoring the last step shows the epilogue', async ({ page }) => {
  await startWithSave(page, {
    coins: 700, restorationStep: 4,
    restorationSockets: [{ chain: 'sakura', tier: 5 }, { chain: 'food', tier: 5 }],
  });
  await page.locator('#step-complete').click();
  await dismissDialogue(page);
  await expect(page.locator('#step-name')).toHaveText('Village restored ✨');
  await expect(page.locator('.epilogue-note')).toContainText('Chapter 2');
  await expect(page.locator('#step-complete')).toBeHidden();
});

test('reaching level 5 adds a row to the board', async ({ page }) => {
  // Level 4 needs 606 XP; a tier-5 delivery gives 140.
  await startWithSave(page, {
    level: 4, xp: 500, questChain: 'sakura', questTier: 5, board: board({ 0: ['sakura', 5] }),
  });
  expect((await game(page)).board).toHaveLength(63);
  await page.locator('#quest-deliver').click();
  const s = await game(page);
  expect(s.level).toBe(5);
  expect(s.boardRows).toBe(10);
  expect(s.board).toHaveLength(70);
  await expect(page.locator('.cell')).toHaveCount(70);
});

test('forging a tier-7 item collects its album sticker', async ({ page }) => {
  await startWithSave(page, { board: board({ 10: ['tea', 6], 11: ['tea', 6] }) });
  await drag(page, cell(page, 10), cell(page, 11));
  expect((await game(page)).spiritAlbum).toEqual({ sakura: false, food: false, tea: true });
  await page.locator('#menu-btn').click();
  await expect(page.locator('.album-slot.chain-tea')).toHaveClass(/earned/);
  await expect(page.locator('.album-slot.chain-food')).toHaveClass(/locked/);
});
