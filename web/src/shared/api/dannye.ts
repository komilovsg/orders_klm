import { useCallback, useEffect, useRef, useState } from 'react';

export type Pozicia = {
  order: string;
  project: string;
  name: string;
  unit: string;
  quantity: number;
};

export type Svodka = {
  orders: number;
  projects: number;
  items: number;
  suppliers: number;
  byUnit: Record<string, number>;
  source: { fileName: string; sheetName: string; sourceRows: number };
};

export type Platelshchik = {
  name: string;
  bank: string;
  updated: string;
  file: string;
};

export type Material = {
  name: string;
  supplier: string;
  unit: string;
  cena: number | string;
  istoria: (number | string)[];
  diapazon: string;
};

export type Peregovor = {
  razdel: string;
  pozicia: string;
  bylo: string;
  stalo: string;
  skidka: number | null;
  primechanie: string;
};

export type Kotirovki = {
  kurs: number | null;
  cu: number | null;
  al: number | null;
};

export type Ceny = {
  materialy: Material[];
  peregovory: Peregovor[];
  kotirovki: Kotirovki;
};

export type Dannye = {
  pozicii: Pozicia[];
  postavshchiki: string[];
  svodka: Svodka;
  platelshchiki: Platelshchik[];
  ceny: Ceny;
};

const zagruzit = async <T,>(file: string): Promise<T> => {
  const r = await fetch(`${import.meta.env.BASE_URL}data/${file}`);
  if (!r.ok) throw new Error(`Не удалось загрузить ${file}: ${r.status}`);
  return r.json();
};

export function useDannye() {
  const [dannye, setDannye] = useState<Dannye | null>(null);
  const [oshibka, setOshibka] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      zagruzit<Pozicia[]>('items.json'),
      zagruzit<string[]>('suppliers.json'),
      zagruzit<Svodka>('stats.json'),
      zagruzit<Platelshchik[]>('platelshchiki.json'),
      zagruzit<Ceny>('ceny.json'),
    ])
      .then(([pozicii, postavshchiki, svodka, platelshchiki, ceny]) =>
        setDannye({ pozicii, postavshchiki, svodka, platelshchiki, ceny })
      )
      .catch((e: Error) => setOshibka(e.message));
  }, []);

  return { dannye, oshibka };
}

export const RAZMER_STRANICY = 100;
const ZADERZHKA_MS = 320;

/** Отдаёт список страницами с задержкой — имитация серверной выдачи.
 *  Когда появится настоящий API, меняется только тело этой функции. */
function vydatStranicu<T>(vse: T[], do_: number): Promise<T[]> {
  return new Promise((resolve) =>
    setTimeout(() => resolve(vse.slice(0, do_)), ZADERZHKA_MS)
  );
}

/** Постраничный доступ к списку любой длины.
 *  Сброс на первую страницу происходит при смене входного массива —
 *  то есть каждый раз, когда меняются фильтры. */
export function useStranicy<T>(vse: T[]) {
  const [pokazano, setPokazano] = useState<T[]>([]);
  const [gruzitsya, setGruzitsya] = useState(true);
  const zapros = useRef(0);

  const dogruzit = useCallback(
    (skolko: number) => {
      const moy = ++zapros.current;
      setGruzitsya(true);
      vydatStranicu(vse, skolko).then((chast) => {
        // Пока страница ехала, фильтры могли смениться — ответ устарел.
        if (moy !== zapros.current) return;
        setPokazano(chast);
        setGruzitsya(false);
      });
    },
    [vse]
  );

  useEffect(() => {
    dogruzit(RAZMER_STRANICY);
  }, [dogruzit]);

  const escho = pokazano.length < vse.length;

  return {
    stroki: pokazano,
    escho,
    gruzitsya,
    vsego: vse.length,
    pokazatEscho: () => {
      if (!gruzitsya && escho) dogruzit(pokazano.length + RAZMER_STRANICY);
    },
  };
}

export const chislo = (n: number) => n.toLocaleString('ru-RU');
