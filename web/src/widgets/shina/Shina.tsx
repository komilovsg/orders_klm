export type Etap = { nomer?: number; klyuch: string; nazvanie: string };

export const ETAPY: Etap[] = [
  { klyuch: 'obzor', nazvanie: 'Обзор' },
  { nomer: 1, klyuch: 'obshee', nazvanie: 'Общее' },
  { nomer: 2, klyuch: 'zakaz', nazvanie: 'Заказ' },
  { nomer: 3, klyuch: 'plan', nazvanie: 'План оплат' },
  { nomer: 4, klyuch: 'tender', nazvanie: 'Тендер' },
];

// Котировки Westmetall ещё не подключены. Показываем прочерк, а не выдуманное
// число: цена металла — основание для закупки, врать тут нельзя.
const METALLY = [
  { kod: 'cu', imya: 'Cu' },
  { kod: 'al', imya: 'Al' },
  { kod: 'zn', imya: 'Zn' },
];

type Props = {
  aktivnyy: string;
  vybrat: (klyuch: string) => void;
};

/** Сигнатурный элемент: медная шина — изделие компании. Этапы закупки сидят
 *  на ней контактами, активный замкнут. */
export function Shina({ aktivnyy, vybrat }: Props) {
  return (
    <>
      <header className="shapka">
        <button className="marka" onClick={() => vybrat('obzor')}>
          КЛМ <span>закупки</span>
        </button>
        <div className="kotirovki">
          {METALLY.map((m) => (
            <div className="kotirovka" key={m.kod} title="Источник котировок не подключён">
              <i className="kotirovka-metall" data-metall={m.kod} />
              {m.imya}
              <span className="kotirovka-delta">—</span>
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
