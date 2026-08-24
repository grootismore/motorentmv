import {
  formatMaldivesDate,
  formatMaldivesDateShort,
  formatMaldivesDateTime,
  formatMaldivesTime,
  formatMaldivesTime12h,
  isPast,
  maldivesDateKey,
  maldivesInputToUtcIso,
  maldivesMonthRange,
  maldivesYearMonth,
  nextMaldivesMonth,
  previousMaldivesMonth,
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

  it('formats a compact weekday + day + month for picker summaries', () => {
    expect(formatMaldivesDateShort(INSTANT)).toBe('Fri, 2 Jan');
  });

  it('formats a 12-hour time for picker summaries', () => {
    expect(formatMaldivesTime12h(INSTANT)).toBe('1:00 AM');
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

describe('maldivesYearMonth', () => {
  it('derives the Maldives calendar year/month, which can differ from the UTC one', () => {
    // 20:00 UTC on 2026-01-01 is 01:00 on 2026-01-02 in Maldives -- same
    // month here, but this is the same offset rule that matters at a
    // month boundary (e.g. 2026-01-31T20:00Z is Feb 1 in Maldives).
    expect(maldivesYearMonth(INSTANT)).toEqual({ year: 2026, month: 1 });
    expect(maldivesYearMonth('2026-01-31T20:00:00Z')).toEqual({ year: 2026, month: 2 });
  });
});

describe('maldivesMonthRange', () => {
  it('returns the UTC instant bounds of a Maldives-local calendar month', () => {
    // Maldives midnight on 2026-08-01 is 2026-07-31T19:00:00Z.
    expect(maldivesMonthRange(2026, 8)).toEqual({
      startIso: '2026-07-31T19:00:00.000Z',
      endIso: '2026-08-31T19:00:00.000Z',
    });
  });

  it('rolls over into the next year when month is 13 (December -> January)', () => {
    const range = maldivesMonthRange(2026, 13);
    expect(range.startIso).toBe(maldivesMonthRange(2027, 1).startIso);
  });

  it('rolls back into the previous year when month is 0 (January -> December)', () => {
    const range = maldivesMonthRange(2026, 0);
    expect(range.startIso).toBe(maldivesMonthRange(2025, 12).startIso);
  });
});

describe('previousMaldivesMonth', () => {
  it('goes back one month within the same year', () => {
    expect(previousMaldivesMonth(2026, 8)).toEqual({ year: 2026, month: 7 });
  });

  it('rolls back to December of the prior year from January', () => {
    expect(previousMaldivesMonth(2026, 1)).toEqual({ year: 2025, month: 12 });
  });
});

describe('nextMaldivesMonth', () => {
  it('goes forward one month within the same year', () => {
    expect(nextMaldivesMonth(2026, 8)).toEqual({ year: 2026, month: 9 });
  });

  it('rolls forward to January of the next year from December', () => {
    expect(nextMaldivesMonth(2026, 12)).toEqual({ year: 2027, month: 1 });
  });
});
