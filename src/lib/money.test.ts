import { formatMvr } from './money';

describe('formatMvr', () => {
  it('formats integer laari as MVR with two decimal places', () => {
    expect(formatMvr(100000)).toBe('MVR 1,000.00');
  });

  it('formats zero', () => {
    expect(formatMvr(0)).toBe('MVR 0.00');
  });

  it('handles a non-round laari amount', () => {
    expect(formatMvr(1250)).toBe('MVR 12.50');
  });

  it('renders a dash for null/undefined (no total yet)', () => {
    expect(formatMvr(null)).toBe('—');
    expect(formatMvr(undefined)).toBe('—');
  });
});
