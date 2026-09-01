export type StrokaTablicy = (string | number)[];

export type RazobrannyyList = {
  imya: string;
  kolonki: string[];
  stroki: StrokaTablicy[];
};

const znachenie = (c: unknown): string | number => {
  if (c == null) return '';
  if (typeof c === 'number' || typeof c === 'string') return c;
  const o = c as { result?: unknown; text?: unknown };
  const v = o.result ?? o.text ?? '';
  return typeof v === 'number' ? v : String(v);
};

/** Читает первый непустой лист книги. Парсер грузится по требованию —
 *  он тяжелее всего остального приложения и нужен только при загрузке файла. */
export async function razobratKnigu(file: File): Promise<RazobrannyyList> {
  const { default: ExcelJS } = await import('exceljs');
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(await file.arrayBuffer());

  let list: import('exceljs').Worksheet | null = null;
  wb.eachSheet((ws) => {
    if (!list && ws.rowCount > 1) list = ws;
  });
  if (!list) throw new Error('В книге нет заполненных листов');

  const ws = list as import('exceljs').Worksheet;
  const vse: StrokaTablicy[] = [];
  ws.eachRow((row) => {
    const znacheniya = (row.values as unknown[]).slice(1).map(znachenie);
    if (znacheniya.some((v) => v !== '')) vse.push(znacheniya);
  });
  if (!vse.length) throw new Error('Лист пуст');

  // Первая строка — заголовки, если в ней нет чисел.
  const pervaya = vse[0];
  const zagolovki = pervaya.every((v) => typeof v !== 'number');

  return {
    imya: ws.name,
    kolonki: zagolovki
      ? pervaya.map((v, i) => String(v) || `Колонка ${i + 1}`)
      : pervaya.map((_, i) => `Колонка ${i + 1}`),
    stroki: zagolovki ? vse.slice(1) : vse,
  };
}
