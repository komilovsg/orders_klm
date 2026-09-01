const path = require('node:path');

function resolveConfig(rootDir = path.resolve(__dirname, '..')) {
  const dataDir = path.resolve(rootDir, process.env.DATA_DIR || 'data');
  const sharedDataDir = process.env.SHARED_DATA_DIR
    ? path.resolve(process.env.SHARED_DATA_DIR)
    : null;

  return {
    rootDir,
    host: process.env.HOST || '0.0.0.0',
    port: Number(process.env.PORT || 3000),
    timezone: process.env.APP_TIMEZONE || 'Europe/Moscow',
    dataDir,
    sharedDataDir,
    databaseFile: path.join(dataDir, 'klm.sqlite'),
    filesDir: path.join(dataDir, 'files'),
    importsDir: path.join(dataDir, 'imports'),
    backupsDir: path.join(dataDir, 'backups'),
    backupIntervalHours: Math.max(1, Number(process.env.BACKUP_INTERVAL_HOURS || 24)),
    panelFile: path.join(rootDir, 'ПЛАН_ОПЛАТ_с_фильтрами (62).html')
  };
}

module.exports = { resolveConfig };
