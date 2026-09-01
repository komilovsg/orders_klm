const fs = require('node:fs');
const path = require('node:path');

function resolveConfig(rootDir = path.resolve(__dirname, '..')) {
  const dataDir = path.resolve(rootDir, process.env.DATA_DIR || 'data');
  const sharedDataDir = process.env.SHARED_DATA_DIR
    ? path.resolve(process.env.SHARED_DATA_DIR)
    : null;

  // Прототип ищем по порядку: корневой index.html (его раздаёт Vercel),
  // перенесённая копия в prototype/, затем исторический путь в корне.
  const kandidaty = [
    path.join(rootDir, 'index.html'),
    path.join(rootDir, 'prototype', 'ПЛАН_ОПЛАТ_с_фильтрами (62).html'),
    path.join(rootDir, 'ПЛАН_ОПЛАТ_с_фильтрами (62).html'),
  ];

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
    panelFile: kandidaty.find((f) => fs.existsSync(f)) ?? kandidaty[0]
  };
}

module.exports = { resolveConfig };
