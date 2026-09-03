const WESTMETALL = 'https://www.westmetall.com/en/markdaten.php?action=table&field=';
const CBR = 'https://www.cbr.ru/scripts/XML_daily.asp';
const MONTHS = ['january', 'february', 'march', 'april', 'may', 'june', 'july', 'august', 'september', 'october', 'november', 'december'];

require('node:dns').setDefaultResultOrder('ipv4first');

function parseWestmetallDate(value) {
  const match = value.match(/(\d{1,2})\.\s+([A-Za-z]+)\s+(\d{4})/);
  const month = match ? MONTHS.indexOf(match[2].toLowerCase()) : -1;
  if (!match || month < 0) throw new Error(`Westmetall: неверная дата ${value}`);
  return new Date(Date.UTC(Number(match[3]), month, Number(match[1])));
}

function parseWestmetall(html, metal) {
  const title = metal === 'copper' ? 'LME Copper Cash-Settlement' : 'LME Aluminium Cash-Settlement';
  const tableStart = html.indexOf(title);
  if (tableStart < 0) throw new Error(`Westmetall: колонка ${title} не найдена`);
  const fragment = html.slice(tableStart, tableStart + 12000);
  const rows = [...fragment.matchAll(/<tr[^>]*>[\s\S]*?<td[^>]*>\s*([^<]*\d{4})\s*<\/td>[\s\S]*?<td[^>]*>\s*([\d,.]+)\s*<\/td>/gi)]
    .map((row) => ({ date: row[1].trim(), value: Number(row[2].replaceAll(',', '')) }));
  if (rows.length < 2 || rows.some((row) => !Number.isFinite(row.value))) {
    throw new Error(`Westmetall: нет актуальной и предыдущей цены ${metal}`);
  }
  const latestDate = parseWestmetallDate(rows[0].date);
  const monthRows = rows.filter((row) => {
    const date = parseWestmetallDate(row.date);
    return date.getUTCFullYear() === latestDate.getUTCFullYear() && date.getUTCMonth() === latestDate.getUTCMonth();
  });
  const monthlyAverage = monthRows.reduce((sum, row) => sum + row.value, 0) / monthRows.length;
  const monthlyStart = new Date(Date.UTC(latestDate.getUTCFullYear(), latestDate.getUTCMonth(), 1));
  return {
    ...rows[0],
    previousValue: rows[1].value,
    previousDate: rows[1].date,
    monthlyAverage,
    monthlyStart: `${String(monthlyStart.getUTCDate()).padStart(2, '0')}.${String(monthlyStart.getUTCMonth() + 1).padStart(2, '0')}.${monthlyStart.getUTCFullYear()}`,
    observations: monthRows.length,
  };
}

function parseCbr(xml, code) {
  const block = [...xml.matchAll(/<Valute\b[^>]*>([\s\S]*?)<\/Valute>/gi)]
    .map((match) => match[1])
    .find((item) => new RegExp(`<CharCode>\\s*${code}\\s*</CharCode>`, 'i').test(item));
  if (!block) throw new Error(`ЦБ РФ: курс ${code} не найден`);
  const value = Number(block.match(/<Value>([^<]+)<\/Value>/i)?.[1].replace(',', '.'));
  const nominal = Number(block.match(/<Nominal>([^<]+)<\/Nominal>/i)?.[1]);
  if (!Number.isFinite(value) || !Number.isFinite(nominal)) throw new Error(`ЦБ РФ: неверный курс ${code}`);
  return value / nominal;
}

function parseCbrDynamic(xml) {
  const values = [...xml.matchAll(/<Record\b[^>]*Date="([^"]+)"[^>]*>([\s\S]*?)<\/Record>/gi)].map((match) => {
    const nominal = Number(match[2].match(/<Nominal>([^<]+)<\/Nominal>/i)?.[1]);
    const value = Number(match[2].match(/<Value>([^<]+)<\/Value>/i)?.[1].replace(',', '.'));
    return { date: match[1], value: value / nominal };
  }).filter((item) => Number.isFinite(item.value));
  if (!values.length) throw new Error('ЦБ РФ: нет курсов USD за расчётный период');
  return { average: values.reduce((sum, item) => sum + item.value, 0) / values.length, observations: values.length };
}

async function getText(url) {
  let lastError;
  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      const response = await fetch(url, {
        headers: { 'User-Agent': 'KLM Procurement Panel/1.0 (+market data)' },
        signal: AbortSignal.timeout(15000),
      });
      if (!response.ok) throw new Error(`${new URL(url).hostname}: HTTP ${response.status}`);
      return await response.text();
    } catch (error) {
      lastError = error;
    }
  }
  throw lastError;
}

async function loadMarketData() {
  // Westmetall ограничивает одновременные соединения, поэтому две его таблицы
  // запрашиваются последовательно. Иначе один из ответов периодически уходит в тайм-аут.
  const copperHtml = await getText(`${WESTMETALL}LME_Cu_cash`);
  const aluminiumHtml = await getText(`${WESTMETALL}LME_Al_cash`);
  const cbrXml = await getText(CBR);
  const copper = parseWestmetall(copperHtml, 'copper');
  const aluminium = parseWestmetall(aluminiumHtml, 'aluminium');
  const cbrDate = cbrXml.match(/<ValCurs[^>]*Date="([^"]+)"/i)?.[1] ?? '';
  const [day, month, year] = cbrDate.split('.').map(Number);
  const previousRequestDate = new Date(Date.UTC(year, month - 1, day - 1));
  const previousDateParam = [
    String(previousRequestDate.getUTCDate()).padStart(2, '0'),
    String(previousRequestDate.getUTCMonth() + 1).padStart(2, '0'),
    previousRequestDate.getUTCFullYear(),
  ].join('/');
  const previousCbrXml = await getText(`${CBR}?date_req=${previousDateParam}`);
  const previousCbrDate = previousCbrXml.match(/<ValCurs[^>]*Date="([^"]+)"/i)?.[1] ?? '';
  const latestCopperDate = parseWestmetallDate(copper.date);
  const dynamicEnd = `${String(latestCopperDate.getUTCDate()).padStart(2, '0')}/${String(latestCopperDate.getUTCMonth() + 1).padStart(2, '0')}/${latestCopperDate.getUTCFullYear()}`;
  const dynamicStart = copper.monthlyStart.replaceAll('.', '/');
  const dynamicUsdXml = await getText(`https://www.cbr.ru/scripts/XML_dynamic.asp?date_req1=${dynamicStart}&date_req2=${dynamicEnd}&VAL_NM_RQ=R01235`);
  const monthlyUsd = parseCbrDynamic(dynamicUsdXml);
  return {
    fetchedAt: new Date().toISOString(),
    metals: { copper, aluminium },
    currencies: {
      date: cbrDate,
      previousDate: previousCbrDate,
      usd: parseCbr(cbrXml, 'USD'),
      previousUsd: parseCbr(previousCbrXml, 'USD'),
      cny: parseCbr(cbrXml, 'CNY'),
      previousCny: parseCbr(previousCbrXml, 'CNY'),
      monthlyUsdAverage: monthlyUsd.average,
      monthlyUsdObservations: monthlyUsd.observations,
      monthlyPeriodStart: copper.monthlyStart,
      monthlyPeriodEnd: copper.date,
    },
  };
}

async function handler(_request, response) {
  try {
    const data = await loadMarketData();
    response.setHeader('Content-Type', 'application/json; charset=utf-8');
    response.setHeader('Cache-Control', 'public, s-maxage=3600, stale-while-revalidate=86400');
    response.statusCode = 200;
    response.end(JSON.stringify(data));
  } catch (error) {
    response.setHeader('Content-Type', 'application/json; charset=utf-8');
    response.statusCode = 502;
    response.end(JSON.stringify({ error: error instanceof Error ? error.message : 'Ошибка источника данных' }));
  }
}

module.exports = handler;
module.exports.loadMarketData = loadMarketData;
