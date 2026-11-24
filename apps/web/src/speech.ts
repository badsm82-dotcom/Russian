/**
 * Audio russe par la synthèse vocale du navigateur (interface TTS remplaçable, §14).
 * Synthèse non validée : un enregistrement natif validé reste la référence (§10, §17).
 */

export function stripStress(s: string): string {
  return s.normalize('NFD').replace(/́/g, '').normalize('NFC');
}

let cachedVoice: SpeechSynthesisVoice | null | undefined;

function pickVoice(): SpeechSynthesisVoice | null {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return null;
  const voices = window.speechSynthesis.getVoices();
  return voices.find((v) => v.lang === 'ru-RU') ?? voices.find((v) => v.lang.toLowerCase().startsWith('ru')) ?? null;
}

export function ruVoiceAvailable(): boolean {
  if (cachedVoice === undefined || cachedVoice === null) cachedVoice = pickVoice();
  return !!cachedVoice;
}

export function onVoicesChanged(cb: () => void): () => void {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return () => undefined;
  const h = () => {
    cachedVoice = pickVoice();
    cb();
  };
  window.speechSynthesis.addEventListener('voiceschanged', h);
  return () => window.speechSynthesis.removeEventListener('voiceschanged', h);
}

export function speakRu(text: string, rate = 1): boolean {
  if (!('speechSynthesis' in window)) return false;
  const voice = cachedVoice ?? pickVoice();
  if (!voice) return false;
  window.speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(stripStress(text));
  u.lang = 'ru-RU';
  u.voice = voice;
  // Vitesses 0,75 / 0,9 / 1 / 1,15 sans modification de hauteur (§10).
  u.rate = rate;
  u.pitch = 1;
  window.speechSynthesis.speak(u);
  return true;
}
