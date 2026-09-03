import { useEffect, useState } from 'react';

export type RynochnyeDannye = {
  fetchedAt: string;
  metals: {
    copper: { value: number; date: string; previousValue: number; previousDate: string; monthlyAverage: number; monthlyStart: string; observations: number };
    aluminium: { value: number; date: string; previousValue: number; previousDate: string; monthlyAverage: number; monthlyStart: string; observations: number };
  };
  currencies: {
    date: string; previousDate: string;
    usd: number; previousUsd: number;
    cny: number; previousCny: number;
    monthlyUsdAverage: number; monthlyUsdObservations: number;
    monthlyPeriodStart: string; monthlyPeriodEnd: string;
  };
};

type Sostoyanie = { dannye: RynochnyeDannye | null; zagruzka: boolean; ustareli: boolean; oshibka: string | null };
const KESH = 'klm-market-data-v5';

function moskovskayaData() {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Moscow' }).format(new Date());
}

function prochitatKesh(): { day: string; data: RynochnyeDannye } | null {
  try {
    const saved = JSON.parse(localStorage.getItem(KESH) ?? 'null');
    const data = saved?.data as RynochnyeDannye | undefined;
    const values = data && [
      data.metals?.copper?.value,
      data.metals?.copper?.previousValue,
      data.metals?.aluminium?.value,
      data.metals?.aluminium?.previousValue,
      data.currencies?.usd,
      data.currencies?.previousUsd,
      data.currencies?.cny,
      data.currencies?.previousCny,
      data.metals?.copper?.monthlyAverage,
      data.currencies?.monthlyUsdAverage,
    ];
    return values && values.every((value) => Number.isFinite(value)) ? saved : null;
  } catch {
    return null;
  }
}

export function useRynochnyeDannye(): Sostoyanie {
  const [state, setState] = useState<Sostoyanie>(() => ({
    dannye: prochitatKesh()?.data ?? null,
    zagruzka: true,
    ustareli: false,
    oshibka: null,
  }));

  useEffect(() => {
    const controller = new AbortController();
    const saved = prochitatKesh();
    if (saved?.day === moskovskayaData()) {
      setState({ dannye: saved.data, zagruzka: false, ustareli: false, oshibka: null });
      return () => controller.abort();
    }
    fetch('/api/market-data', { signal: controller.signal })
      .then(async (response) => {
        if (!response.ok) throw new Error((await response.json()).error ?? `HTTP ${response.status}`);
        return response.json() as Promise<RynochnyeDannye>;
      })
      .then((data) => {
        localStorage.setItem(KESH, JSON.stringify({ day: moskovskayaData(), data }));
        setState({ dannye: data, zagruzka: false, ustareli: false, oshibka: null });
      })
      .catch((error) => {
        if (!controller.signal.aborted) setState({
          dannye: saved?.data ?? null,
          zagruzka: false,
          ustareli: Boolean(saved),
          oshibka: error instanceof Error ? error.message : 'Не удалось обновить данные',
        });
      });
    return () => controller.abort();
  }, []);

  return state;
}
