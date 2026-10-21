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
  const version = await page.evaluate(() => CONFIG.version);
  await expect(page.locator('#version')).toHaveText(`Sakura Merge v${version}`);
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
  await expect(page.locator('h1')).toHaveText('Credits & licenses');
});

test('all art loads undistorted, and emoji in the interface show as pixel icons', async ({ page }) => {
  await startWithSave(page, { hanami: { petalRain: true, goldGlow: false, tanabata: true } });
  await page.locator('#menu-btn').click();
  await page.waitForFunction(() => [...document.images].every(img => img.complete));
  // Broken images, and shown images whose box doesn't match the art's shape
  // (cropping with object-fit is deliberate and skipped).
  const problems = () => page.evaluate(() => [...document.images].flatMap(img => {
    if (img.naturalWidth === 0) return [`broken: ${img.src}`];
    if (!img.offsetWidth || getComputedStyle(img).objectFit !== 'fill') return [];
    const expected = img.offsetWidth * img.naturalHeight / img.naturalWidth;
    return Math.abs(img.offsetHeight - expected) > 1.5 ? [`stretched: ${img.src}`] : [];
  }));
  expect(await problems()).toEqual([]);
  await page.locator('.sheet-tab[data-tab="festival"]').click();
  expect(await problems()).toEqual([]);
  const r = await page.evaluate(() => ({
    icons: document.querySelectorAll('img.icon').length,
    leftover: document.body.textContent.match(/[⚡🪙🌸✨🎁⛩🎋]/gu) || [],
  }));
  expect(r.icons).toBeGreaterThan(5);
  expect(r.leftover).toEqual([]);
  for (const face of ['hana-joy', 'hana-moved']) {
    expect((await page.request.get(`art/${face}.png`)).ok()).toBe(true);
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
