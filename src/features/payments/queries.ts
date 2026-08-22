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
  bookingId: string;
  organizationId: string;
  type: TransactionType;
  method: PaymentMethod | null;
  amountLaari: number;
  reference?: string;
  note?: string;
}

/**
 * A direct table insert, not an RPC: transactions already grants INSERT to
 * any org member (recording a payment at handover is a normal front-desk
 * task, not owner/manager-only), and the one rule that actually needs
 * enforcing -- a refund can never exceed what was received -- is a
 * database trigger (transactions_guard, 20260821160002) that fires
 * regardless of insert path. An RPC here would only add a round trip, not
 * a stronger guarantee.
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
          booking_id: input.bookingId,
          organization_id: input.organizationId,
          type: input.type,
          method: input.method,
          amount_laari: input.amountLaari,
          reference: input.reference ?? null,
          note: input.note ?? null,
          recorded_by: userId,
        })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['transactions', data.booking_id] });
      queryClient.invalidateQueries({ queryKey: ['booking', data.booking_id] });
      queryClient.invalidateQueries({ queryKey: ['booking-events', data.booking_id] });
    },
  });
}
