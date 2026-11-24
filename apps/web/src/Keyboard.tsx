import { useState } from 'react';

/** Clavier cyrillique virtuel (disposition ЙЦУКЕН) : aucun clavier russe matériel n'est requis (§8, AC21). */
const ROWS = [
  ['й', 'ц', 'у', 'к', 'е', 'н', 'г', 'ш', 'щ', 'з', 'х', 'ъ'],
  ['ф', 'ы', 'в', 'а', 'п', 'р', 'о', 'л', 'д', 'ж', 'э'],
  ['я', 'ч', 'с', 'м', 'и', 'т', 'ь', 'б', 'ю', 'ё'],
];

export function CyrillicKeyboard({ onKey, onBackspace }: { onKey: (ch: string) => void; onBackspace: () => void }) {
  const [shift, setShift] = useState(false);
  return (
    <div className="kb" role="group" aria-label="Clavier russe virtuel">
      {ROWS.map((row, i) => (
        <div className="kb-row" key={i}>
          {row.map((k) => {
            const ch = shift ? k.toLocaleUpperCase('ru') : k;
            return (
              <button type="button" key={k} className="kb-key ru" onClick={() => { onKey(ch); if (shift) setShift(false); }} aria-label={`Lettre ${ch}`}>
                {ch}
              </button>
            );
          })}
        </div>
      ))}
      <div className="kb-row">
        <button type="button" className={`kb-key kb-wide${shift ? ' on' : ''}`} aria-pressed={shift} onClick={() => setShift(!shift)}>
          ⇧ Maj.
        </button>
        <button type="button" className="kb-key kb-space" onClick={() => onKey(' ')} aria-label="Espace">
          espace
        </button>
        <button type="button" className="kb-key kb-wide" onClick={onBackspace} aria-label="Effacer">
          ⌫
        </button>
      </div>
    </div>
  );
}
