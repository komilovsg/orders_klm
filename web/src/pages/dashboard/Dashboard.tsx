import { useMemo, useState } from 'react';
import { chislo, type Dannye } from '@/shared/api/dannye';
import { useRynochnyeDannye } from '@/shared/api/rynok';

type Props = { dannye: Dannye; pereyti: (etap: string) => void };

export function Dashboard({ dannye, pereyti }: Props) {
  const { svodka, pozicii } = dannye;
  const rynok = useRynochnyeDannye();

  const topProekty = useMemo(() => {
    const po: Record<string, number> = {};
    for (const p of pozicii) po[p.project] = (po[p.project] || 0) + 1;
    return Object.entries(po)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8);
  }, [pozicii]);

  const topNomenklatura = useMemo(() => {
    const po: Record<string, number> = {};
    for (const p of pozicii) po[p.name] = (po[p.name] || 0) + 1;
    return Object.entries(po)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6);
  }, [pozicii]);

  const vShtukah = svodka.byUnit['шт./м'] ?? 0;
  const vKg = svodka.byUnit['кг'] ?? 0;
  const vsegoEd = vShtukah + vKg;
  const maxProekt = topProekty[0]?.[1] ?? 1;

  return (
    <main className="pole pole-dashboard">
      <h1 className="pole-zagolovok">Закупка</h1>
      <p className="pole-podpis">
        {svodka.source.fileName} · {chislo(svodka.source.sourceRows)} строк источника
      </p>

      {/* Герой: главное число панели — сколько позиций предстоит закупить. */}
      <section className="geroy">
        <div className="geroy-chislo">{chislo(svodka.items)}</div>
        <div className="geroy-podpis">
          позиций к закупке
          <br />
          по {chislo(svodka.orders)} заказам
        </div>
      </section>

      <div className="kpi-ryad">
        <Kpi znachenie={svodka.orders} podpis="Заказов" />
        <Kpi znachenie={svodka.projects} podpis="Проектов" />
        <Kpi znachenie={svodka.suppliers} podpis="Поставщиков" />
        <Kpi znachenie={vKg} podpis="Позиций в кг" />
      </div>

      <section className="rynochnye-karty" aria-label="Рыночные цены и курсы валют">
        <RynochnayaKarta
          tip="cu"
          kod="CU"
          podpis="Медь · Cash-Settlement"
          znachenie={rynok.dannye?.metals.copper.value}
          predydushee={rynok.dannye?.metals.copper.previousValue}
          edinica="$/т"
          data={rynok.dannye?.metals.copper.date}
          ssylka="https://www.westmetall.com/en/markdaten.php?action=table&field=LME_Cu_cash"
          zagruzka={rynok.zagruzka}
          raschet={{
            tip: 'copper',
            metalAverage: rynok.dannye?.metals.copper.monthlyAverage,
            usdAverage: rynok.dannye?.currencies.monthlyUsdAverage,
            periodStart: rynok.dannye?.currencies.monthlyPeriodStart,
            periodEnd: rynok.dannye?.currencies.monthlyPeriodEnd,
          }}
        />
        <RynochnayaKarta
          tip="al"
          kod="AL"
          podpis="Алюминий · Cash-Settlement"
          znachenie={rynok.dannye?.metals.aluminium.value}
          predydushee={rynok.dannye?.metals.aluminium.previousValue}
          edinica="$/т"
          data={rynok.dannye?.metals.aluminium.date}
          ssylka="https://www.westmetall.com/en/markdaten.php?action=table&field=LME_Al_cash"
          zagruzka={rynok.zagruzka}
          raschet={{
            tip: 'aluminium',
            metalAverage: rynok.dannye?.metals.aluminium.monthlyAverage,
            usdAverage: rynok.dannye?.currencies.monthlyUsdAverage,
            periodStart: rynok.dannye?.currencies.monthlyPeriodStart,
            periodEnd: rynok.dannye?.currencies.monthlyPeriodEnd,
          }}
        />
        <RynochnayaKarta tip="usd" kod="USD" podpis="Доллар США" znachenie={rynok.dannye?.currencies.usd} predydushee={rynok.dannye?.currencies.previousUsd} edinica="₽" data={rynok.dannye?.currencies.date} ssylka="https://www.cbr.ru/currency_base/daily/" zagruzka={rynok.zagruzka} valyuta />
        <RynochnayaKarta tip="cny" kod="CNY" podpis="Китайский юань" znachenie={rynok.dannye?.currencies.cny} predydushee={rynok.dannye?.currencies.previousCny} edinica="₽" data={rynok.dannye?.currencies.date} ssylka="https://www.cbr.ru/currency_base/daily/" zagruzka={rynok.zagruzka} valyuta />
      </section>
      {rynok.oshibka && <p className="rynok-status">{rynok.ustareli ? 'Показаны последние сохранённые данные. ' : ''}Обновление недоступно: {rynok.oshibka}</p>}

      <div className="setka-vidzhetov">
        <section className="vidzhet">
          <h2 className="vidzhet-zagolovok">Проекты по числу позиций</h2>
          <p className="vidzhet-podpis">Восемь крупнейших из {chislo(svodka.projects)}</p>
          {/* Ранжирование одной величины: один цвет на все полосы.
              Цвет кодирует сущность, а не место в списке. */}
          <ul className="bary">
            {topProekty.map(([imya, n]) => (
              <li className="bar-stroka" key={imya} title={`${imya}: ${chislo(n)} позиций`}>
                <span className="bar-imya">{imya}</span>
                <span className="bar-doroga">
                  <span className="bar-polosa" style={{ width: `${(n / maxProekt) * 100}%` }} />
                </span>
                <span className="bar-znachenie">{chislo(n)}</span>
              </li>
            ))}
          </ul>
        </section>

        <section className="vidzhet">
          <h2 className="vidzhet-zagolovok">Чем меряем</h2>
          <p className="vidzhet-podpis">Штучная номенклатура против весовой</p>
          {/* Две категории, часть от целого — одна составная полоса, не круговая диаграмма. */}
          <div className="stopka" role="img" aria-label={`шт./м ${chislo(vShtukah)}, кг ${chislo(vKg)}`}>
            <span
              className="stopka-chast"
              data-metall="al"
              style={{ width: `${(vShtukah / vsegoEd) * 100}%` }}
            />
            <span
              className="stopka-chast"
              data-metall="cu"
              style={{ width: `${(vKg / vsegoEd) * 100}%` }}
            />
          </div>
          <ul className="legenda">
            <li>
              <i className="legenda-metka" data-metall="al" />
              шт./м <b>{chislo(vShtukah)}</b>
            </li>
            <li>
              <i className="legenda-metka" data-metall="cu" />
              кг <b>{chislo(vKg)}</b>
            </li>
          </ul>

          <h2 className="vidzhet-zagolovok vidzhet-zagolovok-vtoroy">Чаще всего в заявках</h2>
          <ul className="spisok-nomenklatury">
            {topNomenklatura.map(([imya, n]) => (
              <li key={imya}>
                <span className="spisok-imya">{imya}</span>
                <span className="chislo">{chislo(n)}</span>
              </li>
            ))}
          </ul>
        </section>
      </div>

      <button className="knopka knopka-glavnaya" onClick={() => pereyti('obshee')}>
        Перейти к реестру позиций
      </button>
    </main>
  );
}

function RynochnayaKarta({ tip, kod, podpis, znachenie, predydushee, edinica, data, ssylka, zagruzka, valyuta = false, raschet }: {
  tip: string; kod: string; podpis: string; znachenie?: number; predydushee?: number; edinica: string; data?: string;
  ssylka: string; zagruzka: boolean; valyuta?: boolean;
  raschet?: { tip: 'copper' | 'aluminium'; metalAverage?: number; usdAverage?: number; periodStart?: string; periodEnd?: string };
}) {
  const [nadbavkaMetalla, setNadbavkaMetalla] = useState(() => {
    const raw = localStorage.getItem('klm-aluminium-metal-constant');
    const saved = Number(raw);
    return raw !== null && Number.isFinite(saved) && saved >= 0 ? saved : 700;
  });
  const [postoyannayaNadbavka, setPostoyannayaNadbavka] = useState(() => {
    const key = raschet?.tip === 'aluminium' ? 'klm-aluminium-purchase-constant' : 'klm-copper-purchase-constant';
    const raw = localStorage.getItem(key);
    const saved = Number(raw);
    const defaultValue = raschet?.tip === 'aluminium' ? 70000 : 120000;
    return raw !== null && Number.isFinite(saved) && saved >= 0 ? saved : defaultValue;
  });
  const tekst = znachenie?.toLocaleString('ru-RU', valyuta
    ? { minimumFractionDigits: 4, maximumFractionDigits: 4 }
    : { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const raznica = znachenie !== undefined && predydushee !== undefined ? znachenie - predydushee : undefined;
  const procent = raznica !== undefined && predydushee ? (raznica / predydushee) * 100 : undefined;
  const napravlenie = raznica === undefined || raznica === 0 ? 'net' : raznica > 0 ? 'rost' : 'padenie';
  const formatIzmeneniya = (value: number | undefined, digits: number) => value === undefined
    ? '—'
    : `${value > 0 ? '+' : ''}${value.toLocaleString('ru-RU', { minimumFractionDigits: digits, maximumFractionDigits: digits })}`;
  const rekomendovannayaCena = raschet?.metalAverage !== undefined && raschet.usdAverage !== undefined
    ? (((raschet.metalAverage + (raschet.tip === 'aluminium' ? nadbavkaMetalla : 0)) * raschet.usdAverage) * 1.22 + postoyannayaNadbavka) / 1000
    : undefined;
  return (
    <article className="rynochnaya-karta" data-tip={tip}>
      <span className="rynok-kod">{kod}</span>
      <strong className="rynok-cena">{tekst ?? (zagruzka ? '…' : '—')} <small>{edinica}</small></strong>
      <span className="rynok-podpis">{podpis}</span>
      <a className="rynok-data" href={ssylka} target="_blank" rel="noreferrer">{data ? `на ${data}` : 'обновляется ежедневно'}</a>
      <span className="rynok-izmenenie" data-napravlenie={napravlenie}>
        <span><small>Изменение</small>{formatIzmeneniya(raznica, valyuta ? 4 : 2)} {edinica}</span>
        <span><small>%</small>{formatIzmeneniya(procent, 2)}%</span>
      </span>
      {raschet && (
        <div className="copper-rekomendaciya">
          <span className="copper-rekomendaciya-label">Рекомендованная цена закупки {raschet.tip === 'aluminium' ? 'алюминиевой' : 'медной'} шины</span>
          <strong>{rekomendovannayaCena?.toLocaleString('ru-RU', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) ?? '—'} <small>₽/кг</small></strong>
          <span className="copper-period">Средние за период {raschet.periodStart ?? '—'} — {raschet.periodEnd ?? '—'}</span>
          <span className="copper-formula">
            LME {raschet.metalAverage?.toLocaleString('ru-RU', { maximumFractionDigits: 2 }) ?? '—'} $/т
          </span>
          {raschet.tip === 'aluminium' && (
            <label className="copper-konstanta">
              Константа к LME, $/т
              <input
                type="number"
                min="0"
                step="10"
                value={nadbavkaMetalla}
                onChange={(event) => {
                  const value = Math.max(0, Number(event.target.value));
                  setNadbavkaMetalla(value);
                  localStorage.setItem('klm-aluminium-metal-constant', String(value));
                }}
              />
            </label>
          )}
          <span className="copper-formula">× USD {raschet.usdAverage?.toLocaleString('ru-RU', { maximumFractionDigits: 4 }) ?? '—'} ₽ × НДС 1,22 +</span>
          <label className="copper-konstanta">
            Константа после НДС, ₽
            <input
              type="number"
              min="0"
              step="1000"
              value={postoyannayaNadbavka}
              onChange={(event) => {
                const value = Math.max(0, Number(event.target.value));
                setPostoyannayaNadbavka(value);
                const key = raschet.tip === 'aluminium' ? 'klm-aluminium-purchase-constant' : 'klm-copper-purchase-constant';
                localStorage.setItem(key, String(value));
              }}
            />
          </label>
          <span className="copper-formula">Итого делится на 1 000</span>
        </div>
      )}
    </article>
  );
}

function Kpi({ znachenie, podpis }: { znachenie: number; podpis: string }) {
  return (
    <div className="kpi">
      <div className="kpi-znachenie">{chislo(znachenie)}</div>
      <div className="kpi-podpis">{podpis}</div>
    </div>
  );
}
