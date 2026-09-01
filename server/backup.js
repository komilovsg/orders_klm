const fs = require('node:fs');
const path = require('node:path');
const { resolveConfig } = require('./config');
const { openDatabase, audit } = require('./storage');

function timestamp(date = new Date()) {
  return date.toISOString().replace(/[:.]/g, '-');
}

function createBackup(config = resolveConfig()) {
  const db = openDatabase(config);
  const startedAt = new Date().toISOString();
  const run = db.prepare("INSERT INTO backup_runs(started_at, status) VALUES (?, 'running')").run(startedAt);
  const destination = path.join(config.backupsDir, `klm-${timestamp()}.sqlite`);
  try {
    db.exec('PRAGMA wal_checkpoint(FULL)');
    fs.copyFileSync(config.databaseFile, destination);
    db.prepare("UPDATE backup_runs SET finished_at=?, status='complete', file_path=? WHERE id=?")
      .run(new Date().toISOString(), destination, run.lastInsertRowid);
    audit(db, 'backup.completed', { destination });
    return destination;
  } catch (error) {
    db.prepare("UPDATE backup_runs SET finished_at=?, status='failed', error=? WHERE id=?")
      .run(new Date().toISOString(), error.message, run.lastInsertRowid);
    throw error;
  } finally {
    db.close();
  }
}

if (require.main === module) {
  process.stdout.write(`${createBackup()}\n`);
}

module.exports = { createBackup };
