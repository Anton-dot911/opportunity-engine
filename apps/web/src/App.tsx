import { FormEvent, useCallback, useEffect, useState } from 'react';

type Health = { status: 'ok'; service: string; timestamp: string };
type SourceType = 'url' | 'rss' | 'atom' | 'upload' | 'api';
type Source = {
  id: string;
  name: string;
  type: SourceType;
  locator: string;
  enabled: boolean;
  createdAt: string;
};

const sourceTypes: { value: SourceType; label: string }[] = [
  { value: 'rss', label: 'RSS feed' },
  { value: 'atom', label: 'Atom feed' },
  { value: 'url', label: 'Web page URL' },
  { value: 'api', label: 'API endpoint' },
  { value: 'upload', label: 'File upload (reserved)' },
];

export function App() {
  const [health, setHealth] = useState<Health | null>(null);
  const [apiError, setApiError] = useState(false);
  const [sources, setSources] = useState<Source[]>([]);
  const [name, setName] = useState('');
  const [type, setType] = useState<SourceType>('rss');
  const [locator, setLocator] = useState('');
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  const loadSources = useCallback(async () => {
    try {
      const response = await fetch('/api/sources');
      if (!response.ok) throw new Error('Не вдалося отримати перелік джерел.');
      setSources((await response.json()) as Source[]);
    } catch {
      setMessage('База даних недоступна. Перевірте PostgreSQL та виконайте міграції.');
    }
  }, []);

  useEffect(() => {
    fetch('/api/health')
      .then((response) => {
        if (!response.ok) throw new Error('API request failed');
        return response.json() as Promise<Health>;
      })
      .then(setHealth)
      .catch(() => setApiError(true));
    void loadSources();
  }, [loadSources]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setMessage('');
    try {
      const response = await fetch('/api/sources', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, type, locator }),
      });
      const result = (await response.json()) as { error?: string };
      if (!response.ok) {
        if (result.error === 'SOURCE_ALREADY_EXISTS') {
          throw new Error('Таке джерело вже зареєстроване.');
        }
        if (result.error === 'VALIDATION_ERROR') {
          throw new Error('Перевірте назву, тип та адресу джерела.');
        }
        throw new Error('Не вдалося зберегти джерело. Перевірте підключення до БД.');
      }
      setName('');
      setLocator('');
      setMessage('Джерело успішно зареєстровано.');
      await loadSources();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Невідома помилка.');
    } finally {
      setSaving(false);
    }
  }

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
              <span>{String(index + 1).padStart(2, '0')}</span><strong>{item}</strong>
            </div>
          ))}
        </div>
      </section>

      <section className="status-card">
        <div>
          <p className="eyebrow">SYSTEM STATUS</p>
          <h2>Foundation environment</h2>
          <p className="muted">Реєстрація джерел інформації та збереження в PostgreSQL.</p>
        </div>
        <div className={health ? 'status online' : 'status offline'}>
          <i />{health ? 'API ONLINE' : apiError ? 'API OFFLINE' : 'CHECKING API'}
        </div>
      </section>

      <section className="workspace">
        <div className="section-heading">
          <div><p className="eyebrow">DISCOVERY INPUT</p><h2>Джерела інформації</h2></div>
          <span className="count">{sources.length} зареєстровано</span>
        </div>
        <form className="source-form" onSubmit={handleSubmit}>
          <label>Назва джерела<input value={name} onChange={(event) => setName(event.target.value)} placeholder="Наприклад, галузеві новини" required maxLength={160} /></label>
          <label>Тип<select value={type} onChange={(event) => setType(event.target.value as SourceType)}>{sourceTypes.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</select></label>
          <label className="locator-field">URL / ідентифікатор<input value={locator} onChange={(event) => setLocator(event.target.value)} placeholder="https://example.com/feed.xml" required maxLength={2048} /></label>
          <button type="submit" disabled={saving || !health}>{saving ? 'Збереження…' : 'Додати джерело'}</button>
        </form>
        {message && <p className="feedback" role="status">{message}</p>}
        <div className="source-list">
          {sources.length === 0 ? (
            <p className="empty-state">Джерел поки немає. Додайте перше джерело для майбутнього збору інформації.</p>
          ) : sources.map((source) => (
            <article className="source-row" key={source.id}>
              <div className="source-icon">{source.type.toUpperCase().slice(0, 3)}</div>
              <div className="source-details"><strong>{source.name}</strong><span>{source.locator}</span></div>
              <span className={source.enabled ? 'source-state enabled' : 'source-state'}>{source.enabled ? 'Увімкнено' : 'Вимкнено'}</span>
            </article>
          ))}
        </div>
      </section>
      <footer>Opportunity Engine · Operator-assisted by design</footer>
    </main>
  );
}
