import { useMemo, useState } from 'react';
import { Tablica, type Kolonka } from '@/shared/ui/Tablica';
import {
  chislo,
  useStranicy,
  type Ceny,
  type Dannye,
  type Platelshchik,
  type Pozicia,
} from '@/shared/api/dannye';

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

const KOLONKI_PLATELSHCHIKI: Kolonka<Platelshchik>[] = [
  {
    klyuch: 'name',
    zagolovok: 'Плательщик',
    shirina: 'minmax(220px, 1.6fr)',
    yacheyka: (r) => r.name,
  },
  {
    klyuch: 'bank',
    zagolovok: 'Банк',
    shirina: 'minmax(120px, 1fr)',
    yacheyka: (r) => r.bank || <span className="net">не указан</span>,
  },
  {
    klyuch: 'updated',
    zagolovok: 'Реквизиты от',
    shirina: '130px',
    yacheyka: (r) => <span className="kod">{r.updated}</span>,
  },
  {
    klyuch: 'file',
    zagolovok: 'Документ',
    shirina: 'minmax(200px, 1.4fr)',
    vtorostepennaya: true,
    yacheyka: (r) => <span className="net">{r.file}</span>,
  },
];

const cenaTekst = (v: number | string) =>
  typeof v === 'number' ? `${chislo(Math.round(v))} ₽` : v;

/** Цены закупки: действующие цены на материалы, итоги переговоров
 *  и котировки сырья, от которых эти цены считаются. */
function PanelCen({ ceny }: { ceny: Ceny }) {
  const { kotirovki, materialy, peregovory } = ceny;
  const razdely = [...new Set(peregovory.map((p) => p.razdel))];

  return (
    <div className="ceny">
      <section className="kotirovki-plitki">
        <PlitkaMetalla metall="cu" imya="Медь" znachenie={kotirovki.cu} edinica="₽/кг" />
        <PlitkaMetalla metall="al" imya="Алюминий" znachenie={kotirovki.al} edinica="₽/кг" />
        <PlitkaMetalla metall="zn" imya="Курс" znachenie={kotirovki.kurs} edinica="₽" />
      </section>

      <h2 className="vidzhet-zagolovok">Действующие цены на материалы</h2>
      <p className="vidzhet-podpis">
        {materialy.length} позиций · цена за единицу с НДС, последняя из истории
      </p>
      <div className="tablica tablica-prostaya">
        <div className="tablica-shapka" style={{ gridTemplateColumns: SETKA_CEN }}>
          <div>Материал</div>
          <div>Поставщик</div>
          <div>Ед.</div>
          <div>Цена</div>
          <div>Диапазон</div>
        </div>
        {materialy.map((m) => (
          <div className="stroka stroka-potoke" key={m.name + m.supplier} style={{ gridTemplateColumns: SETKA_CEN }}>
            <div>{m.name}</div>
            <div className="net">{m.supplier || '—'}</div>
            <div>
              <span className="ed" data-ed={m.unit}>
                {m.unit || '—'}
              </span>
            </div>
            <div className="chislo">{cenaTekst(m.cena)}</div>
            <div className="net">{m.diapazon || '—'}</div>
          </div>
        ))}
      </div>

      <h2 className="vidzhet-zagolovok vidzhet-zagolovok-vtoroy">Итоги переговоров</h2>
      <p className="vidzhet-podpis">Что удалось изменить по цене и срокам</p>
      {razdely.map((razdel) => (
        <div className="razdel-peregovorov" key={razdel}>
          <h3 className="razdel-imya">{razdel.toLowerCase()}</h3>
          <ul className="peregovory">
            {peregovory
              .filter((p) => p.razdel === razdel)
              .map((p, i) => (
                <li className="peregovor" key={p.pozicia + i}>
                  <span className="peregovor-pozicia">{p.pozicia}</span>
                  {p.bylo && p.stalo ? (
                    <span className="peregovor-cena">
                      <s>{p.bylo}</s> → <b>{p.stalo}</b>
                    </span>
                  ) : (
                    <span className="peregovor-cena net">без изменения цены</span>
                  )}
                  {p.skidka != null && (
                    <span className="peregovor-skidka">−{Math.round(p.skidka * 100)}%</span>
                  )}
                  {p.primechanie && (
                    <span className="peregovor-primechanie">{p.primechanie}</span>
                  )}
                </li>
              ))}
          </ul>
        </div>
      ))}
    </div>
  );
}

const SETKA_CEN = 'minmax(190px, 2fr) minmax(130px, 1.3fr) 64px 110px minmax(120px, 1fr)';

function PlitkaMetalla({
  metall,
  imya,
  znachenie,
  edinica,
}: {
  metall: string;
  imya: string;
  znachenie: number | null;
  edinica: string;
}) {
  return (
    <div className="kpi">
      <div className="kpi-znachenie">
        <i className="legenda-metka" data-metall={metall} />{' '}
        {znachenie != null ? chislo(Math.round(znachenie * 100) / 100) : '—'}
        <span className="kpi-edinica">{edinica}</span>
      </div>
      <div className="kpi-podpis">{imya}</div>
    </div>
  );
}

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
  const stranicyPlatelshchikov = useStranicy(dannye.platelshchiki);

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

        {panel === 'platelshchiki' && (
          <Tablica
            stroki={stranicyPlatelshchikov.stroki}
            kolonki={KOLONKI_PLATELSHCHIKI}
            pustoTekst="Список плательщиков пуст."
            vsego={stranicyPlatelshchikov.vsego}
            escho={stranicyPlatelshchikov.escho}
            gruzitsya={stranicyPlatelshchikov.gruzitsya}
            pokazatEscho={stranicyPlatelshchikov.pokazatEscho}
          />
        )}

        {panel === 'ceny' && <PanelCen ceny={dannye.ceny} />}
      </main>
    </div>
  );
}
