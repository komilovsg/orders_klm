// Вытаскивает данные из HTML-прототипа в public/data/*.json.
// Прототип держит 923 KB данных прямо в разметке; здесь они уезжают в отдельные файлы,
// чтобы приложение грузило их по fetch, а не тащило одним куском HTML.
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const out = resolve(root, 'web/public/data');
// Каталог не в репозитории — данные генерируемые. В чистом клоне его нужно создать,
// иначе запись падает с ENOENT (так ломалась сборка на Vercel).
mkdirSync(out, { recursive: true });
const html = readFileSync(resolve(root, 'prototype/ПЛАН_ОПЛАТ_с_фильтрами (62).html'), 'utf8');

const jsonBlock = (id) => {
  const m = html.match(
    new RegExp(`<script id="${id}" type="application/json">([\\s\\S]*?)</script>`)
  );
  if (!m) throw new Error(`Блок данных "${id}" не найден в прототипе`);
  return JSON.parse(m[1]);
};

// productionRegistryRows объявлен как обычная переменная, а не JSON-блок.
const inlineArray = (name) => {
  const m = html.match(new RegExp(`var ${name}\\s*=\\s*(\\[[\\s\\S]*?\\]);`));
  if (!m) throw new Error(`Массив "${name}" не найден в прототипе`);
  return JSON.parse(m[1]);
};

const registry = jsonBlock('registryData');
const suppliers = jsonBlock('suppliersData');
const production = inlineArray('productionRegistryRows');

// Реестр приходит вложенным: заказ -> позиции. Плоский вид нужен таблице,
// сгруппированный — карточкам заказов. Пишем плоский, группировка дешевле на клиенте.
const items = registry.requirements.flatMap((req) =>
  req.items.map((it) => ({
    order: req.orderNumber,
    project: req.project,
    name: it.name,
    unit: it.unit,
    quantity: it.quantity,
  }))
);

const stats = {
  orders: registry.requirements.length,
  projects: new Set(registry.requirements.map((r) => r.project)).size,
  items: items.length,
  suppliers: suppliers.length,
  byUnit: items.reduce((acc, i) => ((acc[i.unit] = (acc[i.unit] || 0) + 1), acc), {}),
  source: registry.source,
};

const write = (file, data) => {
  const json = JSON.stringify(data);
  writeFileSync(resolve(out, file), json);
  console.log(`${file.padEnd(16)} ${(json.length / 1024).toFixed(0).padStart(5)} KB`);
};

write('items.json', items);
write('suppliers.json', suppliers);
write('production.json', production);
write('stats.json', stats);
