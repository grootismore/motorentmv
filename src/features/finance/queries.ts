import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { maldivesMonthRange, maldivesYearMonth, previousMaldivesMonth } from '../../lib/datetime';
import { getSupabase } from '../../lib/supabase';
import type { Database } from '../../lib/database.types';

export type Expense = Database['public']['Tables']['expenses']['Row'];
export type Transaction = Database['public']['Tables']['transactions']['Row'];

/**
 * A minimal, honest read of "income": every `payment` transaction minus
 * every `refund`, across the whole org for the given [startIso, endIso)
 * window -- `adjustment` rows are excluded (they're corrections against
 * an existing charge, not new revenue; see transactions.type's own
 * comment in 20260821120015_transactions.sql). This mirrors the shape
 * Prompt 11 ("renter finance tracking") is expected to formalize with a
 * dedicated category taxonomy; this hook only needs a correct total, not
 * that taxonomy, so it doesn't invent one.
 */
export function useOrgTransactionsInRange(
  organizationId: string | undefined,
  range: { startIso: string; endIso: string },
) {
  return useQuery({
    queryKey: ['org-transactions-range', organizationId, range.startIso, range.endIso],
    enabled: Boolean(organizationId),
    queryFn: async (): Promise<Transaction[]> => {
      const { data, error } = await getSupabase()
        .from('transactions')
        .select('*')
        .eq('organization_id', organizationId as string)
        .gte('occurred_at', range.startIso)
        .lt('occurred_at', range.endIso);
      if (error) throw error;
      return data;
    },
  });
}

export function useOrgExpensesInRange(
  organizationId: string | undefined,
  range: { startIso: string; endIso: string },
) {
  return useQuery({
    queryKey: ['org-expenses-range', organizationId, range.startIso, range.endIso],
    enabled: Boolean(organizationId),
    queryFn: async (): Promise<Expense[]> => {
      const { data, error } = await getSupabase()
        .from('expenses')
        .select('*')
        .eq('organization_id', organizationId as string)
        // occurred_on is a `date`, not a timestamptz -- comparing it
        // against the same UTC instant bounds as transactions.occurred_at
        // is fine here since maldivesMonthRange's bounds always fall
        // exactly on a Maldives-local midnight, which is also a specific
        // calendar date regardless of column type.
        .gte('occurred_on', range.startIso.slice(0, 10))
        .lt('occurred_on', range.endIso.slice(0, 10));
      if (error) throw error;
      return data;
    },
  });
}

/** Integer-laari sum of payments minus refunds -- never a floating-point
 * running total. Exported for direct unit testing rather than only
 * through the full useFinanceSummary hook (which would otherwise need
 * four range-scoped Supabase queries mocked just to exercise this
 * arithmetic). */
export function netIncomeLaari(transactions: Transaction[]): number {
  return transactions.reduce((sum, t) => {
    if (t.type === 'payment') return sum + t.amount_laari;
    if (t.type === 'refund') return sum - t.amount_laari;
    return sum;
  }, 0);
}

export function totalExpensesLaari(expenses: Expense[]): number {
  return expenses.reduce((sum, e) => sum + e.amount_laari, 0);
}

/** Percentage change from `previous` to `current`, rounded to the nearest
 * whole percent. `null` when `previous` is zero -- "up 400%" from a true
 * zero baseline is a meaningless/misleading number, not a real trend, so
 * the UI shows "—" instead of fabricating a percentage from nothing. */
export function percentChange(current: number, previous: number): number | null {
  if (previous === 0) return null;
  return Math.round(((current - previous) / Math.abs(previous)) * 100);
}

export interface FinanceSummary {
  incomeThisMonthLaari: number;
  expensesThisMonthLaari: number;
  netProfitLaari: number;
  incomeChangePercent: number | null;
  expensesChangePercent: number | null;
  netChangePercent: number | null;
}

/**
 * Fetches this month's and last month's transactions/expenses (four small
 * range-scoped queries, each filtered server-side -- never the whole
 * table) and computes the dashboard's finance summary from them. Money is
 * summed as integers throughout; the laari totals are only divided for
 * display (formatMvr), never for the running sums themselves.
 */
export function useFinanceSummary(organizationId: string | undefined) {
  const now = maldivesYearMonth(new Date().toISOString());
  const previous = previousMaldivesMonth(now.year, now.month);
  const currentRange = maldivesMonthRange(now.year, now.month);
  const previousRange = maldivesMonthRange(previous.year, previous.month);

  const currentTransactions = useOrgTransactionsInRange(organizationId, currentRange);
  const previousTransactions = useOrgTransactionsInRange(organizationId, previousRange);
  const currentExpenses = useOrgExpensesInRange(organizationId, currentRange);
  const previousExpenses = useOrgExpensesInRange(organizationId, previousRange);

  const queries = [currentTransactions, previousTransactions, currentExpenses, previousExpenses];
  const isLoading = queries.some((q) => q.isLoading);
  const isError = queries.some((q) => q.isError);
  const error = queries.find((q) => q.error)?.error;
  const isRefetching = queries.some((q) => q.isRefetching);

  const refetch = () => Promise.all(queries.map((q) => q.refetch()));

  let summary: FinanceSummary | undefined;
  if (
    currentTransactions.data &&
    previousTransactions.data &&
    currentExpenses.data &&
    previousExpenses.data
  ) {
    const incomeThisMonthLaari = netIncomeLaari(currentTransactions.data);
    const incomeLastMonthLaari = netIncomeLaari(previousTransactions.data);
    const expensesThisMonthLaari = totalExpensesLaari(currentExpenses.data);
    const expensesLastMonthLaari = totalExpensesLaari(previousExpenses.data);

    summary = {
      incomeThisMonthLaari,
      expensesThisMonthLaari,
      netProfitLaari: incomeThisMonthLaari - expensesThisMonthLaari,
      incomeChangePercent: percentChange(incomeThisMonthLaari, incomeLastMonthLaari),
      expensesChangePercent: percentChange(expensesThisMonthLaari, expensesLastMonthLaari),
      netChangePercent: percentChange(
        incomeThisMonthLaari - expensesThisMonthLaari,
        incomeLastMonthLaari - expensesLastMonthLaari,
      ),
    };
  }

  return { data: summary, isLoading, isError, error, isRefetching, refetch };
}

export interface RecordExpenseInput {
  organizationId: string;
  vehicleId?: string;
  category: string;
  amountLaari: number;
  occurredOn: string;
  note?: string;
}

export function useRecordExpense() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: RecordExpenseInput): Promise<Expense> => {
      const supabase = getSupabase();
      const { data: session } = await supabase.auth.getSession();
      const userId = session.session?.user.id;
      if (!userId) throw new Error('Not signed in');

      const { data, error } = await supabase
        .from('expenses')
        .insert({
          organization_id: input.organizationId,
          vehicle_id: input.vehicleId ?? null,
          category: input.category,
          amount_laari: input.amountLaari,
          occurred_on: input.occurredOn,
          note: input.note ?? null,
          recorded_by: userId,
        })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      // Invalidates every cached month range rather than trying to guess
      // which one this expense landed in -- there are at most a handful
      // of range-keyed queries mounted at once (the dashboard's current +
      // previous month), so this is cheap and can't miss the one that
      // actually needs to refetch.
      queryClient.invalidateQueries({ queryKey: ['org-expenses-range', data.organization_id] });
    },
  });
}
