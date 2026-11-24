import { useState } from 'react';
import { api } from './api';
import { CyrillicKeyboard } from './Keyboard';
import { speakRu } from './speech';
import { RuWord } from './visual';

const CASES: [string, string, string][] = [
  ['nom', 'Nominatif', 'qui ? quoi ? (sujet)'],
  ['gen', 'Génitif', 'de qui ? de quoi ? (absence, quantité)'],
  ['dat', 'Datif', 'à qui ? (destinataire)'],
  ['acc', 'Accusatif', 'qui ? quoi ? (objet)'],
  ['inst', 'Instrumental', 'avec qui ? avec quoi ?'],
  ['prep', 'Prépositionnel', 'où ? de quoi ? (après в, на, о)'],
];

function NounForms({ f }: { f: Record<string, string> }) {
  return (
    <div className="table-wrap">
      <table className="table forms">
        <thead><tr><th>Cas</th><th>Singulier</th><th>Pluriel</th></tr></thead>
        <tbody>
          {CASES.map(([k, name, q]) => (
            <tr key={k}>
              <td><strong>{name}</strong><div className="tiny-muted">{q}</div></td>
              <td>{f[`sg_${k}`] ? <RuWord text={f[`sg_${k}`]!} /> : '—'}</td>
              <td>{f[`pl_${k}`] ? <RuWord text={f[`pl_${k}`]!} /> : '—'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function VerbForms({ f, aspect }: { f: Record<string, string>; aspect: string | null }) {
  const pres = aspect === 'perfectif' ? 'Futur (perfectif)' : 'Présent';
  const rows: [string, string][] = [['я', 'presfut_sg1'], ['ты', 'presfut_sg2'], ['он / она́', 'presfut_sg3'], ['мы', 'presfut_pl1'], ['вы', 'presfut_pl2'], ['они́', 'presfut_pl3']];
  return (
    <div className="forms-grid">
      <div className="table-wrap">
        <table className="table forms">
          <thead><tr><th colSpan={2}>{pres}</th></tr></thead>
          <tbody>{rows.map(([p, k]) => <tr key={k}><td><RuWord text={p} /></td><td>{f[k] ? <RuWord text={f[k]!} /> : '—'}</td></tr>)}</tbody>
        </table>
      </div>
      <div className="table-wrap">
        <table className="table forms">
          <thead><tr><th colSpan={2}>Passé</th></tr></thead>
          <tbody>
            {([['il (masc.)', 'past_m'], ['elle (fém.)', 'past_f'], ['neutre', 'past_n'], ['pluriel', 'past_pl']] as const).map(([p, k]) => (
              <tr key={k}><td>{p}</td><td>{f[k] ? <RuWord text={f[k]!} /> : '—'}</td></tr>
            ))}
            <tr><td>Impératif</td><td>{[f.imperative_sg, f.imperative_pl].filter(Boolean).map((x, i) => <span key={i}>{i ? ' / ' : ''}<RuWord text={x!} /></span>)}</td></tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}

function AdjForms({ f }: { f: Record<string, string> }) {
  const rows: [string, string][] = [['masculin', 'decl_m_nom'], ['féminin', 'decl_f_nom'], ['neutre', 'decl_n_nom'], ['pluriel', 'decl_pl_nom'], ['forme courte (m)', 'short_m'], ['comparatif', 'comparative']];
  return (
    <div className="table-wrap">
      <table className="table forms">
        <tbody>{rows.filter(([, k]) => f[k]).map(([p, k]) => <tr key={k}><td>{p}</td><td><RuWord text={f[k]!} /></td></tr>)}</tbody>
      </table>
    </div>
  );
}

export function DictionaryScreen({ rate }: { rate: number }) {
  const [q, setQ] = useState('');
  const [res, setRes] = useState<any>(null);
  const [kb, setKb] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const search = async (query = q) => {
    if (!query.trim()) return;
    setError(null);
    try {
      setRes(await api.get(`/v1/dictionary?q=${encodeURIComponent(query.trim())}`));
    } catch (e) {
      setError((e as Error).message);
    }
  };
  return (
    <div className="stack">
      <section className="card">
        <h2>Dictionnaire</h2>
        <p className="small muted">Tape un mot russe, même conjugué ou décliné (ex. хочу́ → хоте́ть). Accent, formes, aspect et sens en anglais 🇬🇧 et en allemand 🇩🇪.</p>
        <form onSubmit={(e) => { e.preventDefault(); search(); }} className="row">
          <label className="sr-only" htmlFor="dict-q">Mot à chercher</label>
          <input id="dict-q" className="input ru" lang="ru" autoComplete="off" value={q} onChange={(e) => setQ(e.target.value)} placeholder="слово…" style={{ flex: 1 }} />
          <button className="btn btn-primary" type="submit">Chercher</button>
        </form>
        <button type="button" className="btn btn-ghost btn-small" aria-expanded={kb} onClick={() => setKb(!kb)}>⌨️ Clavier russe</button>
        {kb && <CyrillicKeyboard onKey={(c) => setQ((x) => x + c)} onBackspace={() => setQ((x) => [...x].slice(0, -1).join(''))} />}
        {error && <p className="warn" role="alert">{error}</p>}
      </section>
      {res && res.results.length === 0 && <p className="card">Aucun résultat pour « {res.query} ».</p>}
      {res?.results.map((r: any, i: number) => (
        <article key={`${r.lemma}-${r.pos}-${i}`} className="card dict-entry">
          <div className="word-head">
            <h3 className="big-word-sm"><RuWord text={r.accented} /></h3>
            <button type="button" className="btn btn-ghost btn-small" onClick={() => speakRu(r.accented, rate)} aria-label={`Écouter ${r.lemma}`}>🔊</button>
          </div>
          {r.match === 'form' && <p className="small info">« {r.matched_form} » est une forme de <strong className="ru">{r.lemma}</strong>.</p>}
          <p className="small">
            <span className="tag">{r.pos_fr}</span> {r.gender_fr && <span className="tag">{r.gender_fr}</span>} {r.aspect_fr && <span className="tag">{r.aspect_fr}</span>}{' '}
            <span className="muted">fréquence : n° {r.rank} des {r.pos_fr}s</span>
          </p>
          {r.aspect_partner && <p className="small">Paire d’aspect : <RuWord text={r.aspect_partner} /></p>}
          <p>🇬🇧 {r.en || '—'}</p>
          <p>🇩🇪 {r.de || '—'}</p>
          {Object.keys(r.forms).length > 0 && (
            <details>
              <summary>Voir les formes</summary>
              {r.pos === 'noun' && <NounForms f={r.forms} />}
              {r.pos === 'verb' && <VerbForms f={r.forms} aspect={r.aspect_fr} />}
              {r.pos === 'adjective' && <AdjForms f={r.forms} />}
            </details>
          )}
        </article>
      ))}
      {res && <p className="small muted">Données : OpenRussian ({res.source.license}). Traductions en anglais et en allemand fournies par la source ; non relues.</p>}
    </div>
  );
}
