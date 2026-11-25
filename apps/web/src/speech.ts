/**
 * Audio russe par la synthèse vocale de l'appareil (interface TTS remplaçable, §14).
 * Synthèse non validée : un enregistrement natif validé reste la référence (§10, §17).
 *
 * Particularités iPhone/Safari prises en compte :
 *  - la liste des voix arrive en retard (souvent vide au premier appel) : on parle quand même avec lang = ru-RU ;
 *  - cancel() juste avant speak() peut annuler les deux : on n'annule que si une lecture est en cours ;
 *  - le mode silencieux (interrupteur latéral) coupe la synthèse vocale web : on le signale si rien ne démarre.
 */

import { normalizeAnswer, stripStressMarks } from '@r365/domain';

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

// ---------------------------------------------------------------------------
// Fichiers audio (voix natives Lingua Libre, synthèse Silero) : lus par un vrai lecteur audio,
// donc audibles même en mode silencieux sur iPhone, et mis en cache pour le hors-ligne.
// ---------------------------------------------------------------------------

export interface AudioEntry {
  file: string;
  source: 'lingualibre' | 'silero';
  voice: string;
  license: string;
  author: string;
  url: string;
}

/** Index compact des fichiers (≈ 10 Ko compressés), chargé dès l'ouverture : sur iPhone, play() doit partir sans attente. */
let manifestData: Record<string, AudioEntry[]> | null = null;
export function preloadAudioManifest(): void {
  if (manifestData || typeof fetch === 'undefined') return;
  fetch(`${import.meta.env.BASE_URL}audio/index.json`, { cache: 'no-cache' })
    .then((r) => (r.ok ? r.json() : { t: {}, n: {} }))
    .then((d: { t: Record<string, string[]>; n: Record<string, [string, string, string]> }) => {
      const out: Record<string, AudioEntry[]> = {};
      for (const [k, files] of Object.entries(d.t ?? {})) {
        out[k] = files.map((file) => {
          const nat = d.n?.[file];
          return nat
            ? { file, source: 'lingualibre' as const, voice: file, author: nat[0], url: nat[1], license: nat[2] }
            : { file, source: 'silero' as const, voice: file, author: 'Silero', url: 'https://github.com/snakers4/silero-models', license: 'CC BY-NC-SA 4.0' };
        });
      }
      manifestData = out;
    })
    .catch(() => undefined);
}

/** Même clé que le générateur (scripts/audio-texts.ts) : sans accent, sans ponctuation, minuscules, ё → е. */
export function audioKey(text: string): string {
  return normalizeAnswer(stripStressMarks(text));
}

const plays = new Map<string, number>();
let current: HTMLAudioElement | null = null;
/** Dernier enregistrement natif joué (pour l'attribution exigée par CC BY-SA). */
export let lastNative: AudioEntry | null = null;

/** Lit un texte russe : fichier audio s'il existe (audible même en mode silencieux), sinon synthèse de l'appareil. */
export function speakRu(text: string, rate = 1): Promise<SpeakOutcome> {
  const key = audioKey(text);
  const entries = manifestData?.[key];
  if (!entries?.length) {
    preloadAudioManifest();
    lastNative = null;
    return speakSynth(text, rate);
  }
  // Voix native d'abord ; puis on alterne les voix (plusieurs locuteurs entraînent mieux l'oreille).
  const ordered = [...entries.filter((e) => e.source === 'lingualibre'), ...entries.filter((e) => e.source !== 'lingualibre')];
  const n = plays.get(key) ?? 0;
  plays.set(key, n + 1);
  const entry = ordered[n % ordered.length]!;
  try {
    current?.pause();
    const a = new Audio(`${import.meta.env.BASE_URL}audio/${entry.file}`);
    a.playbackRate = rate;
    (a as HTMLAudioElement & { preservesPitch?: boolean }).preservesPitch = true;
    current = a;
    // play() appelé immédiatement, dans le geste de l'utilisateur.
    return a.play().then(
      () => {
        lastNative = entry.source === 'lingualibre' ? entry : null;
        return 'started' as const;
      },
      () => {
        lastNative = null;
        return speakSynth(text, rate);
      },
    );
  } catch {
    return speakSynth(text, rate);
  }
}

function speakSynth(text: string, rate: number): Promise<SpeakOutcome> {
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
