import { useEffect, useState } from 'react';

type Health = {
  status: 'ok';
  service: string;
  timestamp: string;
};

export function App() {
  const [health, setHealth] = useState<Health | null>(null);
  const [apiError, setApiError] = useState(false);

  useEffect(() => {
    fetch('/api/health')
      .then((response) => {
        if (!response.ok) throw new Error('API request failed');
        return response.json() as Promise<Health>;
      })
      .then(setHealth)
      .catch(() => setApiError(true));
  }, []);

  return (
    <main className="shell">
      <header className="topbar">
        <div className="brand-mark">OE</div>
        <span>OPPORTUNITY ENGINE</span>
        <span className="version">FOUNDATION · 0.1.0</span>
      </header>

      <section className="hero">
        <p className="eyebrow">ECONOMIC OPPORTUNITY INTELLIGENCE</p>
        <h1>Знаходити дисбаланси.<br /><span>Перетворювати їх на можливості.</span></h1>
        <p className="lead">
          Система для виявлення економічних дисбалансів, формування гіпотез,
          перевірки доказів та оцінки потенціалу прибутку.
        </p>
        <div className="pipeline" aria-label="Основний процес">
          {['Зміна', 'Дисбаланс', 'Можливість', 'Валідація', 'Прибуток'].map((item, index) => (
            <div className="pipeline-step" key={item}>
              <span>{String(index + 1).padStart(2, '0')}</span>
              <strong>{item}</strong>
            </div>
          ))}
        </div>
      </section>

      <section className="status-card">
        <div>
          <p className="eyebrow">SYSTEM STATUS</p>
          <h2>Foundation environment</h2>
          <p className="muted">Базове середовище розгорнуто. Наступний крок — підключення сховища даних.</p>
        </div>
        <div className={health ? 'status online' : 'status offline'}>
          <i />
          {health ? 'API ONLINE' : apiError ? 'API OFFLINE' : 'CHECKING API'}
        </div>
      </section>
      <footer>Opportunity Engine · Operator-assisted by design</footer>
    </main>
  );
}
