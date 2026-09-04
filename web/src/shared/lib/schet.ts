export type RekvizityScheta = {
  supplier: string;
  payer: string;
  invoiceNumber: string;
  invoiceDate: string;
  mostExpensiveItem: string;
  total: number;
};

const clean = (value: string) => value.replace(/[\t ]+/g, ' ').replace(/\s*\n\s*/g, '\n').trim();

async function textIzPdf(file: File) {
  const pdfjs = await import('pdfjs-dist');
  const worker = await import('pdfjs-dist/build/pdf.worker.min.mjs?url');
  pdfjs.GlobalWorkerOptions.workerSrc = worker.default;
  const pdf = await pdfjs.getDocument({ data: new Uint8Array(await file.arrayBuffer()) }).promise;
  const pages: string[] = [];
  for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
    const page = await pdf.getPage(pageNumber);
    const content = await page.getTextContent();
    const positioned = content.items.filter((item): item is Extract<typeof item, { str: string }> => 'str' in item)
      .map((item) => ({ text: item.str, x: item.transform[4], y: item.transform[5] }))
      .sort((a, b) => Math.abs(b.y - a.y) > 2 ? b.y - a.y : a.x - b.x);
    const lines: { y: number; parts: string[] }[] = [];
    positioned.forEach((item) => {
      const line = lines.find((candidate) => Math.abs(candidate.y - item.y) <= 2);
      if (line) line.parts.push(item.text); else lines.push({ y: item.y, parts: [item.text] });
    });
    let text = lines.map((line) => line.parts.join(' ')).join('\n');
    if (text.trim().length < 40) {
      const viewport = page.getViewport({ scale: 1.8 });
      const canvas = document.createElement('canvas');
      canvas.width = Math.ceil(viewport.width);
      canvas.height = Math.ceil(viewport.height);
      const context = canvas.getContext('2d');
      if (context) {
        await page.render({ canvas, canvasContext: context, viewport }).promise;
        text = await textIzIzobrazheniya(canvas);
      }
    }
    pages.push(text);
  }
  return pages.join('\n');
}

async function textIzExcel(file: File) {
  const XLSX = await import('xlsx');
  const workbook = XLSX.read(await file.arrayBuffer(), { type: 'array', cellDates: true });
  return workbook.SheetNames.map((name) => {
    const sheet = workbook.Sheets[name];
    return sheet ? XLSX.utils.sheet_to_csv(sheet, { FS: ' ', RS: '\n', blankrows: false }) : '';
  }).join('\n');
}

async function textIzIzobrazheniya(file: File | HTMLCanvasElement) {
  const { recognize } = await import('tesseract.js');
  const result = await recognize(file, 'rus+eng', { logger: () => undefined });
  return result.data.text;
}

function pole(text: string, labels: string[]) {
  const escaped = labels.map((label) => label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|');
  const match = text.match(new RegExp(`(?:^|\\n)(?:${escaped})(?:\\s*\\([^)]*\\))?\\s*[:—-]?\\s*([^\\n]+)`, 'im'));
  return clean(match?.[1] ?? '').replace(/\s+(?:ИНН|КПП|Адрес|р\/с|Счет)\b.*$/i, '').trim();
}

function dorogayaPozitsiya(text: string) {
  let best = { name: '', price: -1 };
  text.split('\n').forEach((sourceLine) => {
    const line = sourceLine.replace(/^\s*\d+[.)]?\s+/, '').trim();
    if (!line || /(?:итого|всего|ндс|сумма|сч[её]т\s+на\s+оплату|поставщик|покупатель)/i.test(line)) return;
    const numbers = [...line.matchAll(/\d[\d ]*(?:[.,]\d{1,2})?/g)];
    if (numbers.length < 2) return;
    const firstNumber = numbers[0];
    const name = line.slice(0, firstNumber.index).replace(/\b(?:шт|кг|м|л|компл)\.?$/i, '').trim();
    const priceToken = numbers.length >= 3 ? numbers[numbers.length - 2][0] : numbers[numbers.length - 1][0];
    const price = Number(priceToken.replace(/\s/g, '').replace(',', '.'));
    if (name.length >= 3 && Number.isFinite(price) && price > best.price) best = { name, price };
  });
  return best.name;
}

function summaScheta(text: string) {
  const patterns = [
    /(?:итого\s+к\s+оплате|всего\s+к\s+оплате|итого)\s*[:—-]?\s*([\d ]+(?:[.,]\d{1,2})?)/i,
    /на\s+сумму\s+([\d ]+(?:[.,]\d{1,2})?)/i,
  ];
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) return Number(match[1].replace(/\s/g, '').replace(',', '.'));
  }
  return 0;
}

export function izvlechRekvizity(text: string): RekvizityScheta {
  const normalized = clean(text);
  const heading = normalized.match(/сч[её]т(?:\s+на\s+оплату)?\s*№?\s*([^\s,]+)\s+от\s+(\d{1,2}[.\/-]\d{1,2}[.\/-]\d{2,4}|\d{1,2}\s+[а-яё]+\s+\d{4})/i);
  const supplier = pole(normalized, ['Поставщик', 'Исполнитель', 'Продавец']);
  const payer = pole(normalized, ['Плательщик', 'Покупатель', 'Заказчик']);
  const mostExpensiveItem = dorogayaPozitsiya(normalized);
  const total = summaScheta(normalized);
  if (!supplier || !payer || !heading || !mostExpensiveItem) {
    const missing = [!supplier && 'поставщик', !payer && 'плательщик', !heading && 'номер/дата счёта', !mostExpensiveItem && 'самая дорогая позиция'].filter(Boolean).join(', ');
    throw new Error(`Не удалось распознать: ${missing}`);
  }
  return { supplier, payer, invoiceNumber: heading[1].trim(), invoiceDate: heading[2].trim(), mostExpensiveItem, total };
}

export async function prochitatSchet(file: File): Promise<RekvizityScheta> {
  const extension = file.name.split('.').pop()?.toLowerCase();
  const text = extension === 'pdf' ? await textIzPdf(file)
    : ['xls', 'xlsx', 'xlsm'].includes(extension ?? '') ? await textIzExcel(file)
    : ['jpg', 'jpeg', 'png', 'tif', 'tiff', 'bmp', 'webp'].includes(extension ?? '') ? await textIzIzobrazheniya(file)
    : '';
  if (!text.trim()) throw new Error(`Формат ${extension || 'файла'} пока не поддерживается для чтения содержимого`);
  return izvlechRekvizity(text);
}
