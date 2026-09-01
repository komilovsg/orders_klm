const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { chromium } = require('playwright-core');
const { resolveConfig } = require('../server/config');
const { createApp } = require('../server/server');

test('в заказе выводятся текстовые наименования ТМЦ, а не числа', { timeout: 30_000 }, async (t) => {
  const rootDir = path.resolve(__dirname, '..');
  const dataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'klm-tmc-'));
  const config = resolveConfig(rootDir);
  Object.assign(config, { dataDir, databaseFile: path.join(dataDir, 'klm.sqlite'), filesDir: path.join(dataDir, 'files'), importsDir: path.join(dataDir, 'imports'), backupsDir: path.join(dataDir, 'backups') });
  const server = createApp(config);
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const browser = await chromium.launch({ executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe', headless: true });
  t.after(async () => { await browser.close(); server.close(); });
  const page = await browser.newPage({ viewport: { width: 1600, height: 1000 } });
  await page.goto(`http://127.0.0.1:${server.address().port}`);
  const legacyColumns = await page.evaluate(() => window.klmRequirementsTestAPI.columns([
    ['Реестр'],
    ['номер', '', 'Поставщик', 'Статус заказа', 'артикул', 'номенклатура', 'необходимое ко-во, шт/м', 'необходимое ко-во, кг', '', '', '', '', '', 'Название проекта']
  ]));
  assert.deepEqual(legacyColumns, { header: 1, project: 13, item: 5, quantityA: 6, quantityB: 7 });
  const currentColumns = await page.evaluate(() => window.klmRequirementsTestAPI.columns([
    ['номер', '', 'Поставщик', '', '', 'артикул', 'номенклатура', 'необходимое ко-во, шт/м', 'необходимое ко-во, кг', '', '', '', '', '', 'Название проекта']
  ]));
  assert.deepEqual(currentColumns, { header: 0, project: 14, item: 6, quantityA: 7, quantityB: 8 });
  await page.locator('#orderTab').click();
  await page.locator('#orderProjectFilter').click();
  const firstProject = page.locator('#orderProjectOptions input').first();
  await firstProject.check();
  await page.locator('#orderProjectOk').click();
  const names = await page.locator('#itemsBody .item-name').evaluateAll((selects) => selects.slice(0, 20).map((select) => select.value));
  assert.ok(names.length > 0, 'должны загрузиться позиции потребности');
  names.forEach((name) => {
    assert.ok(name.trim().length > 2, 'наименование ТМЦ не должно быть пустым');
    assert.ok(/[A-Za-zА-Яа-яЁё]/.test(name), `в ТМЦ должен быть текст: ${name}`);
  });
  await page.waitForFunction(() => typeof window.klmSyncSelectedTmcToTender === 'function');
  const selectedName = names[0];
  await page.locator('#itemsBody .item-selected').first().check();
  await page.locator('#tenderTab').click();
  await page.waitForSelector('#tenderGroups .tender-group');
  const tenderText = await page.locator('#tenderGroups').innerText();
  assert.match(tenderText, new RegExp(selectedName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
  assert.ok(await page.locator('[data-rfq-copy]').first().isVisible());
  assert.ok(await page.locator('[data-rfq-mail]').first().isVisible());
  await page.locator('#orderTab').click();
  const previousCount = await page.locator('#itemsBody .item-name').count();
  await page.locator('#addItem').click();
  assert.equal(await page.locator('#itemsBody .item-name').count(), previousCount + 1);
  const addedName = await page.locator('#itemsBody .item-name').last().inputValue();
  assert.ok(/[A-Za-zА-Яа-яЁё]/.test(addedName), `добавленная позиция должна иметь наименование: ${addedName}`);
});
