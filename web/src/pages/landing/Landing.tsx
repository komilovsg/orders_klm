import { chislo, type Svodka } from '@/shared/api/dannye';

const ETAPY = [
  { n: 1, imya: 'Общее', opisanie: 'Справочники поставщиков, плательщиков, ТМЦ и закупочных цен' },
  { n: 2, imya: 'Заказ', opisanie: 'Реквизиты, потребность в ТМЦ, сроки производства и условия расчёта' },
  { n: 3, imya: 'План оплат', opisanie: 'Что и когда оплачиваем, с привязкой к счетам' },
  { n: 4, imya: 'Тендер', opisanie: 'Сравнение предложений и выбор поставщика' },
];

export function Landing({ svodka, otkryt }: { svodka: Svodka | null; otkryt: () => void }) {
  return (
    <div className="lending">
      <header className="lending-shapka">
        <div className="marka">
          КЛМ <span>закупки</span>
        </div>
        <button className="knopka" onClick={otkryt}>
          Открыть панель
        </button>
      </header>

      <section className="lending-geroy">
        <p className="lending-nadzagolovok">Панель закупок</p>
        <h1 className="lending-zagolovok">
          Реестр заявок
          <br />
          становится планом оплат
        </h1>
        <p className="lending-lid">
          Позиции из реестра ПДО, поставщики и счета — в одном месте. Без выгрузок в почту
          и сверки версий файла.
        </p>
        <button className="knopka knopka-krupnaya" onClick={otkryt}>
          Открыть панель
        </button>
      </section>

      {svodka && (
        <section className="lending-cifry">
          <Cifra znachenie={chislo(svodka.items)} podpis="позиций в работе" />
          <Cifra znachenie={chislo(svodka.orders)} podpis="заказов" />
          <Cifra znachenie={chislo(svodka.projects)} podpis="проектов" />
          <Cifra znachenie={chislo(svodka.suppliers)} podpis="поставщиков" />
        </section>
      )}

      {/* Этапы висят на той же медной шине, что и в панели. */}
      <section className="lending-etapy">
        <h2 className="lending-podzagolovok">Четыре этапа закупки</h2>
        <ol className="lending-shina">
          {ETAPY.map((e) => (
            <li className="lending-etap" key={e.n}>
              <span className="lending-etap-nomer">{e.n}</span>
              <h3 className="lending-etap-imya">{e.imya}</h3>
              <p className="lending-etap-opisanie">{e.opisanie}</p>
            </li>
          ))}
        </ol>
      </section>

      <footer className="lending-podval">
        <span>КЛМ · внутренняя панель закупок</span>
        <button className="knopka" onClick={otkryt}>
          Открыть панель
        </button>
      </footer>
    </div>
  );
}

function Cifra({ znachenie, podpis }: { znachenie: string; podpis: string }) {
  return (
    <div className="lending-cifra">
      <div className="lending-cifra-znachenie">{znachenie}</div>
      <div className="lending-cifra-podpis">{podpis}</div>
    </div>
  );
}
