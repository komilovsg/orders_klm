import { chislo, type Kotirovki } from '@/shared/api/dannye';

export type Etap = { nomer?: number; klyuch: string; nazvanie: string };

export const ETAPY: Etap[] = [
  { klyuch: 'obzor', nazvanie: 'Обзор' },
  { nomer: 1, klyuch: 'obshee', nazvanie: 'Общее' },
  { nomer: 2, klyuch: 'zakaz', nazvanie: 'Заказ' },
  { nomer: 3, klyuch: 'plan', nazvanie: 'План оплат' },
  { nomer: 4, klyuch: 'tender', nazvanie: 'Тендер' },
];

type Props = {
  aktivnyy: string;
  vybrat: (klyuch: string) => void;
  kotirovki?: Kotirovki;
};

/** Сигнатурный элемент: медная шина — изделие компании. Этапы закупки сидят
 *  на ней контактами, активный замкнут. */
export function Shina({ aktivnyy, vybrat, kotirovki }: Props) {
  // Цены сырья из ЦЕНА СЫРЬЯ.xlsx — та же основа, по которой считается закупка.
  const metally = [
    { kod: 'cu', imya: 'Cu', cena: kotirovki?.cu },
    { kod: 'al', imya: 'Al', cena: kotirovki?.al },
    { kod: 'kurs', imya: '$', cena: kotirovki?.kurs },
  ];

  return (
    <>
      <header className="shapka">
        <button className="marka" onClick={() => vybrat('obzor')}>
          КЛМ <span>закупки</span>
        </button>
        <div className="kotirovki">
          {metally.map((m) => (
            <div
              className="kotirovka"
              key={m.kod}
              title={m.cena ? 'Цена сырья из ЦЕНА СЫРЬЯ.xlsx' : 'Источник цен не подключён'}
            >
              <i className="kotirovka-metall" data-metall={m.kod} />
              {m.imya}
              <span className="kotirovka-cena">
                {m.cena ? chislo(Math.round(m.cena)) : '—'}
              </span>
            </div>
          ))}
        </div>
      </header>

      <nav className="shina" aria-label="Этапы закупки">
        {ETAPY.map((e) => (
          <button
            className="kontakt"
            key={e.klyuch}
            data-bez-nomera={e.nomer === undefined || undefined}
            onClick={() => vybrat(e.klyuch)}
            aria-current={aktivnyy === e.klyuch ? 'page' : undefined}
          >
            {e.nomer !== undefined && <span className="kontakt-nomer">{e.nomer}</span>}
            {e.nazvanie}
          </button>
        ))}
      </nav>
    </>
  );
}
