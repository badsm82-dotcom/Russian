import { useEffect, useState } from 'react';
import { api } from './api';

const PACE_ICON: Record<string, string> = { not_started: '🚀', ahead: '🟢', on_track: '🟢', slightly_behind: '🟠', behind: '🔴' };

const fmt = (d: string) => new Date(`${d}T12:00:00Z`).toLocaleDateString('fr-CH', { day: 'numeric', month: 'short', year: 'numeric' });

export function useGoals() {
  const [g, setG] = useState<any>(null);
  useEffect(() => {
    api.get('/v1/goals').then(setG).catch(() => undefined);
  }, []);
  return g;
}

function Bar({ value, max, label }: { value: number; max: number; label: string }) {
  const pct = Math.min(100, Math.round((value / Math.max(1, max)) * 100));
  return (
    <div className="goal-bar">
      <div className="goal-bar-label small"><span>{label}</span><span>{value} / {max}</span></div>
      <div className="unit-progress" role="progressbar" aria-valuemin={0} aria-valuemax={max} aria-valuenow={value} aria-label={label}><div style={{ width: `${pct}%` }} /></div>
    </div>
  );
}

/** Carte compacte pour l'accueil. */
export function GoalCard({ g }: { g: any }) {
  if (!g) return null;
  return (
    <section className="card goal-card">
      <p className="eyebrow">Mon objectif · semaine {Math.min(g.week, 52)} / 52 · mois {g.month.month}</p>
      <p className="goal-pace">{PACE_ICON[g.pace.status]} {g.pace.label_fr}</p>
      <Bar value={g.this_week.done_days} max={g.this_week.target_days} label="Jours de pratique cette semaine" />
      <Bar value={g.this_week.done_minutes} max={g.this_week.target_minutes} label="Minutes cette semaine" />
      <p className="small">{g.next_steps_fr[0]}</p>
    </section>
  );
}

/** Plan complet (écran Progrès). */
export function GoalPlan({ g }: { g: any }) {
  if (!g) return null;
  const year = Math.min(100, Math.round((g.totals.hours_done / g.totals.hours_plan) * 100));
  return (
    <section className="card">
      <h2>Mon plan sur 12 mois</h2>
      <p className="small muted">Départ le {fmt(g.start_date)} · objectif : conversation de 10–15 min et lecture d’un livre gradué A2. Les semaines sont des repères, pas des verrous.</p>
      <p className="goal-pace">{PACE_ICON[g.pace.status]} {g.pace.label_fr}</p>
      <Bar value={Math.round(g.totals.hours_done)} max={g.totals.hours_plan} label={`Heures de pratique (${year} % du programme)`} />
      <p className="small">Prévu à ce jour : {g.totals.hours_planned_to_date} h · fait : {g.totals.hours_done} h · {g.totals.days_practiced} jour(s) pratiqué(s).</p>
      <p className="small">{g.projection.note_fr}</p>
      <h3>Cette semaine ({fmt(g.this_week.start)} → {fmt(g.this_week.end)})</h3>
      <Bar value={g.this_week.done_days} max={g.this_week.target_days} label="Jours" />
      <Bar value={g.this_week.done_minutes} max={g.this_week.target_minutes} label="Minutes" />
      <ul className="small">{g.next_steps_fr.map((s: string) => <li key={s}>{s}</li>)}</ul>
      <p className="small muted">Rythme conseillé : {g.weekly_rhythm_fr.join(' · ')}.</p>

      <h3>Vocabulaire</h3>
      <Bar value={g.lemmas.active} max={g.lemmas.expected_active} label="Mots actifs (attendu à ce jour)" />
      <Bar value={g.lemmas.receptive} max={g.lemmas.expected_receptive} label="Mots compris (attendu à ce jour)" />
      <p className="small muted">{g.lemmas.note_fr}</p>

      <h3>Bilans</h3>
      <ol className="checkpoints">
        {g.checkpoints.map((c: any) => (
          <li key={c.id} className={`cp-${c.state}`}>
            <span className="cp-dot" aria-hidden="true">{c.state === 'done' ? '✓' : c.state === 'due' ? '!' : ''}</span>
            <div>
              <strong>{c.label_fr}</strong> <span className="small muted">vers le {fmt(c.date)}{c.state === 'due' ? ' · à faire maintenant' : ''}</span>
              <div className="small">{c.content_fr}</div>
            </div>
          </li>
        ))}
      </ol>

      <h3>Les 12 mois</h3>
      <ol className="months">
        {g.months.map((m: any) => {
          const state = g.month.month === m.month ? 'current' : m.month < g.month.month ? 'past' : 'future';
          const start = new Date(new Date(`${g.start_date}T12:00:00Z`).getTime() + (m.weeks[0] - 1) * 7 * 86400000).toISOString().slice(0, 10);
          return (
            <li key={m.month} className={`month-${state}`}>
              <div className="month-head">
                <strong>Mois {m.month}</strong> <span className="small muted">sem. {m.weeks[0]}–{m.weeks[1]} · dès le {fmt(start)}</span>
                {m.month > g.content_available_until_month && <span className="tag">contenu à venir</span>}
              </div>
              <div className="small">{m.content_fr}</div>
              <div className="small"><strong>Mission :</strong> {m.mission_fr} · <strong>Cible :</strong> {m.active} actifs / {m.receptive} compris</div>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
