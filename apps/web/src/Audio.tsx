import { useState } from 'react';
import { AUDIO_HELP_FR, speakRu, speechSupported, type SpeakOutcome } from './speech';

function Help({ outcome }: { outcome: SpeakOutcome }) {
  if (outcome === 'started') return null;
  return (
    <div className="audio-help small" role="status">
      {outcome === 'unsupported' ? (
        <p>Ce navigateur ne propose pas de voix de synthèse : lis la translittération, l’audio reviendra sur un autre navigateur.</p>
      ) : (
        <>
          <p><strong>Aucun son ?</strong></p>
          <ul>{AUDIO_HELP_FR.map((h) => <li key={h}>{h}</li>)}</ul>
        </>
      )}
    </div>
  );
}

/** Bouton « Écouter » + « Plus lentement », avec aide si la lecture ne démarre pas. */
export function AudioButton({ text, rate, label = 'Écouter' }: { text: string; rate: number; label?: string }) {
  const [outcome, setOutcome] = useState<SpeakOutcome>(speechSupported() ? 'started' : 'unsupported');
  const play = async (r: number) => setOutcome(await speakRu(text, r));
  return (
    <span className="audio">
      <button type="button" className="btn btn-ghost" onClick={() => play(rate)}>🔊 {label}</button>
      <button type="button" className="btn btn-ghost btn-small" onClick={() => play(0.75)} aria-label="Écouter plus lentement">🐢 Plus lentement</button>
      <Help outcome={outcome} />
    </span>
  );
}

/** Petite icône 🔊 (exemples, dictionnaire, alphabet). */
export function SpeakIcon({ text, rate, label }: { text: string; rate: number; label?: string }) {
  const [outcome, setOutcome] = useState<SpeakOutcome>('started');
  return (
    <>
      <button type="button" className="btn btn-ghost btn-small" onClick={async () => setOutcome(await speakRu(text, rate))} aria-label={label ?? 'Écouter'}>🔊</button>
      <Help outcome={outcome} />
    </>
  );
}
