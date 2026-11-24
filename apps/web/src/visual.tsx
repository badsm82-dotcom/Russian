/**
 * Composants visuels didactiques : accent tonique en couleur, voyelles réduites signalées,
 * lettre du jour surlignée, catégories de lettres, tableaux de structures, correction lettre par lettre.
 */
import { stripStress } from './speech';

const ACUTE = '́';
const VOWELS = 'аеёиоуыэюяАЕЁИОУЫЭЮЯ';

interface Glyph {
  ch: string;
  stressed: boolean;
}

/** Découpe un texte en lettres, en rattachant l'accent pédagogique (U+0301) à la voyelle qui le précède. */
export function glyphs(text: string): Glyph[] {
  const out: Glyph[] = [];
  for (const ch of text.normalize('NFC')) {
    if (ch === ACUTE) {
      const last = out[out.length - 1];
      if (last) last.stressed = true;
    } else out.push({ ch, stressed: false });
  }
  // ё est toujours accentué.
  for (const g of out) if (g.ch === 'ё' || g.ch === 'Ё') g.stressed = true;
  return out;
}

/**
 * Texte russe avec l'accent tonique en couleur (au lieu du petit ´), et, si `reduce`,
 * les о non accentués signalés « ≈ a » (réduction vocalique) dans les mots dont l'accent est connu.
 */
export function RuWord({
  text,
  stress = true,
  reduce = false,
  highlight,
  className = '',
}: {
  text: string;
  stress?: boolean;
  reduce?: boolean;
  highlight?: string;
  className?: string;
}) {
  if (!stress) return <span className={`ru ${className}`} lang="ru">{stripStress(text)}</span>;
  // Traitement mot par mot : la réduction ne s'applique qu'aux mots dont l'accent est marqué.
  const parts = text.split(/(\s+)/);
  let key = 0;
  return (
    <span className={`ru ${className}`} lang="ru">
      {parts.map((part) => {
        const gs = glyphs(part);
        const hasStress = gs.some((g) => g.stressed);
        const vowelCount = gs.filter((g) => VOWELS.includes(g.ch)).length;
        return gs.map((g) => {
          const hl = highlight && g.ch.toLocaleLowerCase('ru') === highlight;
          const reduced = reduce && hasStress && vowelCount > 1 && !g.stressed && (g.ch === 'о' || g.ch === 'О');
          const cls = [g.stressed ? 'stress' : '', hl ? 'hl' : '', reduced ? 'reduced' : ''].filter(Boolean).join(' ');
          if (!cls) return <span key={key++}>{g.ch}</span>;
          return (
            <span key={key++} className={cls} title={reduced ? 'о non accentué : se prononce à peu près [a]' : g.stressed ? 'syllabe accentuée' : undefined}>
              {g.ch}
            </span>
          );
        });
      })}
    </span>
  );
}

export function StressLegend({ reduce = false }: { reduce?: boolean }) {
  return (
    <p className="legend small muted">
      <span className="ru"><span className="stress">а</span></span> = syllabe accentuée (à prononcer plus fort et plus long)
      {reduce && (
        <>
          {' · '}
          <span className="ru"><span className="reduced">о</span></span> = о non accentué, se dit ≈ [a]
        </>
      )}
    </p>
  );
}

export function LetterBadge({ cls }: { cls?: { key: string; label_fr: string; detail_fr: string } }) {
  if (!cls) return null;
  return (
    <p className="letter-class">
      <span className={`badge badge-${cls.key}`}>{cls.label_fr}</span> <span className="small muted">{cls.detail_fr}</span>
    </p>
  );
}

export function LatinTrap({ cyr, latin }: { cyr: string; latin?: string }) {
  if (!latin) return null;
  return (
    <div className="latin-trap" aria-label={`Attention : ${cyr} n’est pas le ${latin} latin`}>
      <span className="ru big-trap">{cyr}</span>
      <span className="neq">≠</span>
      <span className="latin big-trap">{latin}</span>
      <span className="small">Même forme, autre son.</span>
    </div>
  );
}

export function CardTableView({ table }: { table?: { caption_fr: string; headers: string[]; rows: { cells: string[]; highlight?: boolean }[]; note_fr?: string } }) {
  if (!table) return null;
  const isRu = (s: string) => /[а-яё]/i.test(s);
  return (
    <figure className="struct-table">
      <figcaption>{table.caption_fr}</figcaption>
      <div className="table-wrap">
        <table className="table">
          <thead>
            <tr>{table.headers.map((h, i) => <th key={i}>{h}</th>)}</tr>
          </thead>
          <tbody>
            {table.rows.map((r, i) => (
              <tr key={i} className={r.highlight ? 'row-hl' : ''}>
                {r.cells.map((c, j) => (
                  <td key={j}>{isRu(c) ? <RuWord text={c} /> : c.split('—').map((p, k, arr) => (
                    <span key={k}>{p}{k < arr.length - 1 && <span className="gap" title="verbe « être » absent">—</span>}</span>
                  ))}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {table.note_fr && <p className="small muted">{table.note_fr}</p>}
    </figure>
  );
}

/** Alignement lettre par lettre (plus longue sous-séquence commune) entre la réponse et la forme attendue. */
export function charDiff(given: string, expected: string): { given: { ch: string; ok: boolean }[]; expected: { ch: string; ok: boolean }[] } {
  const norm = (s: string) => [...stripStress(s).toLocaleLowerCase('ru').replace(/ё/g, 'е')];
  const a = [...stripStress(given)];
  const b = [...stripStress(expected)];
  const A = norm(given);
  const B = norm(expected);
  const dp: number[][] = Array.from({ length: A.length + 1 }, () => new Array<number>(B.length + 1).fill(0));
  for (let i = A.length - 1; i >= 0; i--)
    for (let j = B.length - 1; j >= 0; j--) dp[i]![j] = A[i] === B[j] ? dp[i + 1]![j + 1]! + 1 : Math.max(dp[i + 1]![j]!, dp[i]![j + 1]!);
  const ga = a.map((ch) => ({ ch, ok: false }));
  const gb = b.map((ch) => ({ ch, ok: false }));
  let i = 0;
  let j = 0;
  while (i < A.length && j < B.length) {
    if (A[i] === B[j]) {
      ga[i]!.ok = true;
      gb[j]!.ok = true;
      i++;
      j++;
    } else if (dp[i + 1]![j]! >= dp[i]![j + 1]!) i++;
    else j++;
  }
  // Ponctuation et espaces ne sont jamais signalés comme fautes.
  for (const g of [...ga, ...gb]) if (!/[а-яёa-z]/i.test(g.ch)) g.ok = true;
  return { given: ga, expected: gb };
}

export function AnswerDiff({ given, expected }: { given: string; expected: string }) {
  const d = charDiff(given, expected);
  if (d.given.every((g) => g.ok) && d.expected.every((g) => g.ok)) return null;
  return (
    <div className="diff" aria-label="Comparaison lettre par lettre">
      <div><span className="small muted">Ta réponse : </span><span className="ru">{d.given.map((g, k) => <span key={k} className={g.ok ? '' : 'diff-bad'}>{g.ch}</span>)}</span></div>
      <div><span className="small muted">Attendu : </span><span className="ru">{d.expected.map((g, k) => <span key={k} className={g.ok ? '' : 'diff-miss'}>{g.ch}</span>)}</span></div>
    </div>
  );
}
