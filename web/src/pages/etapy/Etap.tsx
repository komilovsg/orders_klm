import { useEffect, useState } from 'react';
import { ZagruzkaFayla } from '@/shared/ui/ZagruzkaFayla';
import { chislo } from '@/shared/api/dannye';
import type { StrokaTablicy } from '@/shared/lib/xlsx';
import { otkrytSchet, sohranitSchet, type Vlozhenie } from '@/shared/lib/vlozheniya';

export type NastroykaEtapa = {
  klyuch: string;
  nomer: number;
  imya: string;
  chtoEto: string;
  /** Заголовки и строки макета. Данные вымышленные — вид, а не факты. */
  maket: { kolonki: string[]; stroki: string[][] };
  /** Что сделать, чтобы вместо макета появились настоящие данные. */
  varianty: { zagolovok: string; opisanie: string }[];
};

export const ETAPY_NASTROYKI: NastroykaEtapa[] = [
  {
    klyuch: 'zakaz',
    nomer: 2,
    imya: 'Заказ',
    chtoEto:
      'Заказ поставщику: реквизиты, потребность в ТМЦ, срок производства и условия расчёта. Собирается из позиций реестра и отправляется поставщику.',
    maket: {
      kolonki: ['Заказ', 'Поставщик', 'Позиций', 'Срок', 'Условия расчёта', 'Статус'],
      stroki: [
        ['551', 'ЭКСПЕРТ КАБЕЛЬ', '38', '14 дней', '50% аванс', 'Черновик'],
        ['552', 'БК АЛПРОФ', '12', '21 день', 'По факту', 'На согласовании'],
        ['553', 'ГАЛАКТИКА', '7', '9 дней', '100% аванс', 'Согласован'],
      ],
    },
    varianty: [
      {
        zagolovok: 'Заполнять в панели',
        opisanie:
          'Заказ создаётся здесь же из позиций реестра. Нужен серверный API для сохранения: сейчас панель собрана как статика и писать ей некуда.',
      },
      {
        zagolovok: 'Загрузить реестр заявок ПДО',
        opisanie:
          'Файл вида «Реестр заявок ПДО … .xlsx» — из него подтянутся позиции и номера заказов, останется проставить поставщика и условия.',
      },
    ],
  },
  {
    klyuch: 'plan',
    nomer: 5,
    imya: 'План оплат',
    chtoEto:
      'Что и когда оплачиваем: дата платежа, плательщик, поставщик, счёт и сумма. Основание — счета из папки СЧЕТА к плану оплат.',
    maket: {
      kolonki: ['Дата', 'Плательщик', 'Поставщик', 'Счёт', 'Сумма, ₽', 'Статус'],
      stroki: [
        ['17.08.2026', 'НПК ТЕХНОПРОГРЕСС', 'ЭКСПЕРТ КАБЕЛЬ', '№ 25051', '1 240 000', 'В плане'],
        ['18.08.2026', 'Токопровод РУ', 'ГАЛАКТИКА', '№ 182', '486 300', 'Оплачен'],
        ['20.08.2026', 'АЛБИМАКС', 'БК АЛПРОФ', '№ 450', '912 750', 'Ожидает'],
      ],
    },
    varianty: [
      {
        zagolovok: 'Загрузить план оплат',
        opisanie:
          'Файл «ПЛАН_ОПЛАТ_на_… .xlsx» из папки istochniki. В нём уже есть даты, суммы и плательщики.',
      },
      {
        zagolovok: 'Загрузить платежи на дату',
        opisanie:
          'Файлы «ПЛАТЕЖИ на ДАТУ … .xlsx» из папки ОПЛАТЫ — по ним видно, что фактически ушло в оплату.',
      },
    ],
  },
  {
    klyuch: 'tender',
    nomer: 3,
    imya: 'Тендер',
    chtoEto:
      'Сравнение предложений поставщиков по одной позиции: цена, срок, условия. Итог — выбранный поставщик, который уходит в заказ.',
    maket: {
      kolonki: ['Позиция', 'Поставщик', 'Цена, ₽', 'Срок', 'Условия', 'Выбор'],
      stroki: [
        ['Шина медная до 130 мм', 'ЭКСПЕРТ КАБЕЛЬ', '1 086', '14 дней', '50% аванс', 'Выбран'],
        ['Шина медная до 130 мм', 'МТХ', '1 118', '10 дней', 'По факту', '—'],
        ['Шина медная до 130 мм', 'ГАЛАКТИКА', '1 150', '21 день', '100% аванс', '—'],
      ],
    },
    varianty: [
      {
        zagolovok: 'Загрузить коммерческие предложения',
        opisanie:
          'Таблица с ценами поставщиков по позициям. Готового файла в источниках нет — предложения приходят письмами.',
      },
      {
        zagolovok: 'Считать от действующих цен',
        opisanie:
          'Основа уже есть: в разделе «Цены закупки» лежат 17 материалов с поставщиками и историей цен. Тендер можно строить поверх них.',
      },
    ],
  },
  {
    klyuch: 'logistika',
    nomer: 4,
    imya: 'Логистика',
    chtoEto:
      'Доставка заказов от поставщика до места выгрузки: перевозчик, маршрут, плановая дата, стоимость и текущий статус.',
    maket: {
      kolonki: ['Заказ', 'Поставщик', 'Перевозчик', 'Маршрут', 'Дата доставки', 'Стоимость, ₽', 'Статус'],
      stroki: [
        ['551', 'ЭКСПЕРТ КАБЕЛЬ', 'Деловые Линии', 'Москва → Владимир', '08.09.2026', '48 500', 'Запланирована'],
        ['552', 'БК АЛПРОФ', 'Собственный транспорт', 'Белая Калитва → Владимир', '10.09.2026', '72 000', 'В пути'],
        ['553', 'ГАЛАКТИКА', 'ПЭК', 'Москва → Владимир', '05.09.2026', '31 800', 'Ожидает отгрузки'],
      ],
    },
    varianty: [
      {
        zagolovok: 'Заполнять в панели',
        opisanie:
          'Для каждой поставки указываются перевозчик, точки маршрута, плановая дата, стоимость и номер транспортного документа.',
      },
      {
        zagolovok: 'Загрузить реестр доставок',
        opisanie:
          'Можно загрузить Excel с заказами, маршрутами, датами и стоимостью перевозки — строки появятся в таблице логистики.',
      },
    ],
  },
];

type Zagruzheno = { imyaFayla: string; kolonki: string[]; stroki: StrokaTablicy[] };

export function Etap({ nastroyka }: { nastroyka: NastroykaEtapa }) {
  const { imya, chtoEto, maket, varianty } = nastroyka;
  const [svoi, setSvoi] = useState<Zagruzheno | null>(null);

  const kolonki = svoi ? svoi.kolonki : maket.kolonki;
  const stroki = svoi ? svoi.stroki : maket.stroki;
  const setka = `repeat(${kolonki.length}, minmax(110px, 1fr))`;

  return (
    <main className="pole pole-dashboard">
      <h1 className="pole-zagolovok">{imya}</h1>
      <p className="pole-podpis">{chtoEto}</p>

      {svoi ? (
        <div className="metka-maketa metka-svoi">
          <b>Загружено из файла.</b> {svoi.imyaFayla} — {chislo(svoi.stroki.length)} строк.
          Файл прочитан в браузере и никуда не отправлен; после перезагрузки страницы
          вернётся макет.{' '}
          <button className="ssylka" onClick={() => setSvoi(null)}>
            Вернуть макет
          </button>
        </div>
      ) : (
        <div className="metka-maketa">
          <b>Это макет.</b> Данные ниже придуманы, чтобы показать вид раздела. Настоящих
          данных для этапа «{imya}» в источниках пока нет.
        </div>
      )}

      {nastroyka.klyuch === 'tender' ? <TenderComparison /> : nastroyka.klyuch === 'zakaz' ? <ZakazyPosleTendera /> : nastroyka.klyuch === 'plan' ? <PlanOplat /> : nastroyka.klyuch === 'logistika' ? <Logistika /> : <div className="tablica tablica-prostaya" data-maket={!svoi || undefined}>
        <div className="tablica-shapka" style={{ gridTemplateColumns: setka }}>
          {kolonki.map((k, i) => (
            <div key={i}>{k}</div>
          ))}
        </div>
        {stroki.slice(0, 100).map((s, i) => (
          <div className="stroka stroka-potoke" key={i} style={{ gridTemplateColumns: setka }}>
            {kolonki.map((_, j) => (
              <div key={j}>{s[j] ?? ''}</div>
            ))}
          </div>
        ))}
      </div>}
      {stroki.length > 100 && (
        <p className="vidzhet-podpis">
          Показаны первые 100 строк из {chislo(stroki.length)}.
        </p>
      )}

      {nastroyka.klyuch === 'tender' && <SoglasovanieTendera />}

      <h2 className="vidzhet-zagolovok vidzhet-zagolovok-vtoroy">
        Как получить настоящие данные
      </h2>
      <div className="varianty">
        {varianty.map((v) => (
          <section className="variant" key={v.zagolovok}>
            <h3 className="variant-zagolovok">{v.zagolovok}</h3>
            <p className="variant-opisanie">{v.opisanie}</p>
          </section>
        ))}
      </div>

      <ZagruzkaFayla
        onZagruzheno={(stroki, imyaFayla, kolonki) =>
          setSvoi({ stroki, imyaFayla, kolonki })
        }
      />
    </main>
  );
}

type Uchastnik = { fio: string; soglasovano: boolean };
type SoglasovanieState = { uchastniki: Uchastnik[]; utverzhdeno: boolean };
const SOGLASOVANIE_KEY = 'klm-order-approval-v1';

function nachalnoeSoglasovanie(): SoglasovanieState {
  try {
    const saved = JSON.parse(localStorage.getItem(SOGLASOVANIE_KEY) ?? 'null') as SoglasovanieState | null;
    if (saved?.uchastniki?.length === 4) return saved;
  } catch {
    // Повреждённые локальные данные заменяются пустой формой.
  }
  return { uchastniki: Array.from({ length: 4 }, () => ({ fio: '', soglasovano: false })), utverzhdeno: false };
}

function SoglasovanieTendera() {
  const [state, setState] = useState<SoglasovanieState>(nachalnoeSoglasovanie);
  const [predlozhenie, setPredlozhenie] = useState<TenderSelection | null>(() => {
    try { return JSON.parse(localStorage.getItem('klm-tender-selected') ?? 'null'); } catch { return null; }
  });
  useEffect(() => {
    const onSent = (event: Event) => {
      setPredlozhenie((event as CustomEvent<TenderSelection>).detail);
      setState((current) => ({ ...current, utverzhdeno: false }));
    };
    window.addEventListener('tender-sent-to-approval', onSent);
    return () => window.removeEventListener('tender-sent-to-approval', onSent);
  }, []);
  const gotovo = Boolean(predlozhenie) && state.uchastniki.every((uchastnik) => uchastnik.fio.trim() && uchastnik.soglasovano);

  const sohranit = (next: SoglasovanieState) => {
    setState(next);
    localStorage.setItem(SOGLASOVANIE_KEY, JSON.stringify(next));
  };

  const izmenitUchastnika = (index: number, patch: Partial<Uchastnik>) => {
    const uchastniki = state.uchastniki.map((uchastnik, i) => i === index ? { ...uchastnik, ...patch } : uchastnik);
    sohranit({ uchastniki, utverzhdeno: false });
  };

  const utverdit = () => {
    if (!predlozhenie) return;
    let orders: ApprovedOrder[] = [];
    try { orders = JSON.parse(localStorage.getItem('klm-approved-orders') ?? '[]'); } catch { /* пустой список */ }
    const order: ApprovedOrder = { ...predlozhenie, approvedAt: new Date().toISOString() };
    const next = [...orders.filter((item) => item.invoiceNumber !== order.invoiceNumber), order];
    localStorage.setItem('klm-approved-orders', JSON.stringify(next));
    window.dispatchEvent(new CustomEvent('approved-order-added', { detail: order }));
    sohranit({ ...state, utverzhdeno: true });
  };

  return (
    <section className="soglasovanie-setka" aria-label="Согласование и утверждение тендера">
      <div className="soglasovanie-okno">
        <div className="soglasovanie-zagolovok">
          <div>
            <h2>Согласования</h2>
            <p>Заполните ФИО всех участников и отметьте результат.</p>
          </div>
          <span>{state.uchastniki.filter((u) => u.fio.trim() && u.soglasovano).length} / 4</span>
        </div>
        {predlozhenie && <div className="tender-peredano"><b>Передано на согласование:</b> {predlozhenie.supplier} · {chislo(predlozhenie.total)} ₽<br /><small>Тема: {predlozhenie.topic}</small></div>}
        <div className="soglasovanie-spisok">
          {state.uchastniki.map((uchastnik, index) => (
            <div className="soglasovanie-stroka" key={index} data-gotovo={Boolean(uchastnik.fio.trim() && uchastnik.soglasovano) || undefined}>
              <span className="soglasovanie-nomer">{index + 1}</span>
              <label>
                <span>ФИО участника</span>
                <input
                  type="text"
                  value={uchastnik.fio}
                  placeholder="Введите фамилию, имя и отчество"
                  onChange={(event) => izmenitUchastnika(index, { fio: event.target.value })}
                />
              </label>
              <label className="soglasovanie-check">
                <input
                  type="checkbox"
                  checked={uchastnik.soglasovano}
                  disabled={!uchastnik.fio.trim()}
                  onChange={(event) => izmenitUchastnika(index, { soglasovano: event.target.checked })}
                />
                Согласовано
              </label>
            </div>
          ))}
        </div>
        </div>

      <div className="utverzhdenie-okno" data-gotovo={gotovo || undefined} data-utverzhdeno={state.utverzhdeno || undefined}>
        <span className="utverzhdenie-metka">Утверждаю</span>
        <h2>Воронин С.В.</h2>
        {state.utverzhdeno ? (
          <p className="utverzhdenie-uspeh">Тендер утверждён. Заказ передан во вкладку «Заказ» для прикрепления счёта.</p>
        ) : gotovo ? (
          <div className="utverzhdenie-uvedomlenie" role="status">
            <b>Воронин С.В., требуется утверждение</b>
            <span>Все четыре участника заполнили согласование. Тендер готов к утверждению.</span>
          </div>
        ) : (
          <p>Ожидаются заполнение ФИО и согласование всех четырёх участников.</p>
        )}
        <button
          className="knopka knopka-glavnaya"
          disabled={!gotovo || state.utverzhdeno}
          onClick={utverdit}
        >
          {state.utverzhdeno ? 'Утверждено' : 'Утвердить тендер'}
        </button>
      </div>
    </section>
  );
}

type TenderItem = { name: string; quantity: number; lastPrice: number };
type TenderSupplier = { id: number; name: string; prices: number[]; payment: string; delivery: string };
type TenderLine = { name: string; quantity: number; price: number; total: number };
type TenderSelection = { supplier: string; total: number; topic: string; invoiceNumber: string; items: TenderLine[]; paymentPurpose: string };
type ApprovedOrder = TenderSelection & {
  approvedAt: string; attachment?: Vlozhenie; sentToPlan?: boolean;
  orderNumber?: string; project?: string; warehouseReceived?: boolean; receiptDate?: string; updAttachment?: Vlozhenie;
};
type PlanInvoice = ApprovedOrder & { attachment: Vlozhenie; paid: number };

const PLAN_TOPICS = [
  '01. Задолженность по отгруженным товарам',
  '02. Оплата по ТМЦ на складе у поставщика',
  '03. Планируемые платежи по заказам в работе у поставщиков',
  '04. Закупки в Китае',
  '05. Потребность по проектам',
  '06. Потребность по производству',
  '07. Транспортные расходы',
  '08. Потребность по офису',
] as const;

const TENDER_ITEMS: TenderItem[] = [
  { name: 'Шина медная М1 Т 6×130', quantity: 1200, lastPrice: 1086 },
  { name: 'Шина алюминиевая АД0 6×130', quantity: 850, lastPrice: 476 },
  { name: 'Лист алюминиевый АМг3 2 мм', quantity: 240, lastPrice: 512 },
];

const TENDER_SUPPLIERS: TenderSupplier[] = [
  { id: 1, name: 'ЭКСПЕРТ КАБЕЛЬ', prices: [1078, 489, 520], payment: '50% аванс, 50% перед отгрузкой', delivery: 'До склада покупателя, 14 дней' },
  { id: 2, name: 'БК АЛПРОФ', prices: [1105, 468, 505], payment: 'Оплата по факту поставки', delivery: 'Самовывоз, готовность 10 дней' },
  { id: 3, name: 'ГАЛАКТИКА', prices: [1092, 482, 518], payment: '100% предоплата', delivery: 'Транспортной компанией, 18 дней' },
];

function TenderComparison() {
  const [suppliers, setSuppliers] = useState<TenderSupplier[]>(TENDER_SUPPLIERS);
  const [selected, setSelected] = useState<number | null>(null);
  const [topic, setTopic] = useState('');
  const [sent, setSent] = useState(false);
  const chosen = suppliers.find((supplier) => supplier.id === selected);
  const total = (supplier: TenderSupplier) => supplier.prices.reduce((sum, price, i) => sum + price * TENDER_ITEMS[i].quantity, 0);

  const updateSupplier = (id: number, patch: Partial<TenderSupplier>) => {
    setSuppliers((current) => current.map((supplier) => supplier.id === id ? { ...supplier, ...patch } : supplier));
    setSent(false);
  };
  const updatePrice = (id: number, index: number, price: number) => {
    const supplier = suppliers.find((item) => item.id === id);
    if (supplier) updateSupplier(id, { prices: supplier.prices.map((value, i) => i === index ? price : value) });
  };
  const addSupplier = () => {
    const id = Math.max(0, ...suppliers.map((supplier) => supplier.id)) + 1;
    setSuppliers([...suppliers, { id, name: `Поставщик ${id}`, prices: TENDER_ITEMS.map(() => 0), payment: '', delivery: '' }]);
  };
  const sendToApproval = () => {
    if (!chosen) return;
    if (!topic) return;
    const detail: TenderSelection = {
      supplier: chosen.name,
      total: total(chosen),
      topic,
      invoiceNumber: `ТН-${new Date().toISOString().slice(0, 10).replaceAll('-', '')}-${chosen.id}`,
      items: TENDER_ITEMS.map((item, index) => ({ name: item.name, quantity: item.quantity, price: chosen.prices[index], total: item.quantity * chosen.prices[index] })),
      paymentPurpose: TENDER_ITEMS[TENDER_ITEMS.reduce((highest, _item, index) => chosen.prices[index] > chosen.prices[highest] ? index : highest, 0)].name,
    };
    localStorage.setItem('klm-tender-selected', JSON.stringify(detail));
    window.dispatchEvent(new CustomEvent('tender-sent-to-approval', { detail }));
    setSent(true);
  };

  return (
    <section className="tender-rabochiy">
      <div className="tender-panel-zagolovok">
        <div><h2>Сравнение предложений</h2><p>Цена за единицу и сумма по каждому ТМЦ рассчитываются отдельно.</p></div>
        <button className="knopka" onClick={addSupplier}>+ Поставщик</button>
      </div>
      <div className="tender-scroll"><table className="tender-matrica">
        <thead><tr><th>ТМЦ</th><th>Количество</th><th>Последняя цена</th>{suppliers.map((supplier) => <th key={supplier.id}>{supplier.name}</th>)}</tr></thead>
        <tbody>{TENDER_ITEMS.map((item, itemIndex) => <tr key={item.name}>
          <td>{item.name}</td><td>{chislo(item.quantity)}</td><td>{chislo(item.lastPrice)} ₽</td>
          {suppliers.map((supplier) => <td key={supplier.id}><input aria-label={`Цена ${item.name}, ${supplier.name}`} type="number" min="0" value={supplier.prices[itemIndex]} onChange={(event) => updatePrice(supplier.id, itemIndex, Number(event.target.value))} /><small>{chislo(supplier.prices[itemIndex] * item.quantity)} ₽</small></td>)}
        </tr>)}</tbody>
        <tfoot><tr><th colSpan={3}>Итоговая сумма</th>{suppliers.map((supplier) => <th key={supplier.id}>{chislo(total(supplier))} ₽</th>)}</tr></tfoot>
      </table></div>

      <div className="tender-usloviya">{suppliers.map((supplier) => <article key={supplier.id} data-vybran={selected === supplier.id || undefined}>
        <label className="tender-vybor"><input type="radio" name="tender-supplier" checked={selected === supplier.id} onChange={() => { setSelected(supplier.id); setSent(false); }} /><b>{supplier.name}</b></label>
        <label><span>Условия расчёта</span><textarea value={supplier.payment} onChange={(event) => updateSupplier(supplier.id, { payment: event.target.value })} /></label>
        <label><span>Условия доставки</span><textarea value={supplier.delivery} onChange={(event) => updateSupplier(supplier.id, { delivery: event.target.value })} /></label>
        {suppliers.length > 1 && <button className="ssylka" onClick={() => { setSuppliers(suppliers.filter((item) => item.id !== supplier.id)); if (selected === supplier.id) setSelected(null); }}>Удалить предложение</button>}
      </article>)}</div>

      <div className="tender-itog-setka">
        <section className="tender-izmenenie-cen"><h3>Изменение цены от последней закупки</h3>
          {chosen ? TENDER_ITEMS.map((item, index) => {
            const change = ((chosen.prices[index] - item.lastPrice) / item.lastPrice) * 100;
            return <div key={item.name}><span>{item.name}</span><strong data-napravlenie={change > 0 ? 'padenie' : change < 0 ? 'rost' : 'net'}>{change > 0 ? '+' : ''}{change.toLocaleString('ru-RU', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}%</strong></div>;
          }) : <p>Выберите поставщика, чтобы увидеть изменение цены.</p>}
        </section>
        <section className="tender-otpravka">
          <span>Выбранное предложение</span><strong>{chosen?.name ?? 'Не выбрано'}</strong><p>{chosen ? `Итого: ${chislo(total(chosen))} ₽` : 'Укажите поставщика вручную.'}</p>
          <label className="tender-tema"><span>Тема счёта</span><select value={topic} onChange={(event) => { setTopic(event.target.value); setSent(false); }}><option value="">Выберите подраздел плана оплат</option>{PLAN_TOPICS.map((item) => <option key={item} value={item}>{item}</option>)}</select></label>
          <button className="knopka knopka-glavnaya" disabled={!chosen || !topic || sent} onClick={sendToApproval}>{sent ? 'Отправлено на согласование' : 'Отправить на согласование'}</button>
        </section>
      </div>
    </section>
  );
}

function ZakazyPosleTendera() {
  const read = () => {
    try { return JSON.parse(localStorage.getItem('klm-approved-orders') ?? '[]') as ApprovedOrder[]; } catch { return []; }
  };
  const [orders, setOrders] = useState<ApprovedOrder[]>(read);
  const [error, setError] = useState('');
  useEffect(() => {
    const onAdded = () => setOrders(read());
    window.addEventListener('approved-order-added', onAdded);
    return () => window.removeEventListener('approved-order-added', onAdded);
  }, []);

  const saveOrders = (next: ApprovedOrder[]) => {
    setOrders(next);
    localStorage.setItem('klm-approved-orders', JSON.stringify(next));
  };
  const updateOrder = (order: ApprovedOrder, patch: Partial<ApprovedOrder>) => {
    saveOrders(orders.map((item) => item.invoiceNumber === order.invoiceNumber ? { ...item, ...patch, sentToPlan: false } : item));
  };
  const attach = async (order: ApprovedOrder, kind: 'invoice' | 'upd', file?: File) => {
    if (!file) return;
    try {
      setError('');
      const attachment = await sohranitSchet(file);
      updateOrder(order, kind === 'invoice' ? { attachment } : { updAttachment: attachment });
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Не удалось прикрепить счёт');
    }
  };
  const sendToPlan = (order: ApprovedOrder) => {
    if (!order.attachment) return;
    const warehouseRequired = order.topic === PLAN_TOPICS[1];
    if (warehouseRequired && (!order.warehouseReceived || !order.updAttachment || !order.orderNumber?.trim() || !order.project?.trim())) return;
    let invoices: PlanInvoice[] = [];
    try { invoices = JSON.parse(localStorage.getItem('klm-plan-invoices') ?? '[]'); } catch { /* пустой план */ }
    const invoice: PlanInvoice = { ...order, attachment: order.attachment, paid: 0, sentToPlan: true };
    localStorage.setItem('klm-plan-invoices', JSON.stringify([...invoices.filter((item) => item.invoiceNumber !== invoice.invoiceNumber), invoice]));
    saveOrders(orders.map((item) => item.invoiceNumber === order.invoiceNumber ? { ...item, sentToPlan: true } : item));
    window.dispatchEvent(new CustomEvent('plan-invoice-added', { detail: invoice }));
  };

  return (
    <section className="zakazy-scheta">
      <div className="tender-panel-zagolovok"><div><h2>Утверждённые заказы после тендера</h2><p>Прикрепите счёт поставщика, затем отправьте заказ в соответствующий подраздел плана оплат.</p></div></div>
      {error && <p className="zagruzka-fayla-oshibka">{error}</p>}
      {orders.length === 0 ? <div className="zakazy-pusto">Утверждённых результатов тендера пока нет.</div> : orders.map((order) => (
        <article className="zakaz-schet" key={order.invoiceNumber} data-otpravlen={order.sentToPlan || undefined}>
          <div><span>Поставщик</span><strong>{order.supplier}</strong></div>
          <div><span>Сумма заказа</span><strong>{chislo(order.total)} ₽</strong></div>
          <div><span>Тема плана оплат</span><strong>{order.topic}</strong></div>
          <div className="zakaz-vlozhenie"><span>Счёт поставщика</span>{order.attachment ? <button className="ssylka" onClick={() => otkrytSchet(order.attachment!)}>{order.attachment.name}</button> : <label className="knopka">Прикрепить счёт<input type="file" accept=".pdf,.xlsx,.xls,.doc,.docx,.jpg,.jpeg,.png,.tif,.tiff" onChange={(event) => attach(order, 'invoice', event.target.files?.[0])} /></label>}</div>
          {order.topic === PLAN_TOPICS[1] && <div className="sklad-prihod">
            <h3>Приход ТМЦ на склад</h3>
            <label><span>№ заказа</span><input value={order.orderNumber ?? ''} onChange={(event) => updateOrder(order, { orderNumber: event.target.value })} /></label>
            <label><span>Наименование проекта</span><input value={order.project ?? ''} onChange={(event) => updateOrder(order, { project: event.target.value })} /></label>
            <label><span>Дата прихода</span><input type="date" value={order.receiptDate ?? ''} onChange={(event) => updateOrder(order, { receiptDate: event.target.value })} /></label>
            <label className="soglasovanie-check"><input type="checkbox" checked={Boolean(order.warehouseReceived)} onChange={(event) => updateOrder(order, { warehouseReceived: event.target.checked })} />Оператор склада провёл приход</label>
            <div className="zakaz-vlozhenie"><span>УПД с № заказа и проектом</span>{order.updAttachment ? <button className="ssylka" onClick={() => otkrytSchet(order.updAttachment!)}>{order.updAttachment.name}</button> : <label className="knopka">Прикрепить УПД<input type="file" accept=".pdf,.xlsx,.xls,.jpg,.jpeg,.png,.tif,.tiff" onChange={(event) => attach(order, 'upd', event.target.files?.[0])} /></label>}</div>
          </div>}
          <button className="knopka knopka-glavnaya" disabled={!order.attachment || order.sentToPlan || (order.topic === PLAN_TOPICS[1] && (!order.warehouseReceived || !order.updAttachment || !order.orderNumber?.trim() || !order.project?.trim()))} onClick={() => sendToPlan(order)}>{order.sentToPlan ? 'Отправлено в план оплат' : 'Отправить в план оплат'}</button>
        </article>
      ))}
    </section>
  );
}

function PlanOplat() {
  const read = () => {
    try { return JSON.parse(localStorage.getItem('klm-plan-invoices') ?? '[]') as PlanInvoice[]; } catch { return []; }
  };
  const [invoices, setInvoices] = useState<PlanInvoice[]>(read);
  const [openTopics, setOpenTopics] = useState<Set<string>>(() => new Set());
  const [reportDate, setReportDate] = useState(() => new Date());
  const [sources, setSources] = useState({ invoices: '', payments: '', balances: '' });
  useEffect(() => {
    const onAdded = () => setInvoices(read());
    window.addEventListener('plan-invoice-added', onAdded);
    return () => window.removeEventListener('plan-invoice-added', onAdded);
  }, []);
  const allOpen = PLAN_TOPICS.every((topic) => openTopics.has(topic));
  const toggleTopic = (topic: string) => setOpenTopics((current) => {
    const next = new Set(current);
    if (next.has(topic)) next.delete(topic); else next.add(topic);
    return next;
  });
  const toggleAll = () => setOpenTopics(allOpen ? new Set() : new Set(PLAN_TOPICS));
  const grandTotal = invoices.reduce((sum, invoice) => sum + invoice.total, 0);
  const grandPaid = invoices.reduce((sum, invoice) => sum + invoice.paid, 0);
  const payers = ['ГЛАВПРОЕКТ', 'АЛБИМАКС-МЕТАЛЛ', 'ТОКОПРОВОД.РУ', 'МК ИНЖИНИРИНГ', 'ВР ЛОГИСТИК', 'ТРАНСПОРТНАЯ ЭКСПЕДИЦИЯ', 'НПК ТЕХНОПРОГРЕСС'];

  return (
    <section>
      <div className="plan-obzor">
        <div className="plan-title"><span>Фактические счета</span><h2>План оплат</h2><p>Отчёт сформирован {reportDate.toLocaleDateString('ru-RU')}: учтено {invoices.length} счетов, разнесённых по разделам.</p></div>
        <div className="plan-prioritety">
          <PlanPriority title="Приоритет 1" subtitle="на текущую дату" value={0} />
          <PlanPriority title="Приоритет 2" subtitle="до 5 рабочих дней" value={0} />
          <PlanPriority title="Приоритет 3" subtitle="до 30 рабочих дней" value={grandTotal - grandPaid} />
          <button className="plan-obnovit" onClick={() => { setInvoices(read()); setReportDate(new Date()); }}>Обновить данные</button>
        </div>
        <div className="plan-obshie-itogi"><span>Общие итоги по плану</span><div><small>Сумма заказа</small><b>{chislo(grandTotal)} ₽</b></div><div><small>Оплачено</small><b>{chislo(grandPaid)} ₽</b></div><div><small>Сумма к оплате</small><b>{chislo(grandTotal - grandPaid)} ₽</b></div></div>
      </div>
      <div className="plan-istochniki">
        <PlanSource title="Счета" button="Выбрать счета" value={sources.invoices} onChange={(value) => setSources({ ...sources, invoices: value })} />
        <PlanSource title="Оплаты" button="Выбрать оплаты" value={sources.payments} onChange={(value) => setSources({ ...sources, payments: value })} />
        <PlanSource title="Сальдо" button="Выбрать сальдо" value={sources.balances} onChange={(value) => setSources({ ...sources, balances: value })} />
      </div>
      <div className="plan-platelshchiki">{payers.map((payer) => {
        const rows = invoices.filter((invoice) => invoice.supplier.toUpperCase().includes(payer.split('-')[0]));
        const total = rows.reduce((sum, invoice) => sum + invoice.total, 0);
        const paid = rows.reduce((sum, invoice) => sum + invoice.paid, 0);
        return <article key={payer}><h3>{payer}</h3><div><span>Счета</span><b>{chislo(total)} ₽</b></div><div><span>Оплачено</span><b>{chislo(paid)} ₽</b></div><div><span>К оплате</span><b>{chislo(total - paid)} ₽</b></div></article>;
      })}</div>
      <div className="plan-deystviya"><button className="knopka knopka-glavnaya" onClick={toggleAll}>{allOpen ? 'Свернуть все счета' : 'Отобразить все счета'}</button></div>
    <div className="plan-razdely">
      <div className="plan-table-wrap">
      <div className="plan-shapka">
        {['№ п/п', 'Наименование поставщика', 'Наименование плательщика', 'Сальдо на дату', 'Сформировать срок', 'Приоритет', '№ заказа / наименование проекта', 'Реквизиты счёта / назначение платежа', '% к запуску', 'Сумма заказа', 'Оплачено', 'Сумма к оплате', 'Дата прихода'].map((column) => <span key={column}>{column}</span>)}
      </div>
      <div className="plan-filtry" aria-label="Фильтры плана оплат">
        <span>№</span>
        <select><option>Подбор</option></select>
        <select><option>Подбор</option></select>
        <span>—</span>
        <button className="knopka">Сформировать</button>
        <select><option>Подбор</option></select>
        <select><option>Подбор</option></select>
        <input placeholder="Счёт или ТМЦ" />
        <input placeholder="%" />
        <span>—</span><span>—</span><span>—</span>
        <input type="date" aria-label="Дата прихода" />
      </div>
      {PLAN_TOPICS.map((topic) => {
        const rows = invoices.filter((invoice) => invoice.topic === topic);
        const total = rows.reduce((sum, invoice) => sum + invoice.total, 0);
        const paid = rows.reduce((sum, invoice) => sum + invoice.paid, 0);
        return (
          <section className="plan-razdel" key={topic}>
            <div className="plan-razdel-summary"><button className="plan-treugolnik" aria-label={`${openTopics.has(topic) ? 'Свернуть' : 'Развернуть'} ${topic}`} aria-expanded={openTopics.has(topic)} onClick={() => toggleTopic(topic)}>▶</button><strong>{topic} · счетов: {rows.length}</strong><span className="plan-summary-total">{chislo(total)} ₽</span><span className="plan-summary-paid">{chislo(paid)} ₽</span><span className="plan-summary-due">{chislo(total - paid)} ₽</span></div>
            {openTopics.has(topic) && (rows.length > 0 ? <div className="plan-scheta">{rows.map((invoice, index) => <div key={invoice.invoiceNumber}>
              <span>{index + 1}</span>
              <b>{invoice.supplier}</b>
              <span>Не выбран</span>
              <span>—</span>
              <span>{new Date(invoice.approvedAt).toLocaleDateString('ru-RU')}</span>
              <span>Обычный</span>
              <span>{invoice.orderNumber ? `№ ${invoice.orderNumber}` : 'Тендер'}<small>{invoice.project ?? 'Утверждённый выбор'}</small></span>
              <span className="plan-vlozhenie"><b>{invoice.invoiceNumber}</b><button className="plan-tmc-link" onClick={() => otkrytSchet(invoice.attachment)}>{invoice.paymentPurpose || invoice.items?.[0]?.name || 'Открыть счёт'}</button><small>Счёт: {invoice.attachment.name}{invoice.updAttachment ? ` · УПД: ${invoice.updAttachment.name}` : ''}</small></span>
              <span>100%</span>
              <strong>{chislo(invoice.total)} ₽</strong>
              <span>{chislo(invoice.paid)} ₽</span>
              <strong>{chislo(invoice.total - invoice.paid)} ₽</strong>
              <span>{invoice.receiptDate ? new Date(`${invoice.receiptDate}T12:00:00`).toLocaleDateString('ru-RU') : '—'}</span>
            </div>)}</div> : <p>Утверждённых счетов в подразделе нет.</p>)}
          </section>
        );
      })}
      </div>
    </div>
    </section>
  );
}

function PlanPriority({ title, subtitle, value }: { title: string; subtitle: string; value: number }) {
  return <article><b>{title}</b><span>({subtitle})</span><small>Сумма к оплате</small><strong>{chislo(value)} ₽</strong></article>;
}

function PlanSource({ title, button, value, onChange }: { title: string; button: string; value: string; onChange: (value: string) => void }) {
  return <article><h3>{title}</h3><div><label className="knopka">{button}<input type="file" multiple onChange={(event) => onChange(event.target.files?.length ? `Выбрано файлов: ${event.target.files.length}` : '')} /></label><button className="knopka plan-source-update" onClick={() => onChange(value || 'Источник выбран вручную')}>Обновить данные</button></div><p>{value || 'Источник данных не выбран'}</p></article>;
}

type DeliveryRequest = {
  id: string; type: 'supplier' | 'pickup'; supplier: string; loadingAddress: string; contactPhone: string;
  orderNumber: string; project: string; payer: string; vehicleNumber: string; driverName: string;
  driverPhone: string; driverDocument: string; createdAt: string;
};

const EMPTY_DELIVERY: Omit<DeliveryRequest, 'id' | 'createdAt'> = {
  type: 'supplier', supplier: '', loadingAddress: '', contactPhone: '', orderNumber: '', project: '', payer: '',
  vehicleNumber: '', driverName: '', driverPhone: '', driverDocument: '',
};

function Logistika() {
  const read = () => {
    try { return JSON.parse(localStorage.getItem('klm-delivery-requests') ?? '[]') as DeliveryRequest[]; } catch { return []; }
  };
  const [form, setForm] = useState(EMPTY_DELIVERY);
  const [requests, setRequests] = useState<DeliveryRequest[]>(read);
  const [panel, setPanel] = useState<'request' | 'report'>('request');
  const [error, setError] = useState('');
  const update = (patch: Partial<typeof form>) => setForm((current) => ({ ...current, ...patch }));
  const required = [form.supplier, form.loadingAddress, form.contactPhone, form.orderNumber, form.project, form.payer];
  const logisticRequired = [form.vehicleNumber, form.driverName, form.driverPhone, form.driverDocument].every((value) => value.trim());
  const canSubmit = required.every((value) => value.trim()) && logisticRequired;

  const submit = () => {
    if (!canSubmit) { setError('Заполните все обязательные поля заявки, включая данные автомобиля и водителя.'); return; }
    const request: DeliveryRequest = { ...form, id: crypto.randomUUID(), createdAt: new Date().toISOString() };
    const next = [request, ...requests];
    setRequests(next);
    localStorage.setItem('klm-delivery-requests', JSON.stringify(next));
    setForm(EMPTY_DELIVERY);
    setError('');
    setPanel('report');
  };

  return (
    <div className="logistika-podrazdely">
      <aside className="relse logistika-relse">
        <p className="relse-zagolovok">Логистика</p>
        <button className="relse-punkt" aria-current={panel === 'request'} onClick={() => setPanel('request')}>Заявка на доставку</button>
        <button className="relse-punkt" aria-current={panel === 'report'} onClick={() => setPanel('report')}>Общий итог перевозки</button>
      </aside>
      <section className="logistika-rabochaya">
      {panel === 'request' ? (
      <div className="logistika-forma">
        <div className="tender-panel-zagolovok"><div><h2>Заявка на доставку груза</h2><p>Заполняет менеджер снабжения.</p></div></div>
        <fieldset className="dostavka-varianty"><legend>Вариант доставки</legend>
          <label data-vybran={form.type === 'supplier' || undefined}><input type="radio" name="delivery-type" checked={form.type === 'supplier'} onChange={() => update({ type: 'supplier' })} /><b>Доставка поставщика</b><span>Поставщик организует перевозку до места назначения.</span></label>
          <label data-vybran={form.type === 'pickup' || undefined}><input type="radio" name="delivery-type" checked={form.type === 'pickup'} onChange={() => update({ type: 'pickup' })} /><b>Самовывоз</b><span>Назначаются автомобиль и водитель.</span></label>
        </fieldset>

        <div className="logistika-blok"><h3>Поставщик и место погрузки</h3><div className="logistika-polya">
          <Pole label="Поставщик" value={form.supplier} onChange={(supplier) => update({ supplier })} />
          <Pole label="Адрес погрузки" value={form.loadingAddress} onChange={(loadingAddress) => update({ loadingAddress })} />
          <Pole label="Телефон контактного лица" value={form.contactPhone} onChange={(contactPhone) => update({ contactPhone })} type="tel" />
        </div></div>
        <div className="logistika-blok"><h3>Заказ и доверенность</h3><div className="logistika-polya">
          <Pole label="№ заказа" value={form.orderNumber} onChange={(orderNumber) => update({ orderNumber })} />
          <Pole label="Наименование проекта" value={form.project} onChange={(project) => update({ project })} />
          <Pole label="Плательщик (для оформления доверенности)" value={form.payer} onChange={(payer) => update({ payer })} />
        </div></div>
        <div className="logistika-blok"><h3>Данные логиста</h3><div className="logistika-polya">
          <Pole label="Номер автомобиля" value={form.vehicleNumber} onChange={(vehicleNumber) => update({ vehicleNumber })} />
          <Pole label="ФИО водителя" value={form.driverName} onChange={(driverName) => update({ driverName })} />
          <Pole label="Телефон водителя" value={form.driverPhone} onChange={(driverPhone) => update({ driverPhone })} type="tel" />
          <Pole label="Данные документа водителя" value={form.driverDocument} onChange={(driverDocument) => update({ driverDocument })} />
        </div></div>
        {error && <p className="zagruzka-fayla-oshibka">{error}</p>}
        <button className="knopka knopka-glavnaya" onClick={submit}>Оформить заявку</button>
      </div>
      ) : (
      <div className="logistika-zayavki logistika-otchet">
        <div className="tender-panel-zagolovok"><div><h2>Общий итог действующих перевозок</h2><p>Сводка по всем оформленным заявкам на доставку.</p></div></div>
        <div className="logistika-kpi"><div><strong>{requests.length}</strong><span>Всего перевозок</span></div><div><strong>{requests.filter((r) => r.type === 'supplier').length}</strong><span>Доставка поставщика</span></div><div><strong>{requests.filter((r) => r.type === 'pickup').length}</strong><span>Самовывоз</span></div><div><strong>{requests.filter((r) => r.vehicleNumber).length}</strong><span>Назначено автомобилей</span></div></div>
        <h2>Действующие заказы доставки <span>{requests.length}</span></h2>
        {requests.length === 0 ? <p>Заявок на доставку пока нет.</p> : requests.map((request) => <article key={request.id}>
          <div><b>Заказ №{request.orderNumber}</b><span>{request.project}</span></div><strong>{request.type === 'supplier' ? 'Доставка поставщика' : 'Самовывоз'}</strong>
          <p>{request.supplier} · {request.loadingAddress} · {request.contactPhone}</p><p>Плательщик: {request.payer}</p>
          {request.vehicleNumber && <p>Авто: {request.vehicleNumber} · водитель: {request.driverName}, {request.driverPhone}</p>}
        </article>)}
      </div>
      )}
      </section>
    </div>
  );
}

function Pole({ label, value, onChange, type = 'text' }: { label: string; value: string; onChange: (value: string) => void; type?: string }) {
  return <label><span>{label}</span><input type={type} value={value} onChange={(event) => onChange(event.target.value)} /></label>;
}
