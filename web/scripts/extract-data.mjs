// Вытаскивает данные из HTML-прототипа в public/data/*.json.
// Прототип держит 923 KB данных прямо в разметке; здесь они уезжают в отдельные файлы,
// чтобы приложение грузило их по fetch, а не тащило одним куском HTML.
import { mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import ExcelJS from 'exceljs';

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

// ── Плательщики ─────────────────────────────────────────────
// Реквизиты лежат отдельными PDF и DOCX, таблицы нет. Имя файла построено
// одинаково: «ГГГГ.ММ.ДД реквизиты <Компания>, банк <Банк>.<ext>» — из него
// и собираем справочник. Полные реквизиты остаются внутри документов.
const BANKI = ['Сбербанк', 'Совкомбанк', 'СБЕР'];

const razborPlatelshchika = (file) => {
  const bez = file.replace(/\.(pdf|docx)$/i, '');
  const data = bez.match(/^(\d{4})\.(\d{2})\.(\d{2})/);

  let ostatok = bez
    .replace(/^\d{4}\.\d{2}\.\d{2}\s*/, '')
    .replace(/^реквизиты\s*/i, '')
    .replace(/^компании\s+/i, '');

  // Банк называется одним из известных слов и стоит где угодно: в скобках,
  // после запятой, после слова «банк» или просто в конце имени файла.
  // Ищем подстрокой, а не регуляркой: \b не работает с кириллицей.
  let bank = '';
  const nizhniy = ostatok.toLowerCase();
  for (const b of BANKI) {
    const i = nizhniy.indexOf(b.toLowerCase());
    if (i === -1) continue;
    bank = b;
    // Всё от банка и правее — служебный хвост имени файла.
    ostatok = ostatok.slice(0, i).replace(/(?:,|\(|\s|банк)+$/i, '');
    break;
  }

  return {
    name: ostatok.replace(/\s+/g, ' ').replace(/[(),\s]+$/, '').trim(),
    bank,
    updated: data ? `${data[3]}.${data[2]}.${data[1]}` : '',
    file,
  };
};

const platelshchikiDir = resolve(root, 'istochniki/ПЛАТЕЛЬЩИКИ');
const platelshchiki = readdirSync(platelshchikiDir)
  .filter((f) => /\.(pdf|docx)$/i.test(f) && !f.startsWith('~$'))
  .map(razborPlatelshchika)
  .sort((a, b) => a.name.localeCompare(b.name, 'ru'));

// ── Цены ────────────────────────────────────────────────────
const znachenie = (c) =>
  c == null ? null : typeof c === 'object' ? (c.result ?? c.text ?? null) : c;
const tekst = (c) => String(znachenie(c) ?? '').replace(/\s+/g, ' ').trim();
const chislo = (c) => {
  const v = znachenie(c);
  return typeof v === 'number' && Number.isFinite(v) ? v : null;
};

async function sobratCeny() {
  const kniga = async (file) => {
    const wb = new ExcelJS.Workbook();
    await wb.xlsx.readFile(resolve(root, 'istochniki/ЦЕНООБРАЗОВАНИЕ', file));
    return wb;
  };

  // Актуальные цены: наименование, поставщик, единица, история цен по колонкам.
  const materialyWb = await kniga('АКТУАЛЬНЫЕ цены на материалы .xlsx');
  const ws = materialyWb.getWorksheet('ОБЩЕЕ');
  const materialy = [];
  for (let r = 4; r <= ws.rowCount; r++) {
    const row = ws.getRow(r);
    const name = tekst(row.getCell(2).value);
    if (!name || name === 'АКТУАЛЬНЫЕ ЦЕНЫ') continue;

    // Колонки 5..10 — история цен, последняя заполненная считается действующей.
    // Колонка 11 держит словесный диапазон («от 1086,6 до 1150 Р») — это примечание,
    // а не цена, поэтому в историю оно не попадает.
    const istoria = [];
    for (let c = 5; c <= 10; c++) {
      const v = row.getCell(c).value;
      const t = tekst(v);
      if (t) istoria.push(chislo(v) ?? t);
    }
    if (!istoria.length) continue;

    materialy.push({
      name,
      supplier: tekst(row.getCell(3).value),
      unit: tekst(row.getCell(4).value),
      cena: istoria[istoria.length - 1],
      istoria,
      diapazon: tekst(row.getCell(11).value),
    });
  }

  // Итоги переговоров: было / стало / скидка, сгруппированы разделами.
  const syreWb = await kniga('ЦЕНА СЫРЬЯ.xlsx');
  const rs = syreWb.getWorksheet('РЕЗУЛЬТАТ');
  const peregovory = [];
  let razdel = '';
  for (let r = 3; r <= rs.rowCount; r++) {
    const row = rs.getRow(r);
    const a = tekst(row.getCell(1).value);
    const b = tekst(row.getCell(2).value);
    if (a && a === b) {
      razdel = a;
      continue;
    }
    if (!b) continue;
    peregovory.push({
      razdel,
      pozicia: b,
      bylo: tekst(row.getCell(3).value),
      stalo: tekst(row.getCell(4).value),
      skidka: chislo(row.getCell(5).value),
      primechanie: tekst(row.getCell(6).value),
    });
  }

  // Котировки: последние заполненные значения меди, алюминия и курса.
  const cz = syreWb.getWorksheet('ЦЕНЫ');
  const posledneye = (col) => {
    for (let r = cz.rowCount; r >= 2; r--) {
      const v = chislo(cz.getRow(r).getCell(col).value);
      if (v) return v;
    }
    return null;
  };
  const kotirovki = {
    kurs: posledneye(3),
    cu: posledneye(4),
    al: posledneye(6),
  };

  return { materialy, peregovory, kotirovki };
}

const write = (file, data) => {
  const json = JSON.stringify(data);
  writeFileSync(resolve(out, file), json);
  console.log(`${file.padEnd(20)} ${(json.length / 1024).toFixed(0).padStart(5)} KB`);
};

const ceny = await sobratCeny();

write('items.json', items);
write('suppliers.json', suppliers);
write('production.json', production);
write('stats.json', stats);
write('platelshchiki.json', platelshchiki);
write('ceny.json', ceny);
