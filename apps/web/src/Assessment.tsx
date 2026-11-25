import { useEffect, useState } from 'react';
import { api } from './api';

/** Carte d'accès au bilan (accueil / progrès). */
export function AssessmentCard({ onStart }: { onStart: () => void }) {
  const [info, setInfo] = useState<any>(null);
  useEffect(() => {
    api.get('/v1/assessments').then(setInfo).catch(() => undefined);
  }, []);
  const a = info?.available?.[0];
  if (!a) return null;
  const last = info.runs.find((r: any) => r.assessment_id === a.id && r.state === 'submitted');
  return (
    <section className="card assessment-card">
      <p className="eyebrow">Bilan</p>
      <h3>{a.title_fr}</h3>
      {a.passed ? (
        <p className="ok-text">✓ Réussi. Tu peux le repasser quand tu veux (il sera différent).</p>
      ) : last ? (
        <p className="small">Dernier essai : {last.parts?.map((p: any) => `${p.label_fr} ${Math.round(p.rate * 100)} %`).join(' · ')} — pas encore atteint.</p>
      ) : (
        <p className="small">20 lettres et 10 mots jamais vus, sans aide. Environ 10 minutes.</p>
      )}
      {a.ready ? (
        <button type="button" className="btn btn-primary" onClick={onStart}>{a.passed ? 'Repasser le bilan' : 'Passer le bilan'}</button>
      ) : (
        <p className="small muted">{a.requirement_fr}</p>
      )}
    </section>
  );
}

