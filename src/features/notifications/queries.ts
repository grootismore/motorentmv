import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { getSupabase } from '../../lib/supabase';
import type { Database } from '../../lib/database.types';

export type NotificationRow = Database['public']['Tables']['notifications']['Row'];

/** RLS (notifications_select_own) already scopes this to the caller's own
 * rows -- every row here was fanned out server-side by
 * notify_on_booking_event() (20260821160003), never client-created. */
export function useNotifications(userId: string | undefined) {
  return useQuery({
    queryKey: ['notifications', userId],
    enabled: Boolean(userId),
    queryFn: async (): Promise<NotificationRow[]> => {
      const { data, error } = await getSupabase()
        .from('notifications')
        .select('*')
        .eq('recipient_id', userId as string)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
  });
}

export function useMarkNotificationRead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (notificationId: string): Promise<NotificationRow> => {
      const { data, error } = await getSupabase()
        .from('notifications')
        .update({ read_at: new Date().toISOString() })
        .eq('id', notificationId)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['notifications', data.recipient_id] });
    },
  });
}

/** The booking_id a notification's payload carries, if any -- every
 * fan-out branch in notify_on_booking_event() includes it (see
 * 20260821160003), so this is present for every notification type this
 * app currently generates. */
export function notificationBookingId(notification: NotificationRow): string | null {
  const payload = notification.payload as Record<string, unknown>;
  return typeof payload.booking_id === 'string' ? payload.booking_id : null;
}
