// Analytics stays silent unless configured and allowed, and sends the
// documented GoatCounter requests when it is.
const { test, expect } = require('@playwright/test');
const { board, seedSave, enterGame, cell, socket, drag } = require('./helpers');

// The game never counts on localhost, so these tests serve it from a
// made-up hostname that Chromium maps back to the local server.
test.skip(({ browserName }) => browserName !== 'chromium', 'uses a Chromium host-resolver flag');
test.use({
  baseURL: 'http://sakura.test:8765/',
  launchOptions: { args: ['--host-resolver-rules=MAP sakura.test 127.0.0.1'] },
});

// Record beacons instead of sending them.
async function captureBeacons(page) {
  await page.addInitScript(() => {
    window.__beacons = [];
    navigator.sendBeacon = url => { window.__beacons.push(url); return true; };
  });
}
const beacons = page => page.evaluate(() => window.__beacons.map(u => new URL(u)));

async function enableAnalytics(page) {
  await page.evaluate(() => { ANALYTICS.goatcounterCode = 'sakuratest'; });
}

async function restoreFirstStep(page) {
  await drag(page, cell(page, 10), socket(page, 0));
  await page.locator('#step-complete').click();
}

const firstStepSave = { coins: 50, restorationSockets: [null], board: board({ 10: ['sakura', 3] }) };

test('sends nothing when no GoatCounter code is configured', async ({ page }) => {
  await captureBeacons(page);
  await seedSave(page, firstStepSave);
  await page.goto('index.html');
  await enterGame(page);
  await restoreFirstStep(page);
  expect(await beacons(page)).toHaveLength(0);
});

test('when configured, sends a pageview and once-only milestone events', async ({ page }) => {
  await captureBeacons(page);
  await seedSave(page, firstStepSave);
  await page.goto('index.html');
  await enterGame(page);
  await enableAnalytics(page);
  await page.evaluate(() => trackSessionStart());
  await restoreFirstStep(page);
  const sent = await beacons(page);
  expect(sent.every(u => u.origin === 'https://sakuratest.goatcounter.com' && u.pathname === '/count')).toBe(true);
  const pageview = sent.find(u => u.searchParams.get('p') === '/');
  expect(pageview.searchParams.has('e')).toBe(false);
  const step = sent.find(u => u.searchParams.get('p') === 'restoration-1');
  expect(step.searchParams.get('e')).toBe('true');
  expect(step.searchParams.get('s')).toMatch(/^\d+$/);

  // Once-only: a repeat of the same milestone is not counted again.
  await page.evaluate(() => track('restoration-1', { once: 'ever' }));
  expect((await beacons(page)).filter(u => u.searchParams.get('p') === 'restoration-1')).toHaveLength(1);
});

test('the settings switch opts the player out', async ({ page }) => {
  await captureBeacons(page);
  await seedSave(page, firstStepSave);
  await page.goto('index.html');
  await enterGame(page);
  await enableAnalytics(page);
  await page.locator('#menu-btn').click();
  await page.locator('.sheet-tab[data-tab="settings"]').click();
  const row = page.locator('#set-analytics-row');
  await expect(row).toBeVisible();
  await row.click();
  await page.locator('#sheet-close').click();
  await restoreFirstStep(page);
  expect(await beacons(page)).toHaveLength(0);
});

test('Global Privacy Control disables analytics and the switch', async ({ page }) => {
  await captureBeacons(page);
  await page.addInitScript(() => {
    Object.defineProperty(navigator, 'globalPrivacyControl', { get: () => true });
  });
  await seedSave(page, firstStepSave);
  await page.goto('index.html');
  await enterGame(page);
  await enableAnalytics(page);
  await page.evaluate(() => trackSessionStart());
  await restoreFirstStep(page);
  expect(await beacons(page)).toHaveLength(0);
  await page.locator('#menu-btn').click();
  await page.locator('.sheet-tab[data-tab="settings"]').click();
  await expect(page.locator('#set-analytics')).toBeDisabled();
});
