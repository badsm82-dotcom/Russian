import { useEffect, useState } from 'react';
import { api } from './api';
import { SpeakIcon } from './Audio';
import { RuWord } from './visual';

/** Validation des passerelles candidates (emprunts au français) : seules celles que tu approuves s'affichent. */
export function BridgeReview({ onExit }: { onExit: () => void }) {
  const [data, setData] = useState<any>(null);
  const [busy, setBusy] = useState(false);
  const load = () => api.get('/v1/bridges/review?limit=15').then(setData);
  useEffect(() => {
    load().catch(() => undefined);
  }, []);
  if (!data) return <p aria-busy="true">Chargement…</p>;
  const decide = async (id: string, version: number, decision: 'approved' | 'rejected') => {
    setBusy(true);
    try {
      await api.post(`/v1/bridges/${id}/review`, { decision, version });
      setData({ ...data, items: data.items.filter((x: any) => x.id !== id), total_pending: data.total_pending - 1, [decision === 'approved' ? 'approved' : 'rejected']: data[decision === 'approved' ? 'approved' : 'rejected'] + 1 });
      if (data.items.length <= 1) await load();
    } finally {
      setBusy(false);
    }
  };
  return (
    <section className="stack">
      <div className="card">
        <p className="eyebrow">À valider · mots venus du français</p>
        <h2>🇫🇷 → 🇷🇺 Emprunts au français</h2>
        <p className="small">
          Le russe a emprunté des centaines de mots au français. Approuve ceux qui t’aident : ils apparaîtront comme comparaison dans les leçons et le dictionnaire.
          Source : Wiktionary (CC BY-SA 4.0). Rien n’est affiché sans ton accord.
        </p>
        <p className="small muted">{data.approved} approuvé(s) · {data.rejected} rejeté(s) · {data.total_pending} en attente</p>
        <button type="button" className="btn btn-ghost btn-small" onClick={onExit}>Terminer</button>
      </div>
      {data.items.map((b: any) => (
        <article key={b.id} className="card review-card">
          <div className="review-pair">
            <span className="review-fr">{b.source_expression}</span>
            <span className="review-arrow" aria-hidden="true">→</span>
            <span className="big-word-sm"><RuWord text={b.russian_expression} /></span>
            <SpeakIcon text={b.russian_expression} rate={1} />
          </div>
          {b.in_lessons && <span className="tag">dans tes leçons</span>}
          <p className="small">{b.explanation_fr}</p>
          <p className="small muted">{b.limitations_fr}</p>
          <div className="actions">
            <button type="button" className="btn btn-primary" disabled={busy} onClick={() => decide(b.id, b.version, 'approved')}>✓ Utile</button>
            <button type="button" className="btn btn-ghost" disabled={busy} onClick={() => decide(b.id, b.version, 'rejected')}>✗ Ne pas afficher</button>
          </div>
        </article>
      ))}
      {data.items.length === 0 && <p className="card">Tout est validé pour l’instant. 🎉</p>}
    </section>
  );
}

/** Phrases réelles (Tatoeba) composées uniquement de mots appris : lire, deviner, vérifier. */
export function RealSentences({ onExit, rate }: { onExit: () => void; rate: number }) {
  const [data, setData] = useState<any>(null);
  const [shown, setShown] = useState<Set<number>>(new Set());
  useEffect(() => {
    api.get('/v1/reading/sentences?limit=25').then(setData).catch(() => undefined);
  }, []);
  if (!data) return <p aria-busy="true">Chargement…</p>;
  return (
    <section className="stack">
      <div className="card">
        <p className="eyebrow">Lecture</p>
        <h2>📖 Phrases réelles</h2>
        <p className="small">{data.note_fr} Lis la phrase, devine le sens, puis touche-la pour vérifier.</p>
        <button type="button" className="btn btn-ghost btn-small" onClick={onExit}>Retour</button>
      </div>
      <ol className="sentences">
        {data.sentences.map((s: any) => (
          <li key={s.id} className="card sentence">
            <button type="button" className="sentence-btn" onClick={() => setShown(new Set([...shown, s.id]))} aria-expanded={shown.has(s.id)}>
              <span className="ru sentence-ru">{s.ru}</span>
              {shown.has(s.id) ? <span className="sentence-fr">{s.fr}</span> : <span className="tiny-muted">toucher pour voir la traduction</span>}
            </button>
            <SpeakIcon text={s.ru} rate={rate} />
            {shown.has(s.id) && <div className="tiny-muted">{s.attribution}</div>}
          </li>
        ))}
      </ol>
    </section>
  );
}

/** Cartes d'accès (accueil). */
export function ExtrasCards({ onReview, onReading }: { onReview: () => void; onReading: () => void }) {
  const [pending, setPending] = useState<number | null>(null);
  const [readable, setReadable] = useState<number | null>(null);
  useEffect(() => {
    api.get('/v1/bridges/review?limit=1').then((d) => setPending(d.total_pending)).catch(() => undefined);
    api.get('/v1/reading/sentences?limit=60').then((d) => setReadable(d.sentences.length)).catch(() => undefined);
  }, []);
  if (!pending && !readable) return null;
  return (
    <section className="card extras">
      {readable !== null && readable > 0 && (
        <button type="button" className="btn btn-ghost extra-btn" onClick={onReading}>📖 Lire {readable} phrase(s) réelle(s) avec tes mots</button>
      )}
      {pending !== null && pending > 0 && (
        <button type="button" className="btn btn-ghost extra-btn" onClick={onReview}>🇫🇷 Mots venus du français : {pending} à valider</button>
      )}
    </section>
  );
}
