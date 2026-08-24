import { buildFinanceCsvRows, buildFinanceReportCsv, financeCsvRowsToCsv } from './csv';
import type { Expense, Transaction } from './queries';

function transaction(overrides: Partial<Transaction>): Transaction {
  return {
    id: 'txn-1',
    organization_id: 'org-1',
    booking_id: null,
    type: 'payment',
    method: 'cash',
    amount_laari: 10000,
    reference: null,
    note: null,
    recorded_by: 'user-1',
    occurred_at: '2026-08-05T10:00:00Z',
    created_at: '2026-08-05T10:00:00Z',
    category: null,
    ...overrides,
  };
}

function expense(overrides: Partial<Expense>): Expense {
  return {
    id: 'exp-1',
    organization_id: 'org-1',
    vehicle_id: null,
    category: 'Fuel',
    amount_laari: 5000,
    occurred_on: '2026-08-03',
    note: null,
    recorded_by: 'user-1',
    created_at: '2026-08-03T10:00:00Z',
    updated_at: '2026-08-03T10:00:00Z',
    ...overrides,
  };
}

describe('buildFinanceCsvRows', () => {
  it('signs refunds and expenses negative, income and adjustments positive', () => {
    const rows = buildFinanceCsvRows(
      [
        transaction({ id: 't-income', type: 'payment', amount_laari: 20000, booking_id: 'b-1' }),
        transaction({ id: 't-refund', type: 'refund', amount_laari: 5000, booking_id: 'b-1' }),
        transaction({ id: 't-adjustment', type: 'adjustment', amount_laari: 1000, booking_id: 'b-1' }),
      ],
      [expense({ id: 'e-1', amount_laari: 3000 })],
    );

    const byId = Object.fromEntries(rows.map((r) => [r.category + r.date, r]));
    expect(rows.find((r) => r.kind === 'Income')?.amountLaari).toBe(20000);
    expect(rows.find((r) => r.kind === 'Refund')?.amountLaari).toBe(-5000);
    expect(rows.find((r) => r.kind === 'Adjustment')?.amountLaari).toBe(1000);
    expect(rows.find((r) => r.kind === 'Expense')?.amountLaari).toBe(-3000);
    expect(byId).toBeTruthy();
  });

  it('labels standalone income by its category, and booking-linked payments as "Booking payment"', () => {
    const rows = buildFinanceCsvRows(
      [
        transaction({ id: 't-1', booking_id: 'b-1', category: null }),
        transaction({ id: 't-2', booking_id: null, category: 'Parts sale' }),
      ],
      [],
    );

    expect(rows.find((r) => r.bookingId === 'b-1')?.category).toBe('Booking payment');
    expect(rows.find((r) => r.bookingId === null)?.category).toBe('Parts sale');
  });

  it('sorts rows oldest-first across transactions and expenses combined', () => {
    const rows = buildFinanceCsvRows(
      [transaction({ id: 't-1', occurred_at: '2026-08-20T00:00:00Z' })],
      [expense({ id: 'e-1', occurred_on: '2026-08-01' })],
    );

    expect(rows.map((r) => r.date)).toEqual(['2026-08-01', '2026-08-20']);
  });
});

describe('financeCsvRowsToCsv', () => {
  it('emits a header row and one line per entry, formatting laari as a two-decimal MVR amount', () => {
    const csv = financeCsvRowsToCsv(
      buildFinanceCsvRows([transaction({ id: 't-1', amount_laari: 12345, booking_id: 'b-1' })], []),
    );

    const lines = csv.split('\r\n');
    expect(lines[0]).toBe('Date,Type,Category,Amount (MVR),Booking ID,Method,Reference,Note');
    expect(lines[1]).toBe('2026-08-05,Income,Booking payment,123.45,b-1,cash,,');
  });

  it('quotes fields containing commas, quotes, or newlines', () => {
    const csv = financeCsvRowsToCsv(
      buildFinanceCsvRows(
        [transaction({ id: 't-1', note: 'Paid in full, thanks "boss"', booking_id: 'b-1' })],
        [],
      ),
    );

    expect(csv).toContain('"Paid in full, thanks ""boss"""');
  });
});

describe('buildFinanceReportCsv', () => {
  it('combines building and serializing into a single CSV string', () => {
    const csv = buildFinanceReportCsv(
      [transaction({ id: 't-1', amount_laari: 10000, booking_id: 'b-1' })],
      [expense({ id: 'e-1', amount_laari: 2000 })],
    );

    expect(csv.split('\r\n')).toHaveLength(3);
  });
});
