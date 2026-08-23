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

/** Compact weekday + day + month for a picker-style summary (e.g. "Sat, 23
 * Aug") -- used by DateRangeSelector, distinct from formatMaldivesDate
 * (which includes the year, for booking/receipt contexts) so existing
 * call sites of that one are unaffected. Built from two Intl calls rather
 * than one combined format because Intl's own weekday+day+month output
 * has no comma between the weekday and the date. */
export function formatMaldivesDateShort(iso: string): string {
  const date = new Date(iso);
  const weekday = new Intl.DateTimeFormat('en-GB', { timeZone: MALDIVES_TZ, weekday: 'short' }).format(date);
  const dayMonth = new Intl.DateTimeFormat('en-GB', {
    timeZone: MALDIVES_TZ,
    day: 'numeric',
    month: 'short',
  }).format(date);
  return `${weekday}, ${dayMonth}`;
}

/** 12-hour time for a picker-style summary (e.g. "7:00 PM") -- distinct
 * from formatMaldivesTime (24-hour, used in booking/timeline contexts). */
export function formatMaldivesTime12h(iso: string): string {
  return new Intl.DateTimeFormat('en-US', {
    timeZone: MALDIVES_TZ,
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
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

/** { year, month } (month is 1-12) for the Maldives calendar day the given
 * instant falls on -- e.g. for the renter dashboard's finance summary,
 * which buckets transactions/expenses by Maldives-local month, not UTC
 * month (a booking recorded at 2026-09-01T02:00Z is Aug 31 in Maldives). */
export function maldivesYearMonth(iso: string): { year: number; month: number } {
  const [year, month] = maldivesDateKey(iso).split('-').map(Number);
  return { year: year as number, month: month as number };
}

/** Normalizes an (year, month) pair so `month` always lands in 1-12,
 * rolling the year -- `Date.parse`'s ISO-string parsing (what
 * maldivesInputToUtcIso uses) rejects month 0 or 13 outright rather than
 * rolling over, so callers computing "the month after December" must
 * normalize before formatting the string, not rely on the parser to. */
function normalizeYearMonth(year: number, month: number): { year: number; month: number } {
  const zeroBased = month - 1;
  const normalizedYear = year + Math.floor(zeroBased / 12);
  const normalizedMonth = ((zeroBased % 12) + 12) % 12; // handles negative zeroBased too
  return { year: normalizedYear, month: normalizedMonth + 1 };
}

/** The UTC instant range [start, end) covering one Maldives-local calendar
 * month, given any (year, month) pair -- used to fetch/bucket a single
 * month's transactions or expenses without re-deriving offset arithmetic
 * at every call site. `month` outside 1-12 is normalized (rolling the
 * year) before being formatted, since maldivesInputToUtcIso's underlying
 * Date.parse rejects an out-of-range ISO month rather than rolling over. */
export function maldivesMonthRange(year: number, month: number): { startIso: string; endIso: string } {
  const from = normalizeYearMonth(year, month);
  const to = normalizeYearMonth(year, month + 1);
  const start = maldivesInputToUtcIso(`${from.year}-${String(from.month).padStart(2, '0')}-01`, '00:00');
  const end = maldivesInputToUtcIso(`${to.year}-${String(to.month).padStart(2, '0')}-01`, '00:00');
  if (!start || !end) {
    throw new Error(`Invalid year/month for maldivesMonthRange: ${year}/${month}`);
  }
  return { startIso: start, endIso: end };
}

/** The (year, month) pair immediately before the given one -- for a "vs.
 * last month" comparison, so the caller doesn't have to hand-roll the
 * January-rolls-back-to-December-of-the-prior-year case. */
export function previousMaldivesMonth(year: number, month: number): { year: number; month: number } {
  return month === 1 ? { year: year - 1, month: 12 } : { year, month: month - 1 };
}
