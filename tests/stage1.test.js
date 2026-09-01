const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { resolveConfig } = require('../server/config');
const { openDatabase } = require('../server/storage');
const { createBackup } = require('../server/backup');
const { createApp } = require('../server/server');

function testConfig() {
  const rootDir = path.resolve(__dirname, '..');
  const dataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'klm-stage1-'));
  const config = resolveConfig(rootDir);
  config.dataDir = dataDir;
  config.databaseFile = path.join(dataDir, 'klm.sqlite');
  config.filesDir = path.join(dataDir, 'files');
  config.importsDir = path.join(dataDir, 'imports');
  config.backupsDir = path.join(dataDir, 'backups');
  return config;
}

test('создаёт базу и обязательные таблицы', () => {
  const config = testConfig();
  const db = openDatabase(config);
  const names = db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all().map((row) => row.name);
  ['schema_migrations', 'system_settings', 'audit_log', 'backup_runs', 'import_runs'].forEach((name) => assert.ok(names.includes(name)));
  db.close();
});

test('создаёт ежедневную резервную копию базы', () => {
  const config = testConfig();
  const file = createBackup(config);
  assert.ok(fs.existsSync(file));
  assert.ok(fs.statSync(file).size > 0);
});

test('отдаёт health-check, архитектуру и исходную панель', async (t) => {
  const config = testConfig();
  const server = createApp(config);
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  t.after(() => server.close());
  const port = server.address().port;
  const health = await fetch(`http://127.0.0.1:${port}/api/health`).then((r) => r.json());
  assert.equal(health.status, 'ok');
  assert.equal(health.auth, 'public-link-temporary');
  const architecture = await fetch(`http://127.0.0.1:${port}/api/architecture`).then((r) => r.json());
  assert.equal(architecture.clients, 'multiple browsers');
  const html = await fetch(`http://127.0.0.1:${port}/`).then((r) => r.text());
  ['generalTab', 'orderTab', 'planTab', 'tenderTab', 'stageOneServerBadge'].forEach((id) => assert.match(html, new RegExp(id)));
});
