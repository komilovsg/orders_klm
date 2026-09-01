const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { chromium } = require('playwright-core');
const { resolveConfig } = require('../server/config');
const { createApp } = require('../server/server');

const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';

test('панель работает в Chrome: четыре вкладки и основные кнопки', { timeout: 30_000 }, async (t) => {
  assert.ok(fs.existsSync(chromePath), 'Chrome должен быть установлен');
  const rootDir = path.resolve(__dirname, '..');
  const dataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'klm-browser-'));
  const config = resolveConfig(rootDir);
  Object.assign(config, {
    dataDir,
    databaseFile: path.join(dataDir, 'klm.sqlite'),
    filesDir: path.join(dataDir, 'files'),
    importsDir: path.join(dataDir, 'imports'),
    backupsDir: path.join(dataDir, 'backups')
  });
  const server = createApp(config);
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const browser = await chromium.launch({ executablePath: chromePath, headless: true });
  t.after(async () => { await browser.close(); server.close(); });
  const page = await browser.newPage({ viewport: { width: 1600, height: 1000 } });
  await page.goto(`http://127.0.0.1:${server.address().port}`, { waitUntil: 'domcontentloaded' });

  await page.locator('#generalTab').click();
  await expectVisible(page, '#generalSheet');
  await page.locator('[data-general-panel="generalSuppliersPanel"]').click();
  await expectVisible(page, '#generalSuppliersPanel');

  await page.locator('#orderTab').click();
  await expectVisible(page, '#orderSheet');
  await page.locator('#addItem').click();
  assert.equal(await page.locator('#itemsBody .empty').count(), 1);
  assert.equal(await page.locator('#itemsBody .item-name').count(), 0);

  await page.locator('#planTab').click();
  await expectVisible(page, '#paymentPlanSheet');
  assert.ok(await page.locator('#formUrgentPlan').isVisible());
  assert.ok(await page.locator('#updatePlanButton').isVisible());

  await page.locator('#tenderTab').click();
  await expectVisible(page, '#tenderSheet');
  assert.ok(await page.locator('#tenderProjectSelect').isVisible());

  await page.waitForSelector('#stageOneServerBadge');
  await page.waitForFunction(() => document.querySelector('#stageOneServerBadge').textContent.includes('РАБОТАЕТ'));
});

async function expectVisible(page, selector) {
  assert.equal(await page.locator(selector).isVisible(), true, `${selector} должен быть видим`);
}
