import {
  formatMaldivesDate,
  formatMaldivesDateTime,
  formatMaldivesTime,
  isPast,
  maldivesDateKey,
  maldivesInputToUtcIso,
  utcIsoToMaldivesInput,
} from './datetime';

// Indian/Maldives is a fixed UTC+5 offset, no DST — 20:00 UTC on Jan 1
// always renders as 01:00 on Jan 2 there, regardless of when/where this
// test runs.
const INSTANT = '2026-01-01T20:00:00Z';

describe('Maldives time zone display helpers', () => {
  it("formats a date+time in Indian/Maldives, not the runner's local zone", () => {
    expect(formatMaldivesDateTime(INSTANT)).toBe('02 Jan 2026, 01:00');
  });

  it('formats just the date', () => {
    expect(formatMaldivesDate(INSTANT)).toBe('02 Jan 2026');
  });

  it('formats just the time', () => {
    expect(formatMaldivesTime(INSTANT)).toBe('01:00');
  });

  it('derives the Maldives calendar day, which can differ from the UTC day', () => {
    expect(maldivesDateKey(INSTANT)).toBe('2026-01-02');
  });
});

describe('maldivesInputToUtcIso', () => {
  it('converts a Maldives-local date/time to the equivalent UTC instant', () => {
    // 01:00 on Jan 2 in Maldives (UTC+5) is 20:00 on Jan 1 UTC.
    expect(maldivesInputToUtcIso('2026-01-02', '01:00')).toBe('2026-01-01T20:00:00.000Z');
  });

  it('round-trips with utcIsoToMaldivesInput', () => {
    const iso = maldivesInputToUtcIso('2026-06-15', '14:30');
    expect(iso).not.toBeNull();
    expect(utcIsoToMaldivesInput(iso as string)).toEqual({ date: '2026-06-15', time: '14:30' });
  });

  it('returns null for unparseable input rather than throwing', () => {
    expect(maldivesInputToUtcIso('not-a-date', '99:99')).toBeNull();
  });
});

describe('utcIsoToMaldivesInput', () => {
  it('derives the Maldives-local date and time from a UTC instant', () => {
    expect(utcIsoToMaldivesInput('2026-01-01T20:00:00Z')).toEqual({ date: '2026-01-02', time: '01:00' });
  });
});

describe('isPast', () => {
  it('is true for an instant in the past', () => {
    expect(isPast('2000-01-01T00:00:00Z')).toBe(true);
  });

  it('is false for an instant in the future', () => {
    expect(isPast('2099-01-01T00:00:00Z')).toBe(false);
  });
});
