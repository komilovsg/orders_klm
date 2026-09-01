import { useMemo } from 'react';
import { chislo, type Dannye } from '@/shared/api/dannye';

type Props = { dannye: Dannye; pereyti: (etap: string) => void };

export function Dashboard({ dannye, pereyti }: Props) {
  const { svodka, pozicii } = dannye;

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

function Kpi({ znachenie, podpis }: { znachenie: number; podpis: string }) {
  return (
    <div className="kpi">
      <div className="kpi-znachenie">{chislo(znachenie)}</div>
      <div className="kpi-podpis">{podpis}</div>
    </div>
  );
}
