// Energy over time, the daily blessing and the Hanami festival.
const { test, expect } = require('@playwright/test');
const { startWithSave, seedSave, enterGame, game } = require('./helpers');

test('energy regenerates 1 point every 20 seconds', async ({ page }) => {
  await page.clock.install();
  await startWithSave(page, { energy: 100 });
  await expect(page.locator('#energy-timer')).toHaveText(/\+1 in 0:(19|20)/);
  await page.clock.runFor(20_000);
  expect((await game(page)).energy).toBe(101);
  await page.clock.runFor(60_000);
  expect((await game(page)).energy).toBe(104);
});

test('energy earned while the game was closed is credited on return', async ({ page }) => {
  await page.addInitScript(() => { window.__tenMinutesAgo = Date.now() - 10 * 60_000; });
  await seedSave(page, { energy: 50 });
  await page.addInitScript(() => {
    const save = JSON.parse(localStorage.getItem('sakuraMerge_save'));
    if (save && !sessionStorage.getItem('__aged')) {
      sessionStorage.setItem('__aged', '1');
      save.regenAnchor = window.__tenMinutesAgo;
      localStorage.setItem('sakuraMerge_save', JSON.stringify(save));
    }
  });
  await page.goto('index.html');
  await enterGame(page);
  expect((await game(page)).energy).toBe(80);
});

test('full energy shows Full and blessing energy can overflow the cap', async ({ page }) => {
  await startWithSave(page, { energy: 120 }, { blessedToday: false });
  await expect(page.locator('#blessing')).toBeVisible();
  await page.locator('#blessing-claim').click();
  expect((await game(page)).energy).toBe(130);
  await expect(page.locator('#energy-timer')).toHaveText('Bonus!');
});

test('the daily blessing streak continues from yesterday and pays day 2', async ({ page }) => {
  await page.addInitScript(() => {
    const d = new Date(Date.now() - 86_400_000);
    window.__yesterday = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  });
  await seedSave(page, { coins: 100, energy: 60, blessingStreak: 1 }, { blessedToday: false });
  await page.addInitScript(() => {
    const save = JSON.parse(localStorage.getItem('sakuraMerge_save'));
    if (save && !save.lastBlessingDate) {
      save.lastBlessingDate = window.__yesterday;
      localStorage.setItem('sakuraMerge_save', JSON.stringify(save));
    }
  });
  await page.goto('index.html');
  await enterGame(page);
  await expect(page.locator('#blessing-day')).toHaveText('2');
  await page.locator('#blessing-claim').click();
  const s = await game(page);
  expect(s.coins).toBe(175);
  expect(s.energy).toBe(75);
  expect(s.blessingStreak).toBe(2);

  // Same day: no second blessing.
  await page.reload();
  await enterGame(page);
  await page.waitForTimeout(700);
  await expect(page.locator('#blessing')).toBeHidden();
});

test('missing a day restarts the streak at day 1', async ({ page }) => {
  await startWithSave(page, { blessingStreak: 5, lastBlessingDate: '2020-01-01' });
  await expect(page.locator('#blessing-day')).toHaveText('1');
});

test('festival decorations cost petals, apply at once and persist', async ({ page }) => {
  await startWithSave(page, { petals: 60 });
  await expect(page.locator('#menu-dot')).toBeVisible();
  await page.locator('#menu-btn').click();
  await page.locator('.sheet-tab[data-tab="festival"]').click();
  await page.locator('.event-item', { hasText: 'Golden Hour' }).click();
  let s = await game(page);
  expect(s.petals).toBe(20);
  expect(s.hanami.goldGlow).toBe(true);
  await expect(page.locator('body')).toHaveClass(/gold-glow/);
  await expect(page.locator('.event-item', { hasText: 'Tanabata Trees' })).toBeDisabled();

  await page.reload();
  await enterGame(page);
  s = await game(page);
  expect(s.hanami.goldGlow).toBe(true);
  await expect(page.locator('body')).toHaveClass(/gold-glow/);
});
