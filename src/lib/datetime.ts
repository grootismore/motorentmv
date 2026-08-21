/**
 * Display-only helpers. Everything is stored in UTC (PRD §6.2); every
 * screen shows it in Indian/Maldives (UTC+5, no DST) — never the device's
 * own time zone, so a staff member and a customer looking at the same
 * booking always see the same wall-clock time regardless of where their
 * phone thinks it is.
 */
const MALDIVES_TZ = 'Indian/Maldives';

export function formatMaldivesDateTime(iso: string): string {
  return new Intl.DateTimeFormat('en-GB', {
    timeZone: MALDIVES_TZ,
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(iso));
}

export function formatMaldivesDate(iso: string): string {
  return new Intl.DateTimeFormat('en-GB', {
    timeZone: MALDIVES_TZ,
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(new Date(iso));
}

export function formatMaldivesTime(iso: string): string {
  return new Intl.DateTimeFormat('en-GB', {
    timeZone: MALDIVES_TZ,
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(iso));
}

/** "YYYY-MM-DD" for the given instant, as a Maldives calendar day. */
export function maldivesDateKey(iso: string): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: MALDIVES_TZ }).format(new Date(iso));
}

export function isPast(iso: string): boolean {
  return new Date(iso).getTime() < Date.now();
}
