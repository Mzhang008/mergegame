// Render the 1200x630 link-preview image (game/og-image.jpg) from the game's
// own art: the restored village, the app icon and a few items.
// Usage: node tools/make_og.js   (after tools/process_art.py)
const fs = require('fs');
const path = require('path');
const { chromium } = require('@playwright/test');

const GAME = path.join(__dirname, '..', 'game');
const data = (file, type) => `data:${type};base64,${fs.readFileSync(path.join(GAME, file)).toString('base64')}`;
const ITEMS = ['sakura-3', 'sakura-5', 'food-2', 'food-4', 'tea-2', 'tea-4'];

const html = `<body style="margin:0;width:1200px;height:630px;overflow:hidden;position:relative;
  font-family:-apple-system,'Segoe UI',system-ui,sans-serif">
  <img src="${data('art/village-5.webp', 'image/webp')}" style="position:absolute;inset:0;width:100%;height:100%;object-fit:cover;object-position:50% 70%">
  <div style="position:absolute;inset:0;background:linear-gradient(90deg,rgba(255,246,250,.94) 0%,rgba(255,246,250,.86) 38%,rgba(255,246,250,0) 62%)"></div>
  <div style="position:absolute;left:70px;top:0;bottom:0;display:flex;flex-direction:column;justify-content:center">
    <img src="${data('icons/icon-512.png', 'image/png')}" style="width:150px;height:150px;border-radius:34px;box-shadow:0 14px 36px rgba(176,71,114,.35)">
    <div style="font-size:84px;font-weight:800;color:#a33d68;margin-top:26px;letter-spacing:.5px">Sakura Merge</div>
    <div style="font-size:31px;color:#7d4a62;margin-top:6px;line-height:1.3">Restore a hidden spirit village,<br>one merge at a time.</div>
    <div style="display:flex;gap:12px;margin-top:30px">
      ${ITEMS.map(i => `<div style="width:74px;height:74px;background:rgba(255,255,255,.9);border-radius:16px;display:flex;align-items:center;justify-content:center;box-shadow:0 4px 12px rgba(217,97,138,.22)"><img src="${data(`art/items/${i}.png`, 'image/png')}" style="width:62px;height:62px"></div>`).join('')}
    </div>
  </div>
</body>`;

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1200, height: 630 } });
  await page.setContent(html);
  await page.waitForFunction(() => [...document.images].every(img => img.complete));
  await page.screenshot({ path: path.join(GAME, 'og-image.jpg'), type: 'jpeg', quality: 88 });
  await browser.close();
  console.log('wrote game/og-image.jpg');
})();
