import {
  groupExpensesByCategory,
  groupIncomeBySource,
  netIncomeLaari,
  percentChange,
  totalExpensesLaari,
} from './queries';
import type { Expense, Transaction } from './queries';

// This suite only exercises the pure functions above, but ./queries also
// exports hooks that pull in the real Supabase client (and, transitively,
// AsyncStorage) at import time -- mock it out the same way
// PaymentLedger.test.tsx/InspectionSection.test.tsx do.
jest.mock('../../lib/supabase', () => ({
  getSupabase: () => ({}),
}));

function transaction(overrides: Partial<Transaction>): Transaction {
  return {
    id: 't1',
    booking_id: 'b1',
    organization_id: 'org-1',
    type: 'payment',
    method: 'cash',
    amount_laari: 0,
    reference: null,
    note: null,
    category: null,
    recorded_by: 'user-1',
    occurred_at: '2026-08-01T00:00:00Z',
    created_at: '2026-08-01T00:00:00Z',
    ...overrides,
  };
}

function expense(overrides: Partial<Expense>): Expense {
  return {
    id: 'e1',
    organization_id: 'org-1',
    vehicle_id: null,
    category: 'Fuel',
    amount_laari: 0,
    occurred_on: '2026-08-01',
    note: null,
    recorded_by: 'user-1',
    created_at: '2026-08-01T00:00:00Z',
    updated_at: '2026-08-01T00:00:00Z',
    ...overrides,
  };
}

describe('netIncomeLaari', () => {
  it('sums payments and subtracts refunds, as integer laari', () => {
    const total = netIncomeLaari([
      transaction({ type: 'payment', amount_laari: 100000 }),
      transaction({ type: 'payment', amount_laari: 50000 }),
      transaction({ type: 'refund', amount_laari: 20000 }),
    ]);
    expect(total).toBe(130000);
  });

  it('excludes adjustments -- they are corrections, not new revenue', () => {
    const total = netIncomeLaari([
      transaction({ type: 'payment', amount_laari: 100000 }),
      transaction({ type: 'adjustment', method: null, amount_laari: 999999 }),
    ]);
    expect(total).toBe(100000);
  });

  it('is zero for an empty list', () => {
    expect(netIncomeLaari([])).toBe(0);
  });
});

describe('totalExpensesLaari', () => {
  it('sums every expense as integer laari', () => {
    expect(totalExpensesLaari([expense({ amount_laari: 30000 }), expense({ amount_laari: 15000 })])).toBe(
      45000,
    );
  });
});

describe('groupIncomeBySource', () => {
  it('sums booking-linked payments separately from refunds', () => {
    const result = groupIncomeBySource([
      transaction({ type: 'payment', booking_id: 'b1', amount_laari: 100000 }),
      transaction({ type: 'payment', booking_id: 'b2', amount_laari: 50000 }),
      transaction({ type: 'refund', booking_id: 'b1', amount_laari: 20000 }),
    ]);
    expect(result.bookingPaymentsLaari).toBe(150000);
    expect(result.refundsLaari).toBe(20000);
    expect(result.standalone).toEqual([]);
  });

  it('groups standalone payments by category, largest first', () => {
    const result = groupIncomeBySource([
      transaction({ type: 'payment', booking_id: null, category: 'Parts sale', amount_laari: 10000 }),
      transaction({ type: 'payment', booking_id: null, category: 'Delivery fee', amount_laari: 30000 }),
      transaction({ type: 'payment', booking_id: null, category: 'Parts sale', amount_laari: 5000 }),
    ]);
    expect(result.standalone).toEqual([
      { category: 'Delivery fee', amountLaari: 30000 },
      { category: 'Parts sale', amountLaari: 15000 },
    ]);
  });

  it('falls back to "Uncategorized" for a standalone payment with no category', () => {
    const result = groupIncomeBySource([
      transaction({ type: 'payment', booking_id: null, category: null, amount_laari: 5000 }),
    ]);
    expect(result.standalone).toEqual([{ category: 'Uncategorized', amountLaari: 5000 }]);
  });

  it('excludes adjustments, same as netIncomeLaari', () => {
    const result = groupIncomeBySource([
      transaction({ type: 'adjustment', method: null, booking_id: 'b1', amount_laari: 999999 }),
    ]);
    expect(result.bookingPaymentsLaari).toBe(0);
    expect(result.refundsLaari).toBe(0);
    expect(result.standalone).toEqual([]);
  });
});

describe('groupExpensesByCategory', () => {
  it('sums expenses per category, largest first', () => {
    const result = groupExpensesByCategory([
      expense({ category: 'Fuel', amount_laari: 10000 }),
      expense({ category: 'Maintenance', amount_laari: 50000 }),
      expense({ category: 'Fuel', amount_laari: 8000 }),
    ]);
    expect(result).toEqual([
      { category: 'Maintenance', amountLaari: 50000 },
      { category: 'Fuel', amountLaari: 18000 },
    ]);
  });

  it('is empty for no expenses', () => {
    expect(groupExpensesByCategory([])).toEqual([]);
  });
});

describe('percentChange', () => {
  it('computes a rounded whole-percent increase', () => {
    expect(percentChange(120, 100)).toBe(20);
  });

  it('computes a rounded whole-percent decrease as negative', () => {
    expect(percentChange(80, 100)).toBe(-20);
  });

  it('is null when the previous value is zero -- no baseline to compare against', () => {
    expect(percentChange(500, 0)).toBeNull();
  });

  it('uses the absolute previous value as the denominator for a negative baseline', () => {
    // A net loss last month (-100) that becomes a net profit this month
    // (50): the magnitude of change should read as positive, not divide
    // by a negative number and flip the sign nonsensically.
    expect(percentChange(50, -100)).toBe(150);
  });
});
