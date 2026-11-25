/**
 * Rappel quotidien par le calendrier du téléphone (fichier .ics) : événement récurrent les jours de pratique,
 * à l'heure choisie, avec alarme et lien vers l'application. Aucune notification serveur nécessaire.
 */
const DAYS = ['MO', 'TU', 'WE', 'TH', 'FR', 'SA', 'SU'];

export function buildIcs(opts: { time: string; daysPerWeek: number; minutes: number; url: string; timezone: string; start?: Date }): string {
  const [hh, mm] = (opts.time || '19:00').split(':');
  const start = opts.start ?? new Date();
  const d = `${start.getFullYear()}${String(start.getMonth() + 1).padStart(2, '0')}${String(start.getDate()).padStart(2, '0')}`;
  const byday = DAYS.slice(0, Math.min(7, Math.max(1, opts.daysPerWeek))).join(',');
  const stamp = new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d+Z$/, 'Z');
  const end = new Date(2000, 0, 1, Number(hh), Number(mm) + opts.minutes);
  const endT = `${String(end.getHours()).padStart(2, '0')}${String(end.getMinutes()).padStart(2, '0')}00`;
  return [
    'BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Russian 365//Rappel//FR', 'CALSCALE:GREGORIAN', 'BEGIN:VEVENT',
    `UID:russian365-rappel-${d}@bmcg.ch`, `DTSTAMP:${stamp}`,
    `DTSTART;TZID=${opts.timezone}:${d}T${hh}${mm}00`, `DTEND;TZID=${opts.timezone}:${d}T${endT}`,
    `RRULE:FREQ=WEEKLY;BYDAY=${byday};COUNT=${Math.min(7, Math.max(1, opts.daysPerWeek)) * 52}`,
    `SUMMARY:🇷🇺 Russe — séance de ${opts.minutes} min`,
    `DESCRIPTION:Ta séance Russian 365 : ${opts.url}`, `URL:${opts.url}`,
    'BEGIN:VALARM', 'ACTION:DISPLAY', 'DESCRIPTION:C’est l’heure de ta séance de russe', 'TRIGGER:PT0M', 'END:VALARM',
    'END:VEVENT', 'END:VCALENDAR', '',
  ].join('\r\n');
}

export function ReminderButton({ settings }: { settings: any }) {
  const add = () => {
    const url = new URL(import.meta.env.BASE_URL, location.origin).toString();
    const ics = buildIcs({ time: settings.preferred_time ?? '19:00', daysPerWeek: settings.days_per_week ?? 6, minutes: settings.daily_minutes ?? 35, url, timezone: settings.timezone ?? 'Europe/Zurich' });
    const blob = new Blob([ics], { type: 'text/calendar;charset=utf-8' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'rappel-russe.ics';
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 5000);
  };
  return (
    <div className="reminder">
      <button type="button" className="btn btn-ghost" onClick={add}>📅 Ajouter un rappel quotidien à mon calendrier</button>
      <p className="tiny-muted">
        {settings.days_per_week ?? 6} jours/semaine à {settings.preferred_time ?? '19:00'} (modifiable dans Réglages), pendant 52 semaines. Sur iPhone : ouvre le fichier puis « Ajouter tout ».
      </p>
    </div>
  );
}
