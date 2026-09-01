const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { chromium } = require('playwright-core');
const { resolveConfig } = require('../server/config');
const { createApp } = require('../server/server');

test('утверждённый счёт сохраняется с условиями и попадает в план оплат', { timeout: 30_000 }, async (t) => {
  const rootDir = path.resolve(__dirname, '..');
  const dataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'klm-approval-'));
  const config = resolveConfig(rootDir);
  Object.assign(config, { dataDir, databaseFile: path.join(dataDir, 'klm.sqlite'), filesDir: path.join(dataDir, 'files'), importsDir: path.join(dataDir, 'imports'), backupsDir: path.join(dataDir, 'backups') });
  const server = createApp(config);
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const browser = await chromium.launch({ executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe', headless: true });
  t.after(async () => { await browser.close(); server.close(); });
  const page = await browser.newPage({ viewport: { width: 1600, height: 1000 } });
  await page.goto(`http://127.0.0.1:${server.address().port}`);
  await page.locator('#orderTab').click();

  await page.locator('#orderProjectFilter').click();
  await page.locator('#orderProjectOptions input').first().check();
  await page.locator('#orderProjectOk').click();
  const project = await page.locator('#project option:checked').first().getAttribute('value');
  await page.evaluate((projectName) => {
    const invoice = { section: 5, supplier: 'БЕЛПРОМСВЕТ ООО', payer: 'Главпроект', project: projectName, supplierInvoiceNumber: 'TEST-1', invoice: 'Счёт № TEST-1 от 01.09.2026', item: 'Тестовая позиция ТМЦ', amount: 100000, paid: 0, arrival: '—', sourceFileKey: 'test-approved-invoice' };
    localStorage.setItem('klmLocallyImportedInvoices', JSON.stringify([invoice]));
    window.klmAttachSupplierInvoiceToOrder(invoice);
  }, project);

  await page.locator('#orderSupplierFilter').click();
  await page.locator('#orderSupplierOptions input[value="БЕЛПРОМСВЕТ ООО"]').check();
  await page.locator('#orderSupplierOk').click();
  await page.locator('#orderPayerFilter').click();
  await page.locator('#orderPayerOptions input[value="ООО «Главпроект»"]').check();
  await page.locator('#orderPayerOk').click();
  await page.locator('#launchEnabled').check();
  await page.locator('#launchPercent').fill('30');
  await page.locator('#launchDate').fill('2026-09-02');
  await page.locator('#pickupDistance').fill('25');
  await page.locator('#pickupCost').fill('5000');
  await page.locator('#saveButton').click();

  const approved = await page.evaluate(() => JSON.parse(localStorage.getItem('klmApprovedOrdersV1') || '[]'));
  assert.equal(approved.length, 1);
  assert.match(approved[0].paymentTerms, /В запуск: 30%/);
  assert.match(approved[0].deliveryTerms, /Самовывоз/);
  assert.equal(approved[0].amount, 100000);

  await page.locator('#planTab').click();
  await page.locator('#showAllPayments').click();
  await page.waitForSelector('.plan-conditions');
  const planText = await page.locator('#paymentPlanContent').innerText();
  assert.match(planText, /В запуск: 30%/);
  assert.match(planText, /Самовывоз/);
});
