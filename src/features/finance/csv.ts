import type { Expense, Transaction } from './queries';

export interface FinanceCsvRow {
  date: string;
  kind: 'Income' | 'Refund' | 'Adjustment' | 'Expense';
  category: string;
  /** Negative for refunds and expenses, positive otherwise -- makes the
   * exported column summable directly into a net total in a spreadsheet. */
  amountLaari: number;
  bookingId: string | null;
  method: string;
  reference: string;
  note: string;
}

const TRANSACTION_KIND: Record<Transaction['type'], FinanceCsvRow['kind']> = {
  payment: 'Income',
  refund: 'Refund',
  adjustment: 'Adjustment',
};

/** Line-item rows for every transaction and expense in the period, sorted
 * oldest-first -- a bookkeeping export needs the individual entries, not
 * just the aggregated totals the report screen displays. */
export function buildFinanceCsvRows(transactions: Transaction[], expenses: Expense[]): FinanceCsvRow[] {
  const rows: FinanceCsvRow[] = transactions.map((t) => {
    const kind = TRANSACTION_KIND[t.type];
    const signedAmount = kind === 'Refund' ? -t.amount_laari : t.amount_laari;
    return {
      date: t.occurred_at.slice(0, 10),
      kind,
      category: t.category ?? (t.booking_id ? 'Booking payment' : 'Uncategorized'),
      amountLaari: signedAmount,
      bookingId: t.booking_id,
      method: t.method ?? '',
      reference: t.reference ?? '',
      note: t.note ?? '',
    };
  });

  for (const e of expenses) {
    rows.push({
      date: e.occurred_on,
      kind: 'Expense',
      category: e.category,
      amountLaari: -e.amount_laari,
      bookingId: null,
      method: '',
      reference: '',
      note: e.note ?? '',
    });
  }

  return rows.sort((a, b) => a.date.localeCompare(b.date));
}

const CSV_HEADER = ['Date', 'Type', 'Category', 'Amount (MVR)', 'Booking ID', 'Method', 'Reference', 'Note'];

function escapeCsvField(value: string): string {
  if (/[",\r\n]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

export function financeCsvRowsToCsv(rows: FinanceCsvRow[]): string {
  const lines = [CSV_HEADER.join(',')];
  for (const row of rows) {
    const amount = (row.amountLaari / 100).toFixed(2);
    lines.push(
      [row.date, row.kind, row.category, amount, row.bookingId ?? '', row.method, row.reference, row.note]
        .map(escapeCsvField)
        .join(','),
    );
  }
  return lines.join('\r\n');
}

export function buildFinanceReportCsv(transactions: Transaction[], expenses: Expense[]): string {
  return financeCsvRowsToCsv(buildFinanceCsvRows(transactions, expenses));
}
