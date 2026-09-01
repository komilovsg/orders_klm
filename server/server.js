const http = require('node:http');
const fs = require('node:fs');
const { URL } = require('node:url');
const { resolveConfig } = require('./config');
const { openDatabase, audit } = require('./storage');
const { createBackup } = require('./backup');

function json(response, status, body) {
  response.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
    'X-Content-Type-Options': 'nosniff'
  });
  response.end(JSON.stringify(body));
}

function stageOneClient() {
  return `<script>
  (function(){
    var badge=document.createElement('div');
    badge.id='stageOneServerBadge';
    badge.style.cssText='position:fixed;right:18px;bottom:18px;z-index:99999;background:#111;color:#fff;border:2px solid #b9ff38;border-radius:14px;padding:10px 14px;font:700 12px/1.2 Arial,sans-serif;box-shadow:0 8px 28px #0003';
    badge.textContent='СЕРВЕР: ПРОВЕРКА…';document.body.appendChild(badge);
    fetch('/api/health').then(function(r){return r.json();}).then(function(data){
      badge.textContent='СЕРВЕР: РАБОТАЕТ · '+data.storage.toUpperCase();
      badge.title='Этап 1 · '+data.timezone+' · база '+data.database;
    }).catch(function(){badge.textContent='СЕРВЕР: НЕТ СВЯЗИ';badge.style.borderColor='#ff5c5c';});
    if(new URLSearchParams(location.search).get('qa')==='1')setTimeout(function(){
      var checks={};
      ['generalTab','orderTab','planTab','tenderTab'].forEach(function(id){
        var button=document.getElementById(id);button.click();checks[id]=button.classList.contains('active');
      });
      document.getElementById('generalTab').click();
      var panelButton=document.querySelector('[data-general-panel="generalSuppliersPanel"]');
      panelButton.click();checks.generalPanel=!document.getElementById('generalSuppliersPanel').hidden;
      var result=document.createElement('output');result.id='stageOneQaResult';
      result.dataset.passed=Object.values(checks).every(Boolean)?'true':'false';
      result.textContent=JSON.stringify(checks);document.body.appendChild(result);
    },800);
  })();
  </script>`;
}

function createApp(config = resolveConfig()) {
  const db = openDatabase(config);
  audit(db, 'server.started', { host: config.host, port: config.port });

  const handler = (request, response) => {
    const url = new URL(request.url, `http://${request.headers.host || 'localhost'}`);
    if (request.method === 'GET' && url.pathname === '/api/health') {
      return json(response, 200, {
        status: 'ok',
        stage: 1,
        database: 'sqlite-stage1/postgresql-production',
        storage: config.sharedDataDir ? 'local+shared' : 'local',
        timezone: config.timezone,
        auth: 'public-link-temporary',
        timestamp: new Date().toISOString()
      });
    }
    if (request.method === 'GET' && url.pathname === '/api/architecture') {
      return json(response, 200, {
        clients: 'multiple browsers',
        frontend: 'approved HTML prototype during Stage 1',
        api: 'Node.js Stage 1 gateway; FastAPI target adapter',
        database: 'SQLite demonstration; PostgreSQL production target',
        fileStorage: { local: config.filesDir, shared: config.sharedDataDir },
        backupEveryHours: config.backupIntervalHours,
        authentication: 'disabled by customer decision for demonstration'
      });
    }
    if (request.method === 'GET' && url.pathname === '/api/audit') {
      const rows = db.prepare('SELECT * FROM audit_log ORDER BY id DESC LIMIT 50').all();
      return json(response, 200, rows);
    }
    if (request.method === 'POST' && url.pathname === '/api/backup') {
      const file = createBackup(config);
      return json(response, 201, { status: 'complete', file });
    }
    if (request.method === 'GET' && (url.pathname === '/' || url.pathname === '/index.html')) {
      let html = fs.readFileSync(config.panelFile, 'utf8');
      html = html.replace('</body>', `${stageOneClient()}</body>`);
      response.writeHead(200, {
        'Content-Type': 'text/html; charset=utf-8',
        'Cache-Control': 'no-store',
        'X-Content-Type-Options': 'nosniff',
        'Referrer-Policy': 'no-referrer'
      });
      return response.end(html);
    }
    return json(response, 404, { error: 'not_found' });
  };

  const server = http.createServer(handler);
  const backupTimer = setInterval(() => {
    try { createBackup(config); } catch (error) { audit(db, 'backup.failed', { error: error.message }); }
  }, config.backupIntervalHours * 60 * 60 * 1000);
  backupTimer.unref();
  server.on('close', () => db.close());
  return server;
}

if (require.main === module) {
  const config = resolveConfig();
  const server = createApp(config);
  server.listen(config.port, config.host, () => {
    process.stdout.write(`KLM panel: http://localhost:${config.port}\n`);
  });
}

module.exports = { createApp };
