/**
 * Audio russe par la synthèse vocale de l'appareil (interface TTS remplaçable, §14).
 * Synthèse non validée : un enregistrement natif validé reste la référence (§10, §17).
 *
 * Particularités iPhone/Safari prises en compte :
 *  - la liste des voix arrive en retard (souvent vide au premier appel) : on parle quand même avec lang = ru-RU ;
 *  - cancel() juste avant speak() peut annuler les deux : on n'annule que si une lecture est en cours ;
 *  - le mode silencieux (interrupteur latéral) coupe la synthèse vocale web : on le signale si rien ne démarre.
 */

export function stripStress(s: string): string {
  return s.normalize('NFD').replace(/́/g, '').normalize('NFC');
}

function voices(): SpeechSynthesisVoice[] {
  try {
    return window.speechSynthesis.getVoices();
  } catch {
    return [];
  }
}

function pickVoice(): SpeechSynthesisVoice | null {
  const v = voices();
  return v.find((x) => x.lang === 'ru-RU') ?? v.find((x) => x.lang.toLowerCase().replace('_', '-').startsWith('ru')) ?? null;
}

export function speechSupported(): boolean {
  return typeof window !== 'undefined' && 'speechSynthesis' in window && 'SpeechSynthesisUtterance' in window;
}

/**
 * Faux seulement si l'on est sûr qu'aucune voix russe n'existe (liste chargée et sans russe).
 * Une liste encore vide (iPhone) n'est pas une preuve d'absence.
 */
export function ruVoiceAvailable(): boolean {
  if (!speechSupported()) return false;
  const v = voices();
  return v.length === 0 || !!pickVoice();
}

export function onVoicesChanged(cb: () => void): () => void {
  if (!speechSupported()) return () => undefined;
  window.speechSynthesis.addEventListener('voiceschanged', cb);
  return () => window.speechSynthesis.removeEventListener('voiceschanged', cb);
}

export type SpeakOutcome = 'started' | 'failed' | 'unsupported';

/** Lit un texte russe. La promesse indique si la lecture a réellement démarré (sinon : conseils à l'utilisateur). */
export function speakRu(text: string, rate = 1): Promise<SpeakOutcome> {
  if (!speechSupported()) return Promise.resolve('unsupported');
  const synth = window.speechSynthesis;
  const u = new SpeechSynthesisUtterance(stripStress(text));
  u.lang = 'ru-RU';
  const v = pickVoice();
  if (v) u.voice = v;
  u.rate = rate; // 0,75 / 0,9 / 1 / 1,15 sans modifier la hauteur (§10)
  u.pitch = 1;
  u.volume = 1;
  return new Promise((resolve) => {
    let done = false;
    const finish = (o: SpeakOutcome) => {
      if (!done) {
        done = true;
        resolve(o);
      }
    };
    u.onstart = () => finish('started');
    u.onerror = (e) => finish((e as SpeechSynthesisErrorEvent).error === 'interrupted' || (e as SpeechSynthesisErrorEvent).error === 'canceled' ? 'started' : 'failed');
    // Certains navigateurs n'émettent pas onstart : si la synthèse « parle » après un court délai, c'est bon.
    setTimeout(() => finish(synth.speaking ? 'started' : 'failed'), 2500);
    try {
      if (synth.speaking || synth.pending) synth.cancel();
      synth.resume();
      synth.speak(u);
    } catch {
      finish('failed');
    }
  });
}

export const AUDIO_HELP_FR = [
  'iPhone : désactive le mode silencieux (petit bouton sur le côté) et monte le volume.',
  'Vérifie qu’une voix russe est installée : iPhone → Réglages → Accessibilité → Contenu énoncé → Voix → Russe ; Android → Paramètres → Synthèse vocale → Google → données vocales russes.',
  'Puis appuie de nouveau sur 🔊.',
];
