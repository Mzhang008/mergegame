// @ts-check
const { defineConfig } = require('@playwright/test');

const phone = { width: 393, height: 852 };

module.exports = defineConfig({
  testDir: 'tests',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [['github'], ['list']] : 'list',
  use: {
    baseURL: 'http://localhost:8765/',
    // Service workers stay off except in pwa.spec.js, so caching can't leak
    // between tests.
    serviceWorkers: 'block',
    trace: 'retain-on-failure',
  },
  webServer: {
    command: 'node tools/serve.js 8765',
    url: 'http://localhost:8765/index.html',
    reuseExistingServer: !process.env.CI,
  },
  projects: [
    { name: 'chromium', use: { browserName: 'chromium', viewport: phone } },
    // Safari's engine; covers iPhone players. Specs that rely on
    // Chromium-only features skip themselves here.
    { name: 'webkit', use: { browserName: 'webkit', viewport: phone } },
  ],
});
