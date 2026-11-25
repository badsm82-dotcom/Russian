import { useEffect, useState } from 'react';
import { api } from './api';

export function AssessmentPlayer({ onExit }: { onExit: () => void }) {
  const [run, setRun] = useState<any>(null);
  const [i, setI] = useState(0);
  const [text, setText] = useState('');
  const [answered, setAnswered] = useState<Set<number>>(new Set());
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [started, setStarted] = useState(false);

  useEffect(() => {
    api
      .post('/v1/assessments/alphabet/start')
      .then((r) => {
        setRun(r.run);
        const done = new Set<number>(r.run.answered);
        setAnswered(done);
        const firstOpen = r.run.tasks.findIndex((t: any) => !done.has(t.index));
        setI(firstOpen < 0 ? r.run.tasks.length : firstOpen);
        if (r.resumed) setStarted(true);
      })
      .catch((e) => setError(e.message));
  }, []);

  if (error) return <section className="card"><p className="warn">{error}</p><button className="btn" onClick={onExit}>Retour</button></section>;
  if (!run) return <p aria-busy="true">Préparation du bilan…</p>;

  const submit = async () => {
    setBusy(true);
    try {
      const r = await api.post(`/v1/assessments/runs/${run.id}/submit`);
      setRun(r.run);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  if (run.state === 'submitted') {
    const res = run.result;
    const wrong = res.items.filter((x: any) => !x.correct);
    return (
      <section className="card">
        <h2>{res.passed ? '🎉 Bilan réussi' : 'Bilan : pas encore'}</h2>
        {res.parts.map((p: any) => (
          <div key={p.part} className="goal-bar">
            <div className="goal-bar-label small"><span>{p.label_fr} (objectif {Math.round(p.threshold * 100)} %)</span><span>{p.correct} / {p.total} · {Math.round(p.rate * 100)} % {p.passed ? '✓' : '✗'}</span></div>
            <div className="unit-progress threshold" style={{ ['--th' as string]: `${p.threshold * 100}%` }}><div style={{ width: `${Math.round(p.rate * 100)}%` }} /></div>
          </div>
        ))}
        <p>{res.recommendation_fr}</p>
        {res.letters_to_review.length > 0 && (
          <p>Lettres à revoir : {res.letters_to_review.map((l: string) => <span key={l} className="letter-chip ru">{l.toUpperCase()}{l}</span>)}</p>
        )}
        {wrong.length > 0 && (
          <>
            <h3>Corrigé de tes erreurs</h3>
            <ul className="review-list">
              {wrong.map((x: any) => {
                const t = run.tasks[x.index];
                return (
                  <li key={x.index}>
                    <span className="ru review-stim">{t.exercise.stimulus.ru}</span>
                    <span className="small"> — ta réponse : <span className="diff-bad">{x.given || '(vide)'}</span> · attendu : <strong>{x.expected}</strong></span>
                    {x.explanation_fr && <div className="small muted">{x.explanation_fr}</div>}
                  </li>
                );
              })}
            </ul>
          </>
        )}
        <button type="button" className="btn btn-primary" onClick={onExit}>Retour à l’accueil</button>
      </section>
    );
  }

  if (!started) {
    return (
      <section className="card">
        <p className="eyebrow">Bilan sans aide</p>
        <h2>{run.title_fr}</h2>
        <p>{run.intro_fr}</p>
        <ul className="small">
          <li>Pas d’indice, pas d’audio, pas de comparaison : c’est voulu, on mesure ce que tu sais seul.</li>
          <li>Tu peux t’arrêter et reprendre plus tard : tes réponses sont gardées.</li>
          <li>Ce n’est pas un examen : le résultat sert à ajuster la suite.</li>
        </ul>
        <div className="actions">
          <button type="button" className="btn btn-primary" onClick={() => setStarted(true)}>Commencer</button>
          <button type="button" className="btn btn-ghost" onClick={onExit}>Plus tard</button>
        </div>
      </section>
    );
  }

  const total = run.tasks.length;
  if (i >= total) {
    const missing = total - answered.size;
    return (
      <section className="card">
        <h2>Prêt à remettre ?</h2>
        <p>{answered.size} / {total} réponses enregistrées.{missing > 0 ? ` ${missing} question(s) sans réponse compteront comme fausses.` : ''}</p>
        <div className="actions">
          <button type="button" className="btn btn-primary" disabled={busy} onClick={submit}>Remettre et voir mon résultat</button>
          {missing > 0 && <button type="button" className="btn btn-ghost" onClick={() => setI(run.tasks.findIndex((t: any) => !answered.has(t.index)))}>Revenir aux questions</button>}
        </div>
      </section>
    );
  }

  const t = run.tasks[i];
  const ex = t.exercise;
  const save = async (answer: any) => {
    setBusy(true);
    setError(null);
    try {
      await api.post(`/v1/assessments/runs/${run.id}/answers`, { task_index: t.index, answer });
      setAnswered(new Set([...answered, t.index]));
      setText('');
      setI(i + 1);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };
  return (
    <section>
      <div className="session-bar">
        <div className="progress" role="progressbar" aria-valuemin={0} aria-valuemax={total} aria-valuenow={i} aria-label="Progression du bilan"><div style={{ width: `${Math.round((i / total) * 100)}%` }} /></div>
        <span className="small muted">{i + 1} / {total}</span>
        <button type="button" className="btn btn-ghost btn-small" onClick={onExit}>Pause</button>
      </div>
      <article className="card">
        <p className="eyebrow">{t.part === 'recognition' ? 'Partie 1 · Lettres' : 'Partie 2 · Mots jamais vus'}</p>
        <h2 className="prompt">{ex.prompt_fr}</h2>
        <p className="stimulus"><span className={`ru ${t.part === 'recognition' ? 'big' : 'big-word'}`} lang="ru">{ex.stimulus.ru}</span></p>
        {ex.input === 'choice' ? (
          <div className="choices">
            {ex.choices.map((c: any) => (
              <button key={c.id} type="button" className="btn choice" disabled={busy} onClick={() => save({ choice_id: c.id })}>{c.label}</button>
            ))}
          </div>
        ) : (
          <form onSubmit={(e) => { e.preventDefault(); if (text.trim()) save({ text }); }}>
            <label className="sr-only" htmlFor="exam-answer">Ta réponse</label>
            <input id="exam-answer" className="input" autoComplete="off" autoCapitalize="off" spellCheck={false} value={text} onChange={(e) => setText(e.target.value)} placeholder="en lettres latines…" />
            <div className="actions"><button type="submit" className="btn btn-primary" disabled={busy || !text.trim()}>Valider</button></div>
          </form>
        )}
        <div className="row secondary-actions">
          <button type="button" className="btn btn-ghost btn-small" disabled={busy} onClick={() => save({ dont_know: true })}>Je ne sais pas</button>
        </div>
        {error && <p className="warn" role="alert">{error}</p>}
      </article>
    </section>
  );
}
