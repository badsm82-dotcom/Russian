import { useEffect, useMemo, useRef, useState } from 'react';
import { api, ApiError, sendAttempt, uuid, type AttemptPayload } from './api';
import { cachedSession, cacheSession, enqueue, flushOps, gradeOffline, isNetworkError, updateCachedCursor } from './offline';
import { CyrillicKeyboard } from './Keyboard';
import { ruVoiceAvailable, stripStress } from './speech';
import { AudioButton, SpeakIcon } from './Audio';
import { AnswerDiff, CardTableView, LatinTrap, LetterBadge, RuWord, StressLegend } from './visual';

type Step = any;
type Session = any;

const RATES = [0.75, 0.9, 1, 1.15] as const;

function Ru({ text, stress, className = '', reduce = false, highlight }: { text: string; stress: boolean; className?: string; reduce?: boolean; highlight?: string }) {
  return <RuWord text={text} stress={stress} className={className} reduce={reduce} highlight={highlight} />;
}

function BridgePanel({ conceptId, context, sessionId, stepIndex }: { conceptId: string; context: 'lesson' | 'exercise'; sessionId: string; stepIndex: number }) {
  const [state, setState] = useState<{ bridge: any; has_more: boolean; message_fr?: string; bridge_attempt_id?: string } | null>(null);
  const [offset, setOffset] = useState(0);
  const [feedback, setFeedback] = useState<boolean | null>(null);
  const load = async (o: number) => {
    const q = new URLSearchParams({ context, offset: String(o), session_id: sessionId, step_index: String(stepIndex) });
    try {
      setState(await api.get(`/v1/concepts/${encodeURIComponent(conceptId)}/bridges?${q}`));
    } catch {
      setState({ bridge: null, has_more: false, message_fr: 'Comparaisons indisponibles hors ligne.' });
    }
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
        <>
          <div className={`letter-pair lc-${c.letter_class?.key ?? ''}`} aria-label={`Majuscule ${c.ru_upper}, minuscule ${c.ru_lower}`}>
            <span className="ru big">{c.ru_upper}</span>
            <span className="ru big">{c.ru_lower}</span>
          </div>
          <LetterBadge cls={c.letter_class} />
          <LatinTrap cyr={c.ru_upper} latin={c.latin_lookalike} />
        </>
      ) : (
        <div className="word-head">
          {c.emoji && <span className="emoji-big" aria-hidden="true">{c.emoji}</span>}
          <h2>
            <Ru text={c.ru} stress={s.show_stress_marks} reduce className="big-word" />
          </h2>
        </div>
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
              <Ru text={e.ru} stress={s.show_stress_marks} reduce highlight={c.item_type === 'letter' ? c.ru_lower : undefined} /> {step.show_transliteration && <span className="translit">≈ {e.translit_fr}</span>} — {e.fr}
              <SpeakIcon text={e.ru} rate={s.audio_rate} label={`Écouter ${stripStress(e.ru)}`} />
            </li>
          ))}
        </ul>
      )}
      <CardTableView table={c.table} />
      {s.show_stress_marks && c.item_type !== 'letter' && <StressLegend reduce={/[оО]/.test(c.ru)} />}
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
      <div className="word-head">
        {c?.emoji && <span className="emoji-big" aria-hidden="true">{c.emoji}</span>}
        <h2>
          <Ru text={c?.ru ?? ''} stress={session.settings.show_stress_marks} reduce className="big-word" />
        </h2>
      </div>
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

/** Choix « où est l'accent ? » : la voyelle en majuscule est affichée en couleur, en minuscule. */
function StressChoice({ label }: { label: string }) {
  return (
    <span className="ru">
      {[...label].map((ch, i) => {
        const up = ch !== ch.toLocaleLowerCase('ru');
        return up ? <span key={i} className="stress">{ch.toLocaleLowerCase('ru')}</span> : <span key={i}>{ch}</span>;
      })}
    </span>
  );
}

interface OfflineHooks {
  /** Définition complète de l'exercice (paquet hors ligne), si disponible. */
  exercise: (id: string) => any | undefined;
  /** Enregistre une tentative à envoyer plus tard. */
  queue: (payload: AttemptPayload) => Promise<void>;
  goOffline: () => void;
}

function ExerciseCard({ step, session, onAnswered, onNext, offline }: { step: Step; session: Session; onAnswered: (r: any) => void; onNext: () => void; offline: OfflineHooks }) {
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

  const audioBefore = ex.type === 'listening' || ex.type === 'dictation' || ex.type === 'stress';
  const showText = ex.stimulus.ru && ex.stimulus.show_text_before_answer !== false;
  const voice = ruVoiceAvailable();

  async function submit(answer: any, extra: Partial<{ mode: 'audio_unavailable'; abandoned: boolean }> = {}) {
    setBusy(true);
    setError(null);
    const payload: AttemptPayload = {
      client_attempt_id: uuid(),
      exercise_id: ex.id,
      step_index: step.index,
      answer,
      assisted: hint !== null,
      duration_ms: Date.now() - started.current,
      occurred_at: new Date().toISOString(),
      ...extra,
    };
    try {
      let r: any;
      try {
        r = await sendAttempt(session.id, payload);
      } catch (e) {
        if (!isNetworkError(e)) throw e;
        // Hors ligne : correction provisoire sur l'appareil, envoi plus tard (le serveur recorrigera).
        const def = offline.exercise(ex.id);
        if (!def) throw new ApiError(0, 'network', 'Hors ligne et exercice non disponible sur l’appareil : réessaie avec du réseau.');
        offline.goOffline();
        if (extra.abandoned || extra.mode === 'audio_unavailable') {
          r = { outcome: 'abandoned', feedback_fr: 'Exercice passé.' };
        } else {
          const g = gradeOffline(def, answer, hint !== null, payload.duration_ms);
          r = { ...g, explanation_fr: g.outcome === 'incorrect' ? def.explanation_fr ?? null : null, offline: true };
        }
        if (r.outcome !== 'unscorable') await offline.queue({ ...payload, mode: extra.mode ?? 'offline' });
      }
      if (r.outcome === 'unscorable') {
        setError(r.feedback_fr);
        return;
      }
      setResult(r);
      onAnswered(r);
      if (r.outcome === 'abandoned') onNext();
    } catch (e) {
      setError((e as Error).message);
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
      <h2 className="prompt">
        {step.prompt_emoji && <span className="emoji-prompt" aria-hidden="true">{step.prompt_emoji} </span>}
        {ex.prompt_fr}
      </h2>
      {showText && (
        <p className="stimulus">
          <Ru text={ex.stimulus.ru} stress={s.show_stress_marks} className="big-word" />
        </p>
      )}
      {ex.stimulus.emoji && <p className="stimulus-emoji" aria-label="Image">{ex.stimulus.emoji}</p>}
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
              {step.choice_emojis?.[c.id] && <span className="choice-emoji" aria-hidden="true">{step.choice_emojis[c.id]}</span>}
              {ex.type === 'stress' ? <StressChoice label={c.label} /> : c.label}
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
            <button type="button" className="btn btn-ghost btn-small" onClick={async () => {
              try {
                setHint((await api.post(`/v1/sessions/${session.id}/steps/${step.index}/hint`)).hint_fr);
              } catch {
                setHint(ex.hints?.[0] ?? 'Relis la fiche de présentation.'); // hors ligne : la réponse sera envoyée « avec aide »
              }
            }}>
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
          {result.offline && <p className="small muted">Correction provisoire hors ligne : elle sera confirmée par le serveur au retour du réseau.</p>}
          {!result.accepted && result.expected && (
            <p>
              Réponse attendue : <strong className={/[а-яё]/i.test(result.expected) ? 'ru' : ''}>{result.expected}</strong>
            </p>
          )}
          {!result.accepted && ex.input === 'cyrillic' && text.trim() && result.expected && <AnswerDiff given={text} expected={result.expected} />}
          {result.explanation_fr && !String(result.feedback_fr).includes(result.explanation_fr) && <p className="small">{result.explanation_fr}</p>}
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
  const [offline, setOffline] = useState(false);
  const pack = useRef<Record<string, any>>({});
  const tally = useRef({ attempts: 0, scored: 0, correct_autonomous: 0, correct_assisted: 0, incorrect: 0, active_seconds: 0 });

  const loadCache = async () => {
    const c = await cachedSession(sessionId);
    if (!c) throw new Error('Hors ligne, et cette séance n’est pas enregistrée sur l’appareil.');
    pack.current = c.exercises;
    setSession(c.session);
    setOffline(true);
    return c.session;
  };
  const reload = async () => {
    try {
      await flushOps(); // d'abord envoyer ce qui a été fait hors ligne
      const r = await api.get(`/v1/sessions/${sessionId}`);
      setSession(r.session);
      setOffline(false);
      cacheSession(r.session)
        .then(() => cachedSession(sessionId))
        .then((c) => { if (c) pack.current = c.exercises; })
        .catch(() => undefined);
      return r.session;
    } catch (e) {
      if (!isNetworkError(e)) throw e;
      return loadCache();
    }
  };
  useEffect(() => {
    reload()
      .then((s) => setView(s.cursor))
      .catch((e) => setError(e.message));
    const back = () => reload().catch(() => undefined);
    window.addEventListener('online', back);
    return () => window.removeEventListener('online', back);
  }, [sessionId]);

  const offlineHooks: OfflineHooks = {
    exercise: (id) => pack.current[id],
    queue: (payload) => enqueue({ kind: 'attempt', session_id: sessionId, payload }),
    goOffline: () => setOffline(true),
  };
  const onAnswered = (r: any) => {
    if (!r.offline) return;
    const t = tally.current;
    t.attempts++;
    if (r.outcome === 'correct' || r.outcome === 'incorrect') t.scored++;
    if (r.grade >= 2) t.correct_autonomous++;
    else if (r.grade === 1) t.correct_assisted++;
    else if (r.outcome === 'incorrect') t.incorrect++;
  };

  const total = session?.steps.length ?? 0;
  const progress = useMemo(() => (total ? Math.round((Math.min(view, total) / total) * 100) : 0), [view, total]);

  const ended = !!session && view >= total;
  useEffect(() => {
    if (!ended || summary) return;
    api
      .post(`/v1/sessions/${sessionId}/complete`)
      .then((r) => setSummary(r.summary))
      .catch(async (e) => {
        if (!isNetworkError(e)) return setError(e.message);
        await enqueue({ kind: 'complete', session_id: sessionId });
        setSummary({ ...tally.current, offline: true });
      });
  }, [ended, summary, sessionId]);

  if (error) return <p className="warn">{error}</p>;
  if (!session) return <p aria-busy="true">Chargement de la séance…</p>;

  if (summary || ended) {
    if (!summary) return <p aria-busy="true">Bilan…</p>;
    return (
      <section className="card">
        <h2>Séance terminée 🎉</h2>
        {summary.offline && <p className="info small">Faite hors ligne : le bilan ci-dessous ne compte que les réponses de cette fois-ci. Tout sera envoyé et recorrigé au retour du réseau.</p>}
        <ul className="stats-list">
          <li><strong>{summary.correct_autonomous}</strong> réussites sans aide</li>
          <li><strong>{summary.correct_assisted}</strong> réussites avec aide</li>
          <li><strong>{summary.incorrect}</strong> à revoir (elles reviendront au bon moment)</li>
          <li><strong>{Math.round(summary.active_seconds / 60)}</strong> min de réponses actives</li>
        </ul>
        {(() => {
          const learned = session.steps.filter((x: any) => x.kind === 'teach' && x.card && !x.alternative_explanation).map((x: any) => x.card);
          if (!learned.length) return null;
          return (
            <>
              <h3>Appris aujourd’hui</h3>
              <ul className="learned">
                {learned.map((c: any) => (
                  <li key={c.item_id}>
                    <span className="learned-visual" aria-hidden="true">{c.item_type === 'letter' ? <span className="ru">{c.ru_upper}{c.ru_lower}</span> : c.emoji ?? '•'}</span>
                    {c.item_type !== 'letter' && <RuWord text={c.ru} />}
                    <span className="small muted">{c.fr}</span>
                  </li>
                ))}
              </ul>
            </>
          );
        })()}
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
  const advanceLocally = async (to: number) => {
    setSession((s: Session) => ({ ...s, cursor: Math.max(s.cursor, to) }));
    await updateCachedCursor(sessionId, to);
    setView(to);
  };
  const ack = async () => {
    if (!offline) {
      try {
        await api.post(`/v1/sessions/${sessionId}/steps/${step.index}/ack`);
        const s = await reload();
        setView(s.cursor);
        return;
      } catch (e) {
        if (!isNetworkError(e)) throw e;
        setOffline(true);
      }
    }
    await enqueue({ kind: 'ack', session_id: sessionId, index: step.index });
    await advanceLocally(step.index + 1);
  };
  const next = async () => {
    if (offline) return advanceLocally(view + 1);
    try {
      const s = await reload();
      setView(Math.max(view + 1, s.cursor));
    } catch {
      await advanceLocally(view + 1);
    }
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
      {offline && (
        <div className="info small" role="status">
          📴 Hors ligne : tes réponses sont corrigées sur l’appareil et seront envoyées dès le retour du réseau.
        </div>
      )}
      {view === 0 && session.explanations.length > 0 && (
        <div className="info small">
          {session.explanations.map((e: any) => (
            <p key={e.code}>{e.message_fr}</p>
          ))}
        </div>
      )}
      {step.kind === 'teach' && <TeachCard key={step.index} step={step} session={session} onDone={ack} />}
      {step.kind === 'speak' && <SpeakCard key={step.index} step={step} session={session} onDone={ack} />}
      {step.kind === 'exercise' && <ExerciseCard key={step.index} step={step} session={session} onAnswered={onAnswered} onNext={next} offline={offlineHooks} />}
      {step.kind === 'unavailable' && (
        <div className="card">
          <p>Exercice retiré du contenu.</p>
          <button type="button" className="btn" onClick={() => setView(view + 1)}>Continuer</button>
        </div>
      )}
      <div className="rates small muted">
        Vitesse audio : {RATES.join(' / ')} (réglages) · Audio : voix natives Lingua Libre (CC BY-SA) quand elles existent, sinon synthèse Silero (CC BY-NC-SA, usage personnel) ou voix de l’appareil — non validé par un russophone.
      </div>
    </section>
  );
}
