import { useMemo, useState } from 'react';
import { Tablica, type Kolonka } from '@/shared/ui/Tablica';
import { chislo, useStranicy, type Dannye, type Pozicia } from '@/shared/api/dannye';

const PANELI = [
  { klyuch: 'postavshchiki', nazvanie: 'Поставщики' },
  { klyuch: 'platelshchiki', nazvanie: 'Плательщики' },
  { klyuch: 'tmc', nazvanie: 'Используемые ТМЦ' },
  { klyuch: 'ceny', nazvanie: 'Цены закупки' },
] as const;

type Panel = (typeof PANELI)[number]['klyuch'];

const KOLONKI_TMC: Kolonka<Pozicia>[] = [
  {
    klyuch: 'order',
    zagolovok: 'Заказ',
    shirina: '84px',
    yacheyka: (r) => <span className="kod">{r.order}</span>,
  },
  {
    klyuch: 'project',
    zagolovok: 'Проект',
    shirina: 'minmax(160px, 1fr)',
    vtorostepennaya: true,
    yacheyka: (r) => r.project,
  },
  {
    klyuch: 'name',
    zagolovok: 'Номенклатура',
    shirina: 'minmax(280px, 2.4fr)',
    yacheyka: (r) => r.name,
  },
  {
    klyuch: 'quantity',
    zagolovok: 'Кол-во',
    shirina: '110px',
    yacheyka: (r) => <span className="chislo">{chislo(r.quantity)}</span>,
  },
  {
    klyuch: 'unit',
    zagolovok: 'Ед.',
    shirina: '86px',
    yacheyka: (r) => (
      <span className="ed" data-ed={r.unit}>
        {r.unit}
      </span>
    ),
  },
];

const KOLONKI_POSTAVSHCHIKI: Kolonka<string>[] = [
  { klyuch: 'imya', zagolovok: 'Поставщик', shirina: 'minmax(240px, 1fr)', yacheyka: (r) => r },
];

export function Obshee({ dannye }: { dannye: Dannye }) {
  const [panel, setPanel] = useState<Panel>('tmc');
  const [poisk, setPoisk] = useState('');
  const [proekt, setProekt] = useState('');
  const [edinica, setEdinica] = useState('');

  const proekty = useMemo(
    () =>
      [...new Set(dannye.pozicii.map((p) => p.project))].sort((a, b) =>
        a.localeCompare(b, 'ru')
      ),
    [dannye.pozicii]
  );

  const otfiltrovannye = useMemo(() => {
    const q = poisk.trim().toLowerCase();
    return dannye.pozicii.filter(
      (p) =>
        (!q || p.name.toLowerCase().includes(q) || p.order.includes(q)) &&
        (!proekt || p.project === proekt) &&
        (!edinica || p.unit === edinica)
    );
  }, [dannye.pozicii, poisk, proekt, edinica]);

  const stranicyTmc = useStranicy(otfiltrovannye);
  const stranicyPostavshchikov = useStranicy(dannye.postavshchiki);

  return (
    <div className="canvas">
      <aside className="relse">
        <p className="relse-zagolovok">Справочники</p>
        {PANELI.map((p) => (
          <button
            className="relse-punkt"
            key={p.klyuch}
            onClick={() => setPanel(p.klyuch)}
            aria-current={panel === p.klyuch}
          >
            {p.nazvanie}
          </button>
        ))}
      </aside>

      <main className="pole">
        <h1 className="pole-zagolovok">Общее</h1>
        <p className="pole-podpis">Реестр заявок · {dannye.svodka.source.fileName}</p>

        {panel === 'tmc' && (
          <>
            <div className="filtry">
              <input
                className="poisk"
                placeholder="Поиск по номенклатуре или номеру заказа"
                value={poisk}
                onChange={(e) => setPoisk(e.target.value)}
              />
              <select
                className="vybor"
                value={proekt}
                onChange={(e) => setProekt(e.target.value)}
                aria-label="Проект"
              >
                <option value="">Все проекты</option>
                {proekty.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>
              <select
                className="vybor"
                value={edinica}
                onChange={(e) => setEdinica(e.target.value)}
                aria-label="Единица измерения"
              >
                <option value="">Все единицы</option>
                <option value="шт./м">шт./м</option>
                <option value="кг">кг</option>
              </select>
            </div>
            <Tablica
              stroki={stranicyTmc.stroki}
              kolonki={KOLONKI_TMC}
              pustoTekst="Под фильтры ничего не подошло. Снимите проект или очистите поиск."
              vsego={stranicyTmc.vsego}
              escho={stranicyTmc.escho}
              gruzitsya={stranicyTmc.gruzitsya}
              pokazatEscho={stranicyTmc.pokazatEscho}
            />
          </>
        )}

        {panel === 'postavshchiki' && (
          <Tablica
            stroki={stranicyPostavshchikov.stroki}
            kolonki={KOLONKI_POSTAVSHCHIKI}
            pustoTekst="Список поставщиков пуст."
            vsego={stranicyPostavshchikov.vsego}
            escho={stranicyPostavshchikov.escho}
            gruzitsya={stranicyPostavshchikov.gruzitsya}
            pokazatEscho={stranicyPostavshchikov.pokazatEscho}
          />
        )}

        {(panel === 'platelshchiki' || panel === 'ceny') && (
          <div className="pusto">
            Источник данных не подключён. Разберём{' '}
            {panel === 'ceny' ? 'ЦЕНООБРАЗОВАНИЕ' : 'ПЛАТЕЛЬЩИКИ'}/ на следующем шаге.
          </div>
        )}
      </main>
    </div>
  );
}
