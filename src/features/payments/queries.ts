import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { getSupabase } from '../../lib/supabase';
import type { Database } from '../../lib/database.types';

export type Transaction = Database['public']['Tables']['transactions']['Row'];
export type TransactionType = Database['public']['Enums']['transaction_type'];
export type PaymentMethod = Database['public']['Enums']['payment_method'];

/** RLS (transactions_select) already scopes what each caller sees: full
 * visibility for owner/manager, only what they personally recorded for
 * other staff, and a customer sees their own booking's entries as
 * receipts -- this hook doesn't need to know which case applies. */
export function useTransactions(bookingId: string | undefined) {
  return useQuery({
    queryKey: ['transactions', bookingId],
    enabled: Boolean(bookingId),
    queryFn: async (): Promise<Transaction[]> => {
      const { data, error } = await getSupabase()
        .from('transactions')
        .select('*')
        .eq('booking_id', bookingId as string)
        .order('occurred_at', { ascending: true });
      if (error) throw error;
      return data;
    },
  });
}

export interface RecordTransactionInput {
  /** Optional (20260821200001): a refund or adjustment always corrects a
   * specific existing charge and still requires a booking, but a
   * 'payment' may stand alone -- income with nothing to attach it to
   * (a parts sale, a delivery fee, anything not tied to a specific
   * rental). Recording one without a booking requires financial access
   * (owner/manager), enforced server-side. */
  bookingId?: string;
  organizationId: string;
  type: TransactionType;
  method: PaymentMethod | null;
  amountLaari: number;
  reference?: string;
  note?: string;
  /** Only meaningful without a booking -- a booking-linked payment
   * already has context (which booking, which customer). Same free-text
   * convention as expenses.category. */
  category?: string;
}

/**
 * A direct table insert, not an RPC: transactions already grants INSERT to
 * any org member (recording a payment at handover is a normal front-desk
 * task, not owner/manager-only), and the rules that actually need
 * enforcing -- a refund can never exceed what was received, standalone
 * income requires financial access -- are database triggers/RLS
 * (transactions_guard, 20260821160002; transactions_insert_org_member,
 * 20260821200001) that fire regardless of insert path. An RPC here would
 * only add a round trip, not a stronger guarantee.
 */
export function useRecordTransaction() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: RecordTransactionInput): Promise<Transaction> => {
      const supabase = getSupabase();
      const { data: session } = await supabase.auth.getSession();
      const userId = session.session?.user.id;
      if (!userId) throw new Error('Not signed in');

      const { data, error } = await supabase
        .from('transactions')
        .insert({
          booking_id: input.bookingId ?? null,
          organization_id: input.organizationId,
          type: input.type,
          method: input.method,
          amount_laari: input.amountLaari,
          reference: input.reference ?? null,
          note: input.note ?? null,
          category: input.category ?? null,
          recorded_by: userId,
        })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      if (data.booking_id) {
        queryClient.invalidateQueries({ queryKey: ['transactions', data.booking_id] });
        queryClient.invalidateQueries({ queryKey: ['booking', data.booking_id] });
        queryClient.invalidateQueries({ queryKey: ['booking-events', data.booking_id] });
      }
      queryClient.invalidateQueries({ queryKey: ['org-transactions-range', data.organization_id] });
    },
  });
}
