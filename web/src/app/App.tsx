import { useEffect, useState } from 'react';
import { Shina } from '@/widgets/shina/Shina';
import { Dashboard } from '@/pages/dashboard/Dashboard';
import { Obshee } from '@/pages/obshee/Obshee';
import { Landing } from '@/pages/landing/Landing';
import { useDannye } from '@/shared/api/dannye';

/** Роутинг по hash: два адреса, ради них тянуть react-router незачем.
 *  #panel — рабочая панель, всё остальное — лендинг. */
function useHash() {
  const [hash, setHash] = useState(() => window.location.hash);
  useEffect(() => {
    const on = () => setHash(window.location.hash);
    window.addEventListener('hashchange', on);
    return () => window.removeEventListener('hashchange', on);
  }, []);
  return hash;
}

export function App() {
  const [etap, setEtap] = useState('obzor');
  const { dannye, oshibka } = useDannye();
  const hash = useHash();

  if (!hash.startsWith('#panel')) {
    return (
      <Landing
        svodka={dannye?.svodka ?? null}
        otkryt={() => {
          window.location.hash = '#panel';
        }}
      />
    );
  }

  return (
    <div className="app">
      <Shina aktivnyy={etap} vybrat={setEtap} />

      {oshibka && <div className="zagruzka">Данные не загрузились: {oshibka}</div>}
      {!oshibka && !dannye && <div className="zagruzka">Загружаем реестр…</div>}

      {dannye && (
        <div className="ekran" key={etap}>
          {etap === 'obzor' && <Dashboard dannye={dannye} pereyti={setEtap} />}
          {etap === 'obshee' && <Obshee dannye={dannye} />}
          {etap !== 'obzor' && etap !== 'obshee' && (
            <div className="zagruzka">
              Этап переносится на React. Готовы «Обзор» и «Общее».
            </div>
          )}
        </div>
      )}
    </div>
  );
}
