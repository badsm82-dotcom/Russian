import { lazy, Suspense, useEffect, useState } from 'react';
import { api, apiUrl, ApiError, auth } from './api';
import { cachedSession, cacheSession, clearLocal, currentCachedSessionId, flushOps, isNetworkError, kvGet, kvSet } from './offline';

/** Message d'erreur lisible, avec le détail de validation renvoyé par le serveur. */
function errorText(e: unknown): string {
  if (e instanceof ApiError) {
    const d = Array.isArray(e.details) ? e.details.map((x: any) => `${x.path || 'champ'} : ${x.message}`).join(' ; ') : '';
    return `${e.message}${d ? ` (${d})` : ''} [${e.status || 'réseau'}]`;
  }
  return (e as Error)?.message ?? String(e);
}
import { SessionPlayer } from './Session';
import { GoalCard, GoalPlan, useGoals } from './Goals';
import { AssessmentCard } from './Assessment';
import { ReminderButton } from './Reminder';

// Écrans secondaires chargés seulement à l'ouverture : démarrage plus léger sur le téléphone.
const DictionaryScreen = lazy(() => import('./Dictionary').then((m) => ({ default: m.DictionaryScreen })));
const BridgeReview = lazy(() => import('./Extras').then((m) => ({ default: m.BridgeReview })));
const RealSentences = lazy(() => import('./Extras').then((m) => ({ default: m.RealSentences })));
const ExtrasCards = lazy(() => import('./Extras').then((m) => ({ default: m.ExtrasCards })));
const AssessmentPlayer = lazy(() => import('./AssessmentPlayer').then((m) => ({ default: m.AssessmentPlayer })));
import { LatinTrap, LetterBadge, RuWord } from './visual';
import { SpeakIcon } from './Audio';

type Tab = 'home' | 'path' | 'alphabet' | 'dict' | 'stats' | 'settings';
const DURATIONS = [5, 15, 25, 35, 60] as const;

function applyTheme(theme: string, scale: number) {
  const root = document.documentElement;
  if (theme === 'system') root.removeAttribute('data-theme');
  else root.setAttribute('data-theme', theme);
  root.style.setProperty('--font-scale', String(scale));
}

// ---------------------------------------------------------------------------
function AuthScreen({ onAuth }: { onAuth: () => void }) {
  const [mode, setMode] = useState<'login' | 'register'>('register');
  const [registrationOpen, setRegistrationOpen] = useState(true);
  useEffect(() => {
    api
      .get('/v1/meta')
      .then((m) => {
        setRegistrationOpen(m.registration_open);
        if (!m.registration_open) setMode('login');
      })
      .catch(() => undefined);
  }, []);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  return (
    <main className="auth">
      <h1>Russian 365</h1>
      <p className="lead">Apprendre le russe en partant de zéro, avec des explications en français. Aucune connaissance préalable requise.</p>
      <form
        className="card"
        onSubmit={async (e) => {
          e.preventDefault();
          setBusy(true);
          setError(null);
          try {
            const r = await api.post(`/v1/auth/${mode}`, { email, password });
            auth.set(r.token);
            onAuth();
          } catch (err) {
            setError((err as Error).message);
          } finally {
            setBusy(false);
          }
        }}
      >
        <h2>{mode === 'register' ? 'Créer mon compte' : 'Me connecter'}</h2>
        <label className="block">
          Adresse e-mail
          <input className="input" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
        </label>
        <label className="block">
          Mot de passe (8 caractères minimum)
          <input className="input" type="password" autoComplete={mode === 'register' ? 'new-password' : 'current-password'} minLength={8} required value={password} onChange={(e) => setPassword(e.target.value)} />
        </label>
        {error && <p className="warn" role="alert">{error}</p>}
        <button className="btn btn-primary" disabled={busy}>
          {mode === 'register' ? 'Commencer' : 'Se connecter'}
        </button>
        {registrationOpen && (
          <button type="button" className="btn btn-ghost" onClick={() => setMode(mode === 'login' ? 'register' : 'login')}>
            {mode === 'login' ? 'Je n’ai pas de compte' : 'J’ai déjà un compte'}
          </button>
        )}
      </form>
    </main>
  );
}

// ---------------------------------------------------------------------------
const PROF_LABEL: Record<string, string> = { fluent: 'Courant', functional_communication: 'Compréhension et communication', A1: 'A1', A2: 'A2', B1: 'B1', B2: 'B2', C1: 'C1', C2: 'C2', native: 'Langue maternelle' };

function LanguagesEditor({ value, names, onChange }: { value: any[]; names: Record<string, string>; onChange: (v: any[]) => void }) {
  return (
    <table className="table">
      <thead>
        <tr><th>Langue</th><th>Niveau déclaré</th><th>Langue d’appui</th></tr>
      </thead>
      <tbody>
        {value.map((l, i) => (
          <tr key={l.code}>
            <td>{names[l.code] ?? l.code}</td>
            <td>
              <select className="input" value={l.proficiency} onChange={(e) => onChange(value.map((x, j) => (j === i ? { ...x, proficiency: e.target.value } : x)))} aria-label={`Niveau en ${names[l.code]}`}>
                {Object.entries(PROF_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </td>
            <td>
              <input type="checkbox" checked={l.bridges_enabled} onChange={(e) => onChange(value.map((x, j) => (j === i ? { ...x, bridges_enabled: e.target.checked } : x)))} aria-label={`Utiliser ${names[l.code]} pour les comparaisons`} />
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function Onboarding({ profile, onDone }: { profile: any; onDone: () => Promise<void> | void }) {
  const [step, setStep] = useState(0);
  const [settings, setSettings] = useState(profile.settings);
  const [languages, setLanguages] = useState(profile.languages.known_languages);
  const [themes, setThemes] = useState<string>(profile.settings.interests.join(', '));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const set = (k: string, v: unknown) => {
    const next = { ...settings, [k]: v };
    setSettings(next);
    if (k === 'theme' || k === 'font_scale') applyTheme(next.theme, next.font_scale); // aperçu immédiat
  };
  const steps = [
    <>
      <h2>Bienvenue</h2>
      <p>Tu pars de zéro : aucune lettre ni aucun mot russe n’est supposé connu. Chaque élément est d’abord présenté (son, traduction, exemple) avant d’être exercé.</p>
      <ul>
        <li>Consignes et explications en français.</li>
        <li>Pas de test de placement : on commence directement à la première leçon.</li>
        <li>Pas besoin de micro ni de clavier russe : un clavier virtuel est fourni.</li>
      </ul>
    </>,
    <>
      <h2>Tes langues</h2>
      <p className="small">Elles servent seulement à proposer, sur demande, une comparaison utile (« Faire le lien avec une langue que je connais »). Tu peux en désactiver.</p>
      <LanguagesEditor value={languages} names={profile.language_names_fr} onChange={setLanguages} />
    </>,
    <>
      <h2>Ton temps</h2>
      <label className="block">
        Durée habituelle d’une séance
        <select className="input" value={settings.daily_minutes} onChange={(e) => set('daily_minutes', Number(e.target.value))}>
          {DURATIONS.map((d) => <option key={d} value={d}>{d} min</option>)}
        </select>
      </label>
      <label className="block">
        Jours par semaine
        <input className="input" type="number" min={1} max={7} value={settings.days_per_week} onChange={(e) => set('days_per_week', Number(e.target.value))} />
      </label>
      <label className="block">
        Horaire préféré (facultatif)
        <input className="input" type="time" value={settings.preferred_time ?? ''} onChange={(e) => set('preferred_time', e.target.value || null)} />
      </label>
      <label className="block">
        Fuseau horaire
        <input className="input" value={settings.timezone} onChange={(e) => set('timezone', e.target.value)} />
      </label>
    </>,
    <>
      <h2>Thèmes et préférences</h2>
      <label className="block">
        Thèmes qui t’intéressent (séparés par des virgules)
        <textarea className="input" rows={3} value={themes} onChange={(e) => setThemes(e.target.value)} />
      </label>
      <label className="check"><input type="checkbox" checked={settings.personal_context_enabled} onChange={(e) => set('personal_context_enabled', e.target.checked)} /> Utiliser mes thèmes personnels dans les exemples</label>
      <label className="block">
        Translittération (lettres latines)
        <select className="input" value={settings.transliteration} onChange={(e) => set('transliteration', e.target.value)}>
          <option value="auto">Automatique : masquée peu à peu quand je lis bien</option>
          <option value="always">Toujours affichée</option>
          <option value="never">Jamais</option>
        </select>
      </label>
      <label className="check"><input type="checkbox" checked={settings.microphone_consent} onChange={(e) => set('microphone_consent', e.target.checked)} /> J’accepte l’usage du micro (facultatif ; l’oral n’est pas encore évalué dans cette version)</label>
      <label className="block">
        Thème d’affichage
        <select className="input" value={settings.theme} onChange={(e) => set('theme', e.target.value)}>
          <option value="system">Système</option><option value="light">Clair</option><option value="dark">Sombre</option>
        </select>
      </label>
    </>,
  ];
  const last = step === steps.length - 1;
  return (
    <main className="container">
      <div className="card">
        <p className="eyebrow">Étape {step + 1} / {steps.length}</p>
        {steps[step]}
        <div className="actions">
          {step > 0 && <button type="button" className="btn btn-ghost" onClick={() => setStep(step - 1)}>Retour</button>}
          <button
            type="button"
            className="btn btn-primary"
            disabled={busy}
            onClick={async () => {
              if (!last) return setStep(step + 1);
              setBusy(true);
              setError(null);
              try {
                await api.patch('/v1/profile/languages', { known_languages: languages });
                const interests = themes.split(',').map((t) => t.trim()).filter(Boolean);
                await api.patch('/v1/profile', { settings: pick({ ...settings, interests }), onboarded: true, consent_version: '1' });
                await onDone();
              } catch (e) {
                setError(errorText(e));
              } finally {
                setBusy(false);
              }
            }}
          >
            {busy ? 'Enregistrement…' : last ? 'Commencer la première leçon' : 'Suivant'}
          </button>
        </div>
        {error && <p className="warn" role="alert">{error}</p>}
      </div>
    </main>
  );
}

const SETTING_KEYS = ['daily_minutes', 'days_per_week', 'preferred_time', 'timezone', 'interests', 'personal_context_enabled', 'microphone_consent', 'transliteration', 'show_stress_marks', 'correction_timing', 'font_scale', 'theme', 'notifications_enabled', 'bridges_enabled', 'audio_rate', 'manual_difficulty', 'goal_start_date'];
/** Nettoie les réglages avant envoi (champs vides, heure avec secondes, bornes). */
function pick(s: any) {
  const out: any = Object.fromEntries(SETTING_KEYS.filter((k) => k in s).map((k) => [k, s[k]]));
  const days = Math.round(Number(out.days_per_week));
  out.days_per_week = Number.isFinite(days) ? Math.min(7, Math.max(1, days)) : 6;
  out.preferred_time = typeof out.preferred_time === 'string' && /^\d{2}:\d{2}/.test(out.preferred_time) ? out.preferred_time.slice(0, 5) : null;
  out.timezone = typeof out.timezone === 'string' && out.timezone.trim() ? out.timezone.trim() : 'Europe/Zurich';
  out.font_scale = Math.min(1.8, Math.max(0.8, Number(out.font_scale) || 1));
  if ('goal_start_date' in out && !/^\d{4}-\d{2}-\d{2}$/.test(String(out.goal_start_date ?? ''))) out.goal_start_date = null;
  if (Array.isArray(out.interests)) out.interests = out.interests.map((t: string) => t.trim().slice(0, 60)).filter(Boolean).slice(0, 30);
  return out;
}

// ---------------------------------------------------------------------------
function Home({ profile, onStart, onAssessment, onScreen }: { profile: any; onStart: (id: string) => void; onAssessment: () => void; onScreen: (s: 'review' | 'reading') => void }) {
  const [minutes, setMinutes] = useState<number>(profile.settings.daily_minutes);
  const [current, setCurrent] = useState<any>(null);
  const [analytics, setAnalytics] = useState<any>(null);
  const [curriculum, setCurriculum] = useState<any>(null);
  const [busy, setBusy] = useState(false);
  const [homeError, setHomeError] = useState<string | null>(null);
  const [offline, setOffline] = useState(false);
  const [prepared, setPrepared] = useState(false);
  const goals = useGoals();
  useEffect(() => {
    api
      .get('/v1/sessions/current')
      .then((r) => {
        setCurrent(r.session);
        if (r.session) cacheSession(r.session).then(() => setPrepared(true)).catch(() => undefined);
      })
      .catch(async (e) => {
        if (!isNetworkError(e)) return;
        setOffline(true);
        // Hors ligne : proposer la séance enregistrée sur l'appareil, s'il y en a une.
        const id = await currentCachedSessionId();
        const c = id ? await cachedSession(id) : undefined;
        if (c) setCurrent(c.session);
      });
    api.get('/v1/analytics').then(setAnalytics).catch(() => undefined);
    api.get('/v1/curriculum').then(setCurriculum).catch(() => undefined);
  }, []);
  /** Crée la séance et l'enregistre sur l'appareil, sans l'ouvrir (pour le métro, l'avion…). */
  const prepareOffline = async () => {
    setBusy(true);
    setHomeError(null);
    try {
      const r = await api.post('/v1/sessions', { minutes });
      await cacheSession(r.session);
      setCurrent(r.session);
      setPrepared(true);
    } catch (e) {
      setHomeError(errorText(e));
    } finally {
      setBusy(false);
    }
  };
  const unit = curriculum?.units.find((u: any) => u.current);
  return (
    <div className="grid">
      <section className="card hero">
        <h2>Ta séance du jour</h2>
        {offline && (
          <p className="info small" role="status">
            📴 Hors ligne. {current ? 'Ta séance enregistrée sur l’appareil peut continuer ; tout sera envoyé au retour du réseau.' : 'Aucune séance n’est enregistrée sur l’appareil : reconnecte-toi pour en commencer une.'}
          </p>
        )}
        {current ? (
          <>
            <p>Une séance est en cours ({current.cursor}/{current.steps.length}). Tu reprends exactement où tu t’es arrêté·e.</p>
            {prepared && !offline && <p className="small muted">✓ Disponible hors ligne sur cet appareil.</p>}
            <div className="actions">
              <button type="button" className="btn btn-primary btn-large" onClick={() => onStart(current.id)}>Reprendre ma séance</button>
              <button type="button" className="btn btn-ghost" disabled={busy} onClick={async () => { setBusy(true); try { const r = await api.post('/v1/sessions', { minutes, replace: true }); onStart(r.session.id); } catch (e) { setHomeError(errorText(e)); } finally { setBusy(false); } }}>
                Nouvelle séance
              </button>
            </div>
          </>
        ) : (
          <>
            <fieldset className="durations">
              <legend>Durée</legend>
              {DURATIONS.map((d) => (
                <label key={d} className={`pill${minutes === d ? ' on' : ''}`}>
                  <input type="radio" name="dur" className="sr-only" checked={minutes === d} onChange={() => setMinutes(d)} />
                  {d} min
                </label>
              ))}
            </fieldset>
            <button type="button" className="btn btn-primary btn-large" disabled={busy} onClick={async () => { setBusy(true); try { const r = await api.post('/v1/sessions', { minutes }); onStart(r.session.id); } catch (e) { setHomeError(errorText(e)); } finally { setBusy(false); } }}>
              Commencer ma séance
            </button>
            <button type="button" className="btn btn-ghost" disabled={busy || offline} onClick={prepareOffline}>
              📥 Préparer pour hors ligne
            </button>
          </>
        )}
        {homeError && <p className="warn" role="alert">{homeError}</p>}
        {analytics && <p className="small muted">{analytics.next_action_fr}</p>}
      </section>
      <GoalCard g={goals} />
      <Suspense fallback={null}><ExtrasCards onReview={() => onScreen('review')} onReading={() => onScreen('reading')} /></Suspense>
      <section className="card"><ReminderButton settings={profile.settings} /></section>
      <AssessmentCard onStart={onAssessment} />
      {unit && (
        <section className="card">
          <p className="eyebrow">Unité en cours · {unit.id}</p>
          <h3>{unit.title_fr}</h3>
          <p className="small">{unit.mission_fr}</p>
          <p className="small muted">{unit.items_taught} / {unit.items_total} éléments présentés</p>
        </section>
      )}
      {analytics && (
        <section className="card">
          <h3>En bref</h3>
          <ul className="stats-list">
            <li><strong>{analytics.items_due}</strong> révision(s) dues</li>
            <li><strong>{analytics.letters.taught}</strong> / 33 lettres vues · <strong>{analytics.letters.mastered}</strong> maîtrisées</li>
            <li><strong>{analytics.days_practiced}</strong> jour(s) pratiqué(s)</li>
          </ul>
          <p className="small muted">Pas de série à perdre : après une absence, on reprend en douceur.</p>
        </section>
      )}
    </div>
  );
}

function PathScreen() {
  const [c, setC] = useState<any>(null);
  useEffect(() => {
    api.get('/v1/curriculum').then(setC);
  }, []);
  if (!c) return <p aria-busy="true">Chargement…</p>;
  return (
    <div className="stack">
      <section className="card">
        <h2>Mois 1 — fondation A0</h2>
        <ol className="units">
          {c.units.map((u: any) => (
            <li key={u.id} className={u.current ? 'current' : u.locked ? 'locked' : u.completed ? 'done' : ''}>
              <span className="unit-node" aria-hidden="true">{u.completed ? '✓' : u.locked ? '🔒' : u.order}</span>
              <div className="unit-body">
                <strong>{u.id}</strong> {u.title_fr} {u.current ? <span className="tag">en cours</span> : null}
                <div className="small muted">{u.mission_fr}</div>
                {u.items_total > 0 && (
                  <div className="unit-progress" role="progressbar" aria-valuemin={0} aria-valuemax={u.items_total} aria-valuenow={u.items_taught} aria-label={`${u.items_taught} sur ${u.items_total} présentés`}>
                    <div style={{ width: `${Math.round((u.items_taught / u.items_total) * 100)}%` }} />
                  </div>
                )}
              </div>
            </li>
          ))}
        </ol>
        <p className="small muted">{c.note_fr}</p>
      </section>
      <section className="card">
        <h2>Parcours annuel indicatif</h2>
        <div className="table-wrap">
          <table className="table">
            <thead><tr><th>Mois</th><th>Contenu</th><th>Mission</th><th>Actif / réceptif</th><th>Disponible</th></tr></thead>
            <tbody>
              {c.roadmap.map((m: any) => (
                <tr key={m.month}>
                  <td>{m.month} <span className="muted small">(sem. {m.weeks})</span></td>
                  <td className="small">{m.content_fr}</td>
                  <td className="small">{m.mission_fr}</td>
                  <td>{m.active} / {m.receptive}</td>
                  <td className="small">{m.content_available === 'available' ? 'Disponible' : 'À venir'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

function AlphabetScreen({ rate }: { rate: number }) {
  const [letters, setLetters] = useState<any[] | null>(null);
  const [open, setOpen] = useState<any>(null);
  useEffect(() => {
    api.get('/v1/alphabet').then((r) => setLetters(r.letters));
  }, []);
  if (!letters) return <p aria-busy="true">Chargement…</p>;
  return (
    <div className="stack">
      <section className="card">
        <h2>Les 33 lettres</h2>
        <p className="small muted">Les approximations françaises sont signalées ; l’audio russe fait référence.</p>
        <p className="tile-legend small">
          <span className="badge badge-vowel_hard">voyelle dure</span> <span className="badge badge-vowel_soft">voyelle molle</span>{' '}
          <span className="badge badge-consonant_voiced">sonore</span> <span className="badge badge-consonant_voiceless">sourde</span>{' '}
          <span className="badge badge-consonant_sonorant">sonante</span> <span className="badge badge-sign">signe</span>
        </p>
        <div className="alphabet">
          {letters.map((l) => (
            <button key={l.lower} type="button" className={`letter-tile tile-${l.letter_class?.key ?? ''}${l.taught ? ' seen' : ''}`} onClick={() => setOpen(l)} aria-label={`${l.upper} ${l.lower}${l.taught ? ', vue' : ', pas encore vue'}`}>
              <span className="ru">{l.upper}{l.lower}</span>
              <span className="tiny">{l.taught ? (l.recognition_stage ?? 0) >= 2 ? '●●' : '●' : ''}</span>
            </button>
          ))}
        </div>
      </section>
      {open && (
        <section className="card" aria-live="polite">
          <div className={`letter-pair lc-${open.letter_class?.key ?? ''}`}><span className="ru big">{open.upper}</span><span className="ru big">{open.lower}</span></div>
          <LetterBadge cls={open.letter_class} />
          <LatinTrap cyr={open.upper} latin={open.latin_lookalike ?? undefined} />
          <p className="meaning">{open.sound_label_fr}{open.approximation ? ' (approximation)' : ''}</p>
          <p>{open.sound_fr}</p>
          {open.latin_trap_fr && <p className="warn small">⚠️ {open.latin_trap_fr}</p>}
          <ul className="examples">
            {open.examples.map((e: any) => (
              <li key={e.ru}><RuWord text={e.ru} reduce highlight={open.lower} /> — {e.fr} <SpeakIcon text={e.ru} rate={rate} /></li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

const DOMAIN_FR: Record<string, string> = {
  alphabet: 'Alphabet', reading: 'Lecture', writing: 'Écriture', listening: 'Écoute', vocabulary: 'Vocabulaire', grammar: 'Grammaire', speaking: 'Expression orale', pronunciation: 'Prononciation',
};

function StatsScreen({ onAssessment }: { onAssessment: () => void }) {
  const [a, setA] = useState<any>(null);
  const goals = useGoals();
  useEffect(() => {
    api.get('/v1/analytics').then(setA);
  }, []);
  if (!a) return <p aria-busy="true">Chargement…</p>;
  const pct = (x: number | null) => (x === null ? '—' : `${Math.round(x * 100)} %`);
  return (
    <div className="stack">
      <GoalPlan g={goals} />
      <AssessmentCard onStart={onAssessment} />
      <section className="card">
        <h2>Action suivante</h2>
        <p>{a.next_action_fr}</p>
      </section>
      <section className="card">
        <h2>Compétences (mesurées séparément)</h2>
        <ul className="skills">
          {a.skills.map((s: any) => (
            <li key={s.domain}>
              <span>{DOMAIN_FR[s.domain] ?? s.domain}</span>
              {s.score === null ? (
                <span className="muted small">{s.status === 'not_evaluated' ? 'Non évalué' : 'Données insuffisantes'}</span>
              ) : (
                <span className="meter" aria-label={`${s.score} sur 100`}>
                  <span style={{ width: `${s.score}%` }} /> <b>{s.score}</b>
                </span>
              )}
            </li>
          ))}
        </ul>
        <p className="small muted">Score indicatif : 45 % rappel autonome, 25 % transfert, 20 % rétention différée, 10 % reconnaissance. Aucun score global.</p>
      </section>
      <section className="card">
        <h2>Chiffres</h2>
        <ul className="stats-list">
          <li><strong>{a.days_practiced}</strong> jours pratiqués · <strong>{a.active_minutes}</strong> min actives (estimation)</li>
          <li><strong>{a.items_due}</strong> révisions dues · <strong>{a.items_taught}</strong> éléments présentés</li>
          <li>Lettres : <strong>{a.letters.mastered}</strong> maîtrisées / {a.letters.taught} vues / 33</li>
          <li>Vocabulaire : <strong>{a.vocabulary.active}</strong> actif · <strong>{a.vocabulary.receptive}</strong> réceptif (objectif mois 1 : {a.monthly_goal.target_active} / {a.monthly_goal.target_receptive})</li>
          <li>Rétention à 7 j : {pct(a.retention.d7.rate)} ({a.retention.d7.n}) · à 30 j : {pct(a.retention.d30.rate)} ({a.retention.d30.n})</li>
        </ul>
      </section>
      <section className="card">
        <h2>Alphabet : critère de sortie</h2>
        <p>{a.alphabet_exit.passed ? '✓ Critère atteint.' : 'Pas encore atteint — on prolonge sans pression.'}</p>
        <ul className="small">{a.alphabet_exit.reasons_fr.map((r: string) => <li key={r}>{r}</li>)}</ul>
      </section>
      {(a.letter_confusions.length > 0 || a.frequent_errors.length > 0) && (
        <section className="card">
          <h2>Points à travailler</h2>
          <ul>
            {a.letter_confusions.map((c: any) => <li key={c.expected + c.chosen}><span className="ru">{c.message_fr}</span> ({c.count}×)</li>)}
            {a.frequent_errors.map((e: any) => <li key={e.code}>{e.label_fr} ({e.count}×)</li>)}
          </ul>
        </section>
      )}
      {a.weekly.length > 0 && (
        <section className="card">
          <h2>Par semaine</h2>
          <div className="table-wrap">
            <table className="table">
              <thead><tr><th>Semaine</th><th>Réponses notées</th><th>Réussites autonomes</th><th>Min actives</th></tr></thead>
              <tbody>{a.weekly.map((w: any) => <tr key={w.week}><td>{w.week}</td><td>{w.attempts}</td><td>{w.autonomous_correct}</td><td>{w.active_minutes}</td></tr>)}</tbody>
            </table>
          </div>
        </section>
      )}
      <section className="card">
        <h2>Comparaisons linguistiques</h2>
        <p className="small">{a.bridge_effect.note_fr}</p>
      </section>
      <section className="card">
        <h2>Limites de cette mesure</h2>
        <ul className="small">{a.limits_fr.map((l: string) => <li key={l}>{l}</li>)}</ul>
      </section>
    </div>
  );
}

function SettingsScreen({ profile, onChange, onLogout }: { profile: any; onChange: () => void; onLogout: () => void }) {
  const [s, setS] = useState(profile.settings);
  const [langs, setLangs] = useState(profile.languages.known_languages);
  const [saved, setSaved] = useState(false);
  const [confirm, setConfirm] = useState('');
  const [saveError, setSaveError] = useState<string | null>(null);
  const set = (k: string, v: unknown) => {
    const next = { ...s, [k]: v };
    setS(next);
    setSaved(false);
    if (k === 'theme' || k === 'font_scale') applyTheme(next.theme, next.font_scale); // aperçu immédiat
  };
  const download = async (format: 'json' | 'csv') => {
    const res = await fetch(apiUrl(`/v1/export?format=${format}`), { headers: { authorization: `Bearer ${auth.token}` } });
    const blob = await res.blob();
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = format === 'json' ? 'russian365-export.json' : 'russian365-tentatives.csv';
    a.click();
    URL.revokeObjectURL(a.href);
  };
  return (
    <div className="stack">
      <section className="card">
        <h2>Réglages</h2>
        <div className="form-grid">
          <label className="block">Durée de séance par défaut
            <select className="input" value={s.daily_minutes} onChange={(e) => set('daily_minutes', Number(e.target.value))}>{DURATIONS.map((d) => <option key={d} value={d}>{d} min</option>)}</select>
          </label>
          <label className="block">Translittération
            <select className="input" value={s.transliteration} onChange={(e) => set('transliteration', e.target.value)}>
              <option value="auto">Automatique (masquée progressivement)</option><option value="always">Toujours</option><option value="never">Jamais</option>
            </select>
          </label>
          <label className="block">Vitesse audio
            <select className="input" value={s.audio_rate} onChange={(e) => set('audio_rate', Number(e.target.value))}>{[0.75, 0.9, 1, 1.15].map((r) => <option key={r} value={r}>{r}</option>)}</select>
          </label>
          <label className="block">Difficulté
            <select className="input" value={s.manual_difficulty} onChange={(e) => set('manual_difficulty', e.target.value)}>
              <option value="auto">Automatique</option><option value="easier">Plus facile</option><option value="harder">Plus difficile</option>
            </select>
          </label>
          <label className="block">Taille du texte
            <input className="input" type="range" min={0.8} max={1.8} step={0.1} value={s.font_scale} onChange={(e) => set('font_scale', Number(e.target.value))} />
          </label>
          <label className="block">Thème
            <select className="input" value={s.theme} onChange={(e) => set('theme', e.target.value)}><option value="system">Système</option><option value="light">Clair</option><option value="dark">Sombre</option></select>
          </label>
          <label className="block">Fuseau horaire<input className="input" value={s.timezone} onChange={(e) => set('timezone', e.target.value)} /></label>
          <label className="block">Début de mon programme de 12 mois
            <input className="input" type="date" value={s.goal_start_date ?? ''} onChange={(e) => set('goal_start_date', e.target.value || null)} />
            <span className="small muted">Vide = date de création du compte.</span>
          </label>
          <label className="block">Heure de ma séance (rappel)
            <input className="input" type="time" value={s.preferred_time ?? ''} onChange={(e) => set('preferred_time', e.target.value || null)} />
          </label>
          <label className="block">Jours de pratique par semaine
            <input className="input" type="number" min={1} max={7} value={s.days_per_week} onChange={(e) => set('days_per_week', Number(e.target.value))} />
          </label>
        </div>
        <label className="check"><input type="checkbox" checked={s.show_stress_marks} onChange={(e) => set('show_stress_marks', e.target.checked)} /> Afficher l’accent tonique pédagogique (´)</label>
        <label className="check"><input type="checkbox" checked={s.bridges_enabled} onChange={(e) => set('bridges_enabled', e.target.checked)} /> Proposer des comparaisons avec mes langues</label>
        <label className="check"><input type="checkbox" checked={s.personal_context_enabled} onChange={(e) => set('personal_context_enabled', e.target.checked)} /> Utiliser mes thèmes personnels</label>
        <label className="check"><input type="checkbox" checked={s.microphone_consent} onChange={(e) => set('microphone_consent', e.target.checked)} /> Consentement micro (révocable à tout moment)</label>
        <label className="check"><input type="checkbox" checked={s.notifications_enabled} onChange={(e) => set('notifications_enabled', e.target.checked)} /> Rappels (facultatifs)</label>
        <ReminderButton settings={s} />
        <h3>Langues d’appui</h3>
        <LanguagesEditor value={langs} names={profile.language_names_fr} onChange={(v) => { setLangs(v); setSaved(false); }} />
        <div className="actions">
          <button type="button" className="btn btn-primary" onClick={async () => {
            setSaveError(null);
            try {
              await api.patch('/v1/profile', { settings: pick(s) });
              await api.patch('/v1/profile/languages', { known_languages: langs });
              setSaved(true);
              onChange();
            } catch (e) {
              setSaveError(errorText(e));
            }
          }}>Enregistrer</button>
          {saved && <span className="ok-text" role="status">Enregistré.</span>}
          {saveError && <span className="warn" role="alert">{saveError}</span>}
        </div>
      </section>
      <section className="card">
        <h2>Mes données</h2>
        <div className="actions">
          <button type="button" className="btn" onClick={() => download('json')}>Exporter (JSON)</button>
          <button type="button" className="btn" onClick={() => download('csv')}>Exporter mes réponses (CSV)</button>
          <button type="button" className="btn btn-ghost" onClick={async () => { await flushOps().catch(() => undefined); await api.post('/v1/auth/logout').catch(() => undefined); await clearLocal(); auth.set(null); onLogout(); }}>Se déconnecter</button>
        </div>
        <details>
          <summary>Supprimer mon compte</summary>
          <p className="small">Suppression définitive de toutes tes données. Tape <strong>SUPPRIMER</strong> pour confirmer.</p>
          <input className="input" value={confirm} onChange={(e) => setConfirm(e.target.value)} aria-label="Confirmation" />
          <button type="button" className="btn btn-danger" disabled={confirm !== 'SUPPRIMER'} onClick={async () => { try { await api.del('/v1/account', { confirm }); await clearLocal(); auth.set(null); onLogout(); } catch (e) { setSaveError(errorText(e)); } }}>
            Supprimer définitivement
          </button>
        </details>
      </section>
    </div>
  );
}

// ---------------------------------------------------------------------------
export function App() {
  const [authed, setAuthed] = useState(!!auth.token);
  const [profile, setProfile] = useState<any>(null);
  const [tab, setTab] = useState<Tab>('home');
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [inAssessment, setInAssessment] = useState(false);
  const [screen, setScreen] = useState<null | 'review' | 'reading'>(null);
  const [error, setError] = useState<string | null>(null);

  const loadProfile = (): Promise<void> =>
    api
      .get('/v1/profile')
      .then((p) => {
        setProfile(p);
        applyTheme(p.settings.theme, p.settings.font_scale);
        kvSet('profile', p).catch(() => undefined);
      })
      .then(() => undefined)
      .catch(async (e) => {
        if (!auth.token) return setAuthed(false);
        // Hors ligne : profil enregistré lors de la dernière connexion.
        const cached = isNetworkError(e) ? await kvGet<any>('profile') : undefined;
        if (cached) {
          setProfile(cached);
          applyTheme(cached.settings.theme, cached.settings.font_scale);
        } else setError(e.message);
      });

  useEffect(() => {
    if (authed) {
      loadProfile();
      flushOps().catch(() => undefined);
    }
  }, [authed]);
  useEffect(() => {
    const h = () => flushOps().catch(() => undefined);
    window.addEventListener('online', h);
    return () => window.removeEventListener('online', h);
  }, []);

  if (!authed) return <AuthScreen onAuth={() => setAuthed(true)} />;
  if (error) return <main className="container"><p className="warn">{error}</p></main>;
  if (!profile) return <main className="container"><p aria-busy="true">Chargement…</p></main>;
  if (!profile.onboarded) return <Onboarding profile={profile} onDone={loadProfile} />;

  const tabs: [Tab, string][] = [['home', 'Accueil'], ['path', 'Parcours'], ['alphabet', 'Alphabet'], ['dict', 'Dico'], ['stats', 'Progrès'], ['settings', 'Réglages']];
  return (
    <div className="app">
      <a href="#main" className="skip">Aller au contenu</a>
      <header className="topbar">
        <span className="brand">Russian <b>365</b></span>
        {!sessionId && !inAssessment && !screen && (
          <nav aria-label="Navigation principale" className="tabs">
            {tabs.map(([k, label]) => (
              <button key={k} type="button" className={`tab${tab === k ? ' on' : ''}`} aria-current={tab === k ? 'page' : undefined} onClick={() => setTab(k)}>
                {label}
              </button>
            ))}
          </nav>
        )}
      </header>
      <main id="main" className="container">
        <Suspense fallback={<p aria-busy="true">Chargement…</p>}>
        {screen === 'review' ? (
          <BridgeReview onExit={() => setScreen(null)} />
        ) : screen === 'reading' ? (
          <RealSentences onExit={() => setScreen(null)} rate={profile.settings.audio_rate} />
        ) : inAssessment ? (
          <AssessmentPlayer onExit={() => { setInAssessment(false); setTab('home'); }} />
        ) : sessionId ? (
          <SessionPlayer sessionId={sessionId} onExit={() => { setSessionId(null); setTab('home'); }} />
        ) : tab === 'home' ? (
          <Home profile={profile} onStart={setSessionId} onAssessment={() => setInAssessment(true)} onScreen={setScreen} />
        ) : tab === 'path' ? (
          <PathScreen />
        ) : tab === 'alphabet' ? (
          <AlphabetScreen rate={profile.settings.audio_rate} />
        ) : tab === 'dict' ? (
          <DictionaryScreen rate={profile.settings.audio_rate} />
        ) : tab === 'stats' ? (
          <StatsScreen onAssessment={() => setInAssessment(true)} />
        ) : (
          <SettingsScreen profile={profile} onChange={loadProfile} onLogout={() => { setAuthed(false); setProfile(null); }} />
        )}
        </Suspense>
      </main>
    </div>
  );
}
