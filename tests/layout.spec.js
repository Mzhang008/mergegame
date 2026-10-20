// The whole game fits on one screen, the menu sheet works, and reduced
// motion is respected.
const { test, expect } = require('@playwright/test');
const { board, startWithSave, game } = require('./helpers');

// Visible viewport inside mobile Safari (browser bars removed) and desktop.
const SCREENS = [
  ['iPhone SE in Safari', 375, 548],
  ['iPhone 15 in Safari', 393, 659],
  ['iPhone 15 Pro Max in Safari', 430, 746],
  ['desktop', 1280, 800],
];

for (const [name, width, height] of SCREENS) {
  test(`fits one screen without scrolling: ${name}`, async ({ page }) => {
    await page.setViewportSize({ width, height });
    await startWithSave(page, { board: board({ 0: ['sakura', 7], 20: ['food', 4] }) });
    const m = await page.evaluate(() => ({
      scroll: document.documentElement.scrollHeight,
      gens: document.querySelector('.generators').getBoundingClientRect().bottom,
      cell: document.querySelector('.cell').getBoundingClientRect().width,
    }));
    expect(m.scroll).toBeLessThanOrEqual(height);
    expect(m.gens).toBeLessThanOrEqual(height);
    // Below ~32px, items stop being legible and comfortable to drag.
    expect(m.cell).toBeGreaterThanOrEqual(32);
  });
}

test('the menu sheet switches tabs, saves settings and closes', async ({ page }) => {
  await startWithSave(page, { audioOn: true, hapticsOn: true });
  await page.locator('#menu-btn').click();
  await expect(page.locator('[data-panel="album"]')).toBeVisible();
  await page.locator('.sheet-tab[data-tab="settings"]').click();
  await expect(page.locator('[data-panel="album"]')).toBeHidden();
  await expect(page.locator('#version')).toHaveText('Sakura Merge v1.0.0');
  // Analytics isn't configured in the shipped build, so no switch is shown.
  await expect(page.locator('#set-analytics-row')).toBeHidden();
  await page.locator('label.setting', { hasText: 'Sound' }).click();
  await page.locator('label.setting', { hasText: 'Vibration' }).click();
  expect(await game(page)).toMatchObject({ audioOn: false, hapticsOn: false });
  await page.keyboard.press('Escape');
  await expect(page.locator('#sheet')).toBeHidden();
});

test('privacy policy and credits open from settings', async ({ page }) => {
  await startWithSave(page);
  await page.locator('#menu-btn').click();
  await page.locator('.sheet-tab[data-tab="settings"]').click();
  await page.locator('a[href="privacy.html"]').click();
  await expect(page.locator('h1')).toHaveText('Privacy policy');
  await page.goto('credits.html');
  await expect(page.locator('body')).toContainText('CC BY 4.0');
  for (const href of ['lib/LICENSE-twemoji-graphics.txt', 'lib/LICENSE-twemoji-code.txt']) {
    const res = await page.request.get(href);
    expect(res.status()).toBe(200);
  }
});

test.describe('with reduced motion', () => {
  test('looping animations stop and falling petals are hidden', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto('index.html');
    const r = await page.evaluate(() => ({
      logo: getComputedStyle(document.querySelector('.splash-logo')).animationName,
      petal: getComputedStyle(document.querySelector('.falling-petal')).display,
    }));
    expect(r.logo).toBe('none');
    expect(r.petal).toBe('none');
  });
});
