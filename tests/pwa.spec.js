// Install metadata and offline play.
const fs = require('fs');
const path = require('path');
const { test, expect } = require('@playwright/test');
const { enterGame } = require('./helpers');

const GAME_DIR = path.join(__dirname, '..', 'game');
const NOT_PRECACHED = ['sw.js', 'og-image.jpg'];

function shippedFiles(dir = GAME_DIR) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap(e => e.isDirectory()
    ? shippedFiles(path.join(dir, e.name))
    : [path.relative(GAME_DIR, path.join(dir, e.name)).split(path.sep).join('/')]);
}

function serviceWorker() {
  const src = fs.readFileSync(path.join(GAME_DIR, 'sw.js'), 'utf8');
  const self = { addEventListener() {}, location: { origin: '' } };
  return new Function('self', `${src}; return { PRECACHE, VERSION };`)(self);
}

test('the service worker precaches exactly the shipped files', () => {
  const listed = serviceWorker().PRECACHE.filter(p => p !== './').sort();
  const shipped = shippedFiles().filter(f => !NOT_PRECACHED.includes(f)).sort();
  expect(listed).toEqual(shipped);
});

// A release that forgets sw.js would leave players on the old cached files.
test('the service worker version matches the game version', () => {
  const game = fs.readFileSync(path.join(GAME_DIR, 'game.js'), 'utf8');
  expect(serviceWorker().VERSION).toBe(game.match(/version: '([^']+)'/)[1]);
});

test('the manifest and every icon it lists load', async ({ request }) => {
  const res = await request.get('manifest.webmanifest');
  expect(res.ok()).toBe(true);
  const manifest = await res.json();
  expect(manifest.name).toBe('Sakura Merge');
  expect(manifest.display).toBe('standalone');
  expect(manifest.icons.some(i => i.purpose === 'maskable')).toBe(true);
  for (const icon of manifest.icons) expect((await request.get(icon.src)).ok()).toBe(true);
  expect((await request.get('og-image.jpg')).ok()).toBe(true);
});

test.describe('offline', () => {
  test.skip(({ browserName }) => browserName !== 'chromium', 'service-worker control is tested on Chromium');
  test.use({ serviceWorkers: 'allow' });

  test('the game boots and plays with no network after the first visit', async ({ page, context }) => {
    await page.goto('index.html');
    await page.evaluate(() => navigator.serviceWorker.ready);
    await page.reload();
    await expect.poll(() => page.evaluate(() => !!navigator.serviceWorker.controller)).toBe(true);

    await context.setOffline(true);
    await page.reload();
    await enterGame(page);
    while (await page.locator('#dialogue').isVisible()) await page.locator('#dialogue-next').click();
    await page.locator('#gen-tea').click();
    const art = page.locator('.cell img.item-art').first();
    await expect(art).toBeVisible();
    expect(await art.evaluate(img => img.complete && img.naturalWidth > 0)).toBe(true);
  });
});
