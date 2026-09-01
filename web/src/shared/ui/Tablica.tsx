import { useEffect, useRef, useState, type ReactNode } from 'react';

const ZAPAS = 6; // строк рендерим сверх экрана, чтобы скролл не мигал

export type Kolonka<T> = {
  klyuch: string;
  zagolovok: string;
  shirina: string;
  /** Скрыть колонку в карточном режиме — на телефоне место дорогое. */
  vtorostepennaya?: boolean;
  yacheyka: (row: T) => ReactNode;
};

type Props<T> = {
  stroki: T[];
  kolonki: Kolonka<T>[];
  pustoTekst: string;
  vsego: number;
  escho: boolean;
  gruzitsya: boolean;
  pokazatEscho: () => void;
};

/** true, пока media-запрос совпадает. */
function useUzkiy(zapros = '(max-width: 760px)') {
  const [da, setDa] = useState(() => window.matchMedia(zapros).matches);
  useEffect(() => {
    const mq = window.matchMedia(zapros);
    const on = () => setDa(mq.matches);
    mq.addEventListener('change', on);
    return () => mq.removeEventListener('change', on);
  }, [zapros]);
  return da;
}

/** Виртуализация под фиксированную высоту строки: накопленные страницы
 *  рендерятся примерно тридцатью узлами независимо от их числа.
 *  ponytail: своя, ~40 строк — библиотека понадобится, если строки станут разной высоты. */
export function Tablica<T>({
  stroki,
  kolonki,
  pustoTekst,
  vsego,
  escho,
  gruzitsya,
  pokazatEscho,
}: Props<T>) {
  const uzkiy = useUzkiy();
  // В карточном режиме название занимает до трёх строк — высота считана под этот
  // максимум с запасом, чтобы нижняя строка не упиралась в разделитель карточек.
  const rowH = uzkiy ? 174 : 34;
  const [scroll, setScroll] = useState(0);
  const [vysota, setVysota] = useState(600);
  const mayak = useRef<HTMLDivElement>(null);

  // Автодогрузка: маяк под последней строкой въезжает в экран — тянем следующую страницу.
  useEffect(() => {
    const el = mayak.current;
    if (!el || !escho) return;
    const obs = new IntersectionObserver(
      ([zapis]) => zapis.isIntersecting && pokazatEscho(),
      { rootMargin: '200px' }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [escho, pokazatEscho]);

  const setka = kolonki.map((k) => k.shirina).join(' ');
  const pervaya = Math.max(0, Math.floor(scroll / rowH) - ZAPAS);
  const poslednyaya = Math.min(stroki.length, Math.ceil((scroll + vysota) / rowH) + ZAPAS);
  const vidimye = stroki.slice(pervaya, poslednyaya);

  return (
    <div className="tablica-obolochka">
      <div
        className="tablica"
        data-karty={uzkiy || undefined}
        ref={(el) => {
          if (el && el.clientHeight !== vysota) setVysota(el.clientHeight);
        }}
        onScroll={(e) => setScroll(e.currentTarget.scrollTop)}
      >
        {!uzkiy && (
          <div className="tablica-shapka" style={{ gridTemplateColumns: setka }}>
            {kolonki.map((k) => (
              <div key={k.klyuch}>{k.zagolovok}</div>
            ))}
          </div>
        )}

        {stroki.length === 0 && !gruzitsya ? (
          <div className="pusto">{pustoTekst}</div>
        ) : (
          <div className="tablica-telo" style={{ height: stroki.length * rowH }}>
            {vidimye.map((row, i) => (
              <div
                className="stroka"
                key={pervaya + i}
                style={{
                  top: (pervaya + i) * rowH,
                  height: rowH,
                  gridTemplateColumns: uzkiy ? undefined : setka,
                }}
              >
                {kolonki.map((k) => (
                  <div
                    key={k.klyuch}
                    data-metka={k.zagolovok}
                    data-vtoroy={k.vtorostepennaya || undefined}
                  >
                    {k.yacheyka(row)}
                  </div>
                ))}
              </div>
            ))}
          </div>
        )}

        <div ref={mayak} className="mayak" />
      </div>

      <footer className="tablica-podval">
        <span className="schetchik">
          Показано {stroki.length.toLocaleString('ru-RU')} из {vsego.toLocaleString('ru-RU')}
        </span>
        {escho && (
          <button className="knopka" onClick={pokazatEscho} disabled={gruzitsya}>
            {gruzitsya ? 'Загружаем…' : 'Показать ещё'}
          </button>
        )}
        {!escho && vsego > 0 && <span className="schetchik">Список полностью загружен</span>}
      </footer>
    </div>
  );
}
