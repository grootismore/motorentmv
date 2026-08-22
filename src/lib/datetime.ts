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

const MALDIVES_OFFSET_MS = 5 * 60 * 60 * 1000;

/**
 * A "YYYY-MM-DD"/"HH:mm" pair, entered as Maldives wall-clock time (e.g.
 * from the search date/time fields), converted to a UTC ISO instant for
 * storage/RPC params. Returns null for unparseable input rather than
 * throwing, so a form can validate before submitting. Pure arithmetic on
 * the fixed +05:00 offset (no DST) rather than parsing a zoned string,
 * to sidestep any host/engine differences in IANA zone-string parsing.
 */
export function maldivesInputToUtcIso(dateStr: string, timeStr: string): string | null {
  const ms = Date.parse(`${dateStr}T${timeStr}:00+05:00`);
  if (Number.isNaN(ms)) return null;
  return new Date(ms).toISOString();
}

/** The inverse of maldivesInputToUtcIso — for pre-filling a form from an
 * existing UTC instant (e.g. editing a previously chosen search range). */
export function utcIsoToMaldivesInput(iso: string): { date: string; time: string } {
  const shifted = new Date(new Date(iso).getTime() + MALDIVES_OFFSET_MS);
  const pad = (n: number) => String(n).padStart(2, '0');
  return {
    date: `${shifted.getUTCFullYear()}-${pad(shifted.getUTCMonth() + 1)}-${pad(shifted.getUTCDate())}`,
    time: `${pad(shifted.getUTCHours())}:${pad(shifted.getUTCMinutes())}`,
  };
}
