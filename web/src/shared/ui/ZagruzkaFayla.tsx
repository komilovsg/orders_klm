import { useRef, useState } from 'react';
import { razobratKnigu, type StrokaTablicy } from '@/shared/lib/xlsx';

type Props = {
  onZagruzheno: (stroki: StrokaTablicy[], imyaFayla: string, kolonki: string[]) => void;
};

/** Загрузка Excel прямо в панели: файл разбирается в браузере и никуда не уходит. */
export function ZagruzkaFayla({ onZagruzheno }: Props) {
  const vvod = useRef<HTMLInputElement>(null);
  const [gruzitsya, setGruzitsya] = useState(false);
  const [oshibka, setOshibka] = useState('');

  const vzyat = async (file: File | undefined) => {
    if (!file) return;
    setOshibka('');
    setGruzitsya(true);
    try {
      const list = await razobratKnigu(file);
      onZagruzheno(list.stroki, file.name, list.kolonki);
    } catch (e) {
      setOshibka(e instanceof Error ? e.message : 'Не удалось прочитать файл');
    } finally {
      setGruzitsya(false);
    }
  };

  return (
    <section className="zagruzka-fayla">
      <div className="zagruzka-fayla-tekst">
        <h3 className="variant-zagolovok">Загрузить свой файл</h3>
        <p className="variant-opisanie">
          Excel-файл со списком. Разбирается прямо в браузере — на сервер ничего не
          отправляется. Берётся первый заполненный лист, первая строка считается
          заголовками.
        </p>
        {oshibka && <p className="zagruzka-fayla-oshibka">{oshibka}</p>}
      </div>

      <input
        ref={vvod}
        type="file"
        accept=".xlsx,.xlsm"
        hidden
        onChange={(e) => {
          void vzyat(e.target.files?.[0]);
          e.target.value = '';
        }}
      />
      <button className="knopka" onClick={() => vvod.current?.click()} disabled={gruzitsya}>
        {gruzitsya ? 'Читаем файл…' : 'Выбрать .xlsx'}
      </button>
    </section>
  );
}
