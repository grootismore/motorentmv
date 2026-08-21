import {
  formatMaldivesDate,
  formatMaldivesDateTime,
  formatMaldivesTime,
  isPast,
  maldivesDateKey,
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

describe('isPast', () => {
  it('is true for an instant in the past', () => {
    expect(isPast('2000-01-01T00:00:00Z')).toBe(true);
  });

  it('is false for an instant in the future', () => {
    expect(isPast('2099-01-01T00:00:00Z')).toBe(false);
  });
});
