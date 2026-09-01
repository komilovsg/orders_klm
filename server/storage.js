const fs = require('node:fs');
const path = require('node:path');
const { DatabaseSync } = require('node:sqlite');

function ensureDirectories(config) {
  [config.dataDir, config.filesDir, config.importsDir, config.backupsDir].forEach((dir) => {
    fs.mkdirSync(dir, { recursive: true });
  });
  ['requirements', 'invoices', 'payments', 'balances', 'supplier-risk'].forEach((name) => {
    fs.mkdirSync(path.join(config.importsDir, name), { recursive: true });
  });
}

function openDatabase(config) {
  ensureDirectories(config);
  const db = new DatabaseSync(config.databaseFile);
  db.exec(`
    PRAGMA journal_mode = WAL;
    PRAGMA foreign_keys = ON;
    CREATE TABLE IF NOT EXISTS schema_migrations (
      version INTEGER PRIMARY KEY,
      applied_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS system_settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS audit_log (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      occurred_at TEXT NOT NULL,
      actor TEXT NOT NULL,
      action TEXT NOT NULL,
      entity_type TEXT NOT NULL,
      entity_id TEXT,
      payload_json TEXT NOT NULL DEFAULT '{}'
    );
    CREATE TABLE IF NOT EXISTS backup_runs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      started_at TEXT NOT NULL,
      finished_at TEXT,
      status TEXT NOT NULL,
      file_path TEXT,
      error TEXT
    );
    CREATE TABLE IF NOT EXISTS import_runs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      kind TEXT NOT NULL,
      source_name TEXT NOT NULL,
      status TEXT NOT NULL,
      stats_json TEXT NOT NULL DEFAULT '{}',
      created_at TEXT NOT NULL
    );
  `);
  db.prepare('INSERT OR IGNORE INTO schema_migrations(version, applied_at) VALUES (?, ?)')
    .run(1, new Date().toISOString());
  const upsert = db.prepare(`
    INSERT INTO system_settings(key, value, updated_at) VALUES (?, ?, ?)
    ON CONFLICT(key) DO UPDATE SET value=excluded.value, updated_at=excluded.updated_at
  `);
  const now = new Date().toISOString();
  upsert.run('APP_TIMEZONE', config.timezone, now);
  upsert.run('AUTH_MODE', 'public_link_stage1', now);
  upsert.run('STORAGE_LOCAL', config.dataDir, now);
  upsert.run('STORAGE_SHARED', config.sharedDataDir || '', now);
  return db;
}

function audit(db, action, payload = {}, entityType = 'system', entityId = null) {
  db.prepare(`
    INSERT INTO audit_log(occurred_at, actor, action, entity_type, entity_id, payload_json)
    VALUES (?, 'anonymous-link-user', ?, ?, ?, ?)
  `).run(new Date().toISOString(), action, entityType, entityId, JSON.stringify(payload));
}

module.exports = { ensureDirectories, openDatabase, audit };
