import { useState } from 'react';
import { ZagruzkaFayla } from '@/shared/ui/ZagruzkaFayla';
import { chislo } from '@/shared/api/dannye';
import type { StrokaTablicy } from '@/shared/lib/xlsx';

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
    nomer: 3,
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
    nomer: 4,
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

      <div className="tablica tablica-prostaya" data-maket={!svoi || undefined}>
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
      </div>
      {stroki.length > 100 && (
        <p className="vidzhet-podpis">
          Показаны первые 100 строк из {chislo(stroki.length)}.
        </p>
      )}

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
