import { useEffect, useMemo, useRef, useState } from 'react';
import { api, ApiError, sendAttempt, uuid } from './api';
import { CyrillicKeyboard } from './Keyboard';
import { ruVoiceAvailable, speakRu, stripStress } from './speech';

type Step = any;
type Session = any;

const RATES = [0.75, 0.9, 1, 1.15] as const;

function Ru({ text, stress, className = '' }: { text: string; stress: boolean; className?: string }) {
  return (
    <span className={`ru ${className}`} lang="ru">
      {stress ? text : stripStress(text)}
    </span>
  );
}

function AudioButton({ text, rate, label = 'Écouter' }: { text: string; rate: number; label?: string }) {
  const [unavailable, setUnavailable] = useState(!ruVoiceAvailable());
  return (
    <span className="audio">
      <button type="button" className="btn btn-ghost" onClick={() => setUnavailable(!speakRu(text, rate))}>
        🔊 {label}
      </button>
      <button type="button" className="btn btn-ghost btn-small" onClick={() => setUnavailable(!speakRu(text, 0.75))} aria-label="Écouter plus lentement">
        🐢 Plus lentement
      </button>
      {unavailable && <span className="muted small">Aucune voix russe dans ce navigateur : lis la translittération et reviens à l’audio plus tard.</span>}
    </span>
  );
}

function BridgePanel({ conceptId, context, sessionId, stepIndex }: { conceptId: string; context: 'lesson' | 'exercise'; sessionId: string; stepIndex: number }) {
  const [state, setState] = useState<{ bridge: any; has_more: boolean; message_fr?: string; bridge_attempt_id?: string } | null>(null);
  const [offset, setOffset] = useState(0);
  const [feedback, setFeedback] = useState<boolean | null>(null);
  const load = async (o: number) => {
    const q = new URLSearchParams({ context, offset: String(o), session_id: sessionId, step_index: String(stepIndex) });
    setState(await api.get(`/v1/concepts/${encodeURIComponent(conceptId)}/bridges?${q}`));
    setOffset(o);
    setFeedback(null);
  };
  if (!state)
    return (
      <button type="button" className="btn btn-ghost" onClick={() => load(0)}>
        🔗 Faire le lien avec une langue que je connais{context === 'exercise' ? ' (compte comme aide)' : ''}
      </button>
    );
  if (!state.bridge) return <p className="muted small">{state.message_fr}</p>;
  const b = state.bridge;
  return (
    <div className="bridge" aria-live="polite">
      <div className="bridge-head">
        <span className="tag">{b.bridge_type_label_fr}</span> <span className="muted small">{b.source_language_name_fr}</span>
      </div>
      <p>
        <strong>{b.source_expression}</strong> ↔ <Ru text={b.russian_expression} stress />
      </p>
      <p>{b.explanation_fr}</p>
      <p className="small muted">Limites : {b.limitations_fr}</p>
      <div className="row">
        {feedback === null ? (
          <>
            <span className="small">Utile ?</span>
            {[true, false].map((h) => (
              <button key={String(h)} type="button" className="btn btn-ghost btn-small" onClick={async () => {
                await api.post(`/v1/bridges/${b.id}/feedback`, { helpful: h, bridge_attempt_id: state.bridge_attempt_id });
                setFeedback(h);
              }}>
                {h ? 'Oui' : 'Non'}
              </button>
            ))}
          </>
        ) : (
          <span className="small muted">Merci, c’est noté.</span>
        )}
        {state.has_more && (
          <button type="button" className="btn btn-ghost btn-small" onClick={() => load(offset + 1)}>
            Autre comparaison
          </button>
        )}
      </div>
    </div>
  );
}

function TeachCard({ step, session, onDone }: { step: Step; session: Session; onDone: () => void }) {
  const c = step.card;
  const s = session.settings;
  const [busy, setBusy] = useState(false);
  if (!c) return <p>Contenu indisponible.</p>;
  return (
    <article className="card teach">
      <p className="eyebrow">{step.alternative_explanation ? 'Autre explication' : step.kind === 'teach' && c.item_type === 'letter' ? 'Nouvelle lettre' : 'Nouvelle expression'}</p>
      {c.item_type === 'letter' ? (
        <div className="letter-pair" aria-label={`Majuscule ${c.ru_upper}, minuscule ${c.ru_lower}`}>
          <span className="ru big">{c.ru_upper}</span>
          <span className="ru big">{c.ru_lower}</span>
        </div>
      ) : (
        <h2>
          <Ru text={c.ru} stress={s.show_stress_marks} className="big-word" />
        </h2>
      )}
      {step.show_transliteration && c.item_type !== 'letter' && <p className="translit">≈ {c.translit_fr}</p>}
      <p className="meaning">{c.fr}</p>
      <p>{step.alternative_explanation ? c.alternative_explanation_fr : c.explanation_fr}</p>
      {c.warnings_fr.map((w: string) => (
        <p key={w} className="warn small">⚠️ {w}</p>
      ))}
      <AudioButton text={c.audio_text} rate={s.audio_rate} />
      {c.examples.length > 0 && (
        <ul className="examples">
          {c.examples.map((e: any) => (
            <li key={e.ru}>
              <Ru text={e.ru} stress={s.show_stress_marks} /> {step.show_transliteration && <span className="translit">≈ {e.translit_fr}</span>} — {e.fr}
              <button type="button" className="btn btn-ghost btn-small" onClick={() => speakRu(e.ru, s.audio_rate)} aria-label={`Écouter ${stripStress(e.ru)}`}>
                🔊
              </button>
            </li>
          ))}
        </ul>
      )}
      {s.bridges_enabled && <BridgePanel conceptId={c.item_id} context="lesson" sessionId={session.id} stepIndex={step.index} />}
      <div className="actions">
        <button type="button" className="btn btn-primary" disabled={busy} onClick={async () => { setBusy(true); try { await onDone(); } finally { setBusy(false); } }}>
          J’ai compris, continuer
        </button>
      </div>
    </article>
  );
}

function SpeakCard({ step, session, onDone }: { step: Step; session: Session; onDone: () => void }) {
  const c = step.card;
  return (
    <article className="card">
      <p className="eyebrow">À toi de parler</p>
      <h2>
        <Ru text={c?.ru ?? ''} stress={session.settings.show_stress_marks} className="big-word" />
      </h2>
      {step.show_transliteration && <p className="translit">≈ {c?.translit_fr}</p>}
      <p>Écoute, puis répète à voix haute deux ou trois fois. Aucun micro n’est nécessaire : cette répétition n’est pas notée.</p>
      <AudioButton text={c?.audio_text ?? ''} rate={session.settings.audio_rate} />
      <div className="actions">
        <button type="button" className="btn btn-primary" onClick={onDone}>
          C’est fait
        </button>
      </div>
    </article>
  );
}

const KB_HELP_KEY = 'r365.kbHelpSeen';

function ExerciseCard({ step, session, onAnswered, onNext }: { step: Step; session: Session; onAnswered: (r: any) => void; onNext: () => void }) {
  const ex = step.exercise;
  const s = session.settings;
  const [text, setText] = useState('');
  const [result, setResult] = useState<any>(null);
  const [hint, setHint] = useState<string | null>(null);
  const [showKb, setShowKb] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [retype, setRetype] = useState('');
  const [kbHelp, setKbHelp] = useState(() => {
    try {
      return !localStorage.getItem(KB_HELP_KEY);
    } catch {
      return true;
    }
  });
  const started = useRef(Date.now());
  const inputRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    started.current = Date.now();
  }, [step.index]);

  const audioBefore = ex.type === 'listening' || ex.type === 'dictation';
  const showText = ex.stimulus.ru && ex.stimulus.show_text_before_answer !== false;
  const voice = ruVoiceAvailable();

  async function submit(answer: any, extra: Partial<{ mode: 'audio_unavailable'; abandoned: boolean }> = {}) {
    setBusy(true);
    setError(null);
    try {
      const r = await sendAttempt(session.id, {
        client_attempt_id: uuid(),
        exercise_id: ex.id,
        step_index: step.index,
        answer,
        assisted: hint !== null,
        duration_ms: Date.now() - started.current,
        occurred_at: new Date().toISOString(),
        ...extra,
      });
      if (r.outcome === 'unscorable') {
        setError(r.feedback_fr);
        return;
      }
      setResult(r);
      onAnswered(r);
      if (r.outcome === 'abandoned') onNext();
    } catch (e) {
      setError(e instanceof ApiError && e.status === 0 ? 'Hors ligne : ta réponse est gardée et sera envoyée à la reconnexion.' : (e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  const insert = (ch: string) => {
    setText((t) => t + ch);
    inputRef.current?.focus();
  };

  return (
    <article className="card">
      <p className="eyebrow">{step.purpose === 'review' ? 'Révision' : step.purpose === 'remediation' ? 'On réessaie' : step.purpose === 'transfer' ? 'Mot inédit' : 'Exercice'}</p>
      <h2 className="prompt">{ex.prompt_fr}</h2>
      {showText && (
        <p className="stimulus">
          <Ru text={ex.stimulus.ru} stress={s.show_stress_marks} className="big-word" />
        </p>
      )}
      {!showText && ex.stimulus.fr && !ex.prompt_fr.includes(ex.stimulus.fr) && <p className="stimulus-fr">{ex.stimulus.fr}</p>}
      {audioBefore && ex.stimulus.audio_text && (
        <div>
          <AudioButton text={ex.stimulus.audio_text} rate={s.audio_rate} />
          {!voice && !result && (
            <button type="button" className="btn btn-ghost btn-small" onClick={() => submit({}, { mode: 'audio_unavailable' })}>
              Passer (audio indisponible, sans effet sur la progression)
            </button>
          )}
        </div>
      )}

      {!result && ex.input === 'choice' && (
        <div className="choices" role="group" aria-label="Choix de réponse">
          {ex.choices.map((c: any) => (
            <button key={c.id} type="button" className={`btn choice${c.ru ? ' ru big-choice' : ''}`} disabled={busy} onClick={() => submit({ choice_id: c.id })}>
              {c.label}
            </button>
          ))}
        </div>
      )}

      {!result && ex.input !== 'choice' && (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (text.trim()) submit({ text });
          }}
        >
          {ex.input === 'cyrillic' && kbHelp && (
            <div className="info small">
              <strong>Écrire en russe :</strong> touche « Clavier russe » pour afficher les lettres cyrilliques à l’écran. Tu peux aussi activer une disposition russe sur ton appareil. Les accents (´) ne sont jamais nécessaires et е peut remplacer ё.
              <button type="button" className="btn btn-ghost btn-small" onClick={() => { setKbHelp(false); setShowKb(true); try { localStorage.setItem(KB_HELP_KEY, '1'); } catch { /* ignore */ } }}>
                Compris
              </button>
            </div>
          )}
          <label className="sr-only" htmlFor="answer">Ta réponse</label>
          <input
            id="answer"
            ref={inputRef}
            className={`input ${ex.input === 'cyrillic' ? 'ru' : ''}`}
            lang={ex.input === 'cyrillic' ? 'ru' : 'fr'}
            autoComplete="off"
            autoCapitalize="off"
            spellCheck={false}
            value={text}
            placeholder={ex.input === 'cyrillic' ? 'en cyrillique…' : 'en lettres latines…'}
            onChange={(e) => setText(e.target.value)}
          />
          {ex.input === 'cyrillic' && (
            <button type="button" className="btn btn-ghost btn-small" aria-expanded={showKb} onClick={() => setShowKb(!showKb)}>
              ⌨️ Clavier russe
            </button>
          )}
          {showKb && ex.input === 'cyrillic' && <CyrillicKeyboard onKey={insert} onBackspace={() => setText((t) => [...t].slice(0, -1).join(''))} />}
          <div className="actions">
            <button type="submit" className="btn btn-primary" disabled={busy || !text.trim()}>
              Valider
            </button>
          </div>
        </form>
      )}

      {error && <p className="warn" role="alert">{error}</p>}
      {hint && <p className="info small">💡 {hint} <span className="muted">(réponse comptée « avec aide »)</span></p>}

      {!result && (
        <div className="row secondary-actions">
          {!hint && ex.hints?.length > 0 && (
            <button type="button" className="btn btn-ghost btn-small" onClick={async () => setHint((await api.post(`/v1/sessions/${session.id}/steps/${step.index}/hint`)).hint_fr)}>
              Indice
            </button>
          )}
          <button type="button" className="btn btn-ghost btn-small" disabled={busy} onClick={() => submit({ dont_know: true })}>
            Je ne sais pas
          </button>
          {s.bridges_enabled && <BridgePanel conceptId={step.item_id} context="exercise" sessionId={session.id} stepIndex={step.index} />}
        </div>
      )}

      {result && (
        <div className={`feedback ${result.accepted ? 'ok' : 'ko'}`} role="status" aria-live="polite">
          <p className="feedback-title">{result.accepted ? '✓ ' : '✗ '}{result.feedback_fr}</p>
          {!result.accepted && result.expected && (
            <p>
              Réponse attendue : <strong className={/[а-яё]/i.test(result.expected) ? 'ru' : ''}>{result.expected}</strong>
            </p>
          )}
          {result.explanation_fr && <p className="small">{result.explanation_fr}</p>}
          {ex.stimulus.audio_text && !audioBefore && <AudioButton text={ex.stimulus.audio_text} rate={s.audio_rate} label="Écouter le mot" />}
          {!result.accepted && ex.input === 'cyrillic' && result.expected && (
            <label className="small block">
              Recopie la bonne réponse une fois (non noté) :
              <input className="input ru" lang="ru" value={retype} onChange={(e) => setRetype(e.target.value)} />
              {stripStress(retype).trim().toLowerCase() === stripStress(result.expected).trim().toLowerCase() && <span className="ok-text"> ✓</span>}
            </label>
          )}
          <div className="actions">
            <button type="button" className="btn btn-primary" autoFocus onClick={onNext}>
              Continuer
            </button>
          </div>
        </div>
      )}
    </article>
  );
}

export function SessionPlayer({ sessionId, onExit }: { sessionId: string; onExit: (summary?: any) => void }) {
  const [session, setSession] = useState<Session | null>(null);
  const [view, setView] = useState(0);
  const [summary, setSummary] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const reload = async () => {
    const r = await api.get(`/v1/sessions/${sessionId}`);
    setSession(r.session);
    return r.session;
  };
  useEffect(() => {
    reload()
      .then((s) => setView(s.cursor))
      .catch((e) => setError(e.message));
  }, [sessionId]);

  const total = session?.steps.length ?? 0;
  const progress = useMemo(() => (total ? Math.round((Math.min(view, total) / total) * 100) : 0), [view, total]);

  const ended = !!session && view >= total;
  useEffect(() => {
    if (!ended || summary) return;
    api
      .post(`/v1/sessions/${sessionId}/complete`)
      .then((r) => setSummary(r.summary))
      .catch((e) => setError(e.message));
  }, [ended, summary, sessionId]);

  if (error) return <p className="warn">{error}</p>;
  if (!session) return <p aria-busy="true">Chargement de la séance…</p>;

  if (summary || ended) {
    if (!summary) return <p aria-busy="true">Bilan…</p>;
    return (
      <section className="card">
        <h2>Séance terminée 🎉</h2>
        <ul className="stats-list">
          <li><strong>{summary.correct_autonomous}</strong> réussites sans aide</li>
          <li><strong>{summary.correct_assisted}</strong> réussites avec aide</li>
          <li><strong>{summary.incorrect}</strong> à revoir (elles reviendront au bon moment)</li>
          <li><strong>{Math.round(summary.active_seconds / 60)}</strong> min de réponses actives</li>
        </ul>
        {session.explanations.map((e: any) => (
          <p key={e.code} className="small muted">{e.message_fr}</p>
        ))}
        <button type="button" className="btn btn-primary" onClick={() => onExit(summary)}>
          Retour à l’accueil
        </button>
      </section>
    );
  }

  const step = session.steps[view];
  const ack = async () => {
    await api.post(`/v1/sessions/${sessionId}/steps/${step.index}/ack`);
    const s = await reload();
    setView(s.cursor);
  };
  const next = async () => {
    const s = await reload();
    setView(Math.max(view + 1, s.cursor));
  };

  return (
    <section aria-labelledby="session-title">
      <div className="session-bar">
        <h1 id="session-title" className="sr-only">Séance</h1>
        <div className="progress" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={progress} aria-label="Progression de la séance">
          <div style={{ width: `${progress}%` }} />
        </div>
        <span className="small muted">{Math.min(view + 1, total)} / {total}</span>
        <button type="button" className="btn btn-ghost btn-small" onClick={() => onExit()}>
          Interrompre (reprise possible)
        </button>
      </div>
      {view === 0 && session.explanations.length > 0 && (
        <div className="info small">
          {session.explanations.map((e: any) => (
            <p key={e.code}>{e.message_fr}</p>
          ))}
        </div>
      )}
      {step.kind === 'teach' && <TeachCard key={step.index} step={step} session={session} onDone={ack} />}
      {step.kind === 'speak' && <SpeakCard key={step.index} step={step} session={session} onDone={ack} />}
      {step.kind === 'exercise' && <ExerciseCard key={step.index} step={step} session={session} onAnswered={() => undefined} onNext={next} />}
      {step.kind === 'unavailable' && (
        <div className="card">
          <p>Exercice retiré du contenu.</p>
          <button type="button" className="btn" onClick={() => setView(view + 1)}>Continuer</button>
        </div>
      )}
      <div className="rates small muted">
        Vitesse audio : {RATES.join(' / ')} (réglages) · Synthèse vocale du navigateur, non validée — un audio natif fera référence.
      </div>
    </section>
  );
}
