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

/** A dedicated `head: true, count: 'exact'` query rather than deriving
 * from useNotifications' full list -- the dashboard/header badge needs
 * only a number, not every row's payload, and this stays cheap even once
 * a long-lived account has hundreds of historical notifications. */
export function useUnreadNotificationCount(userId: string | undefined) {
  return useQuery({
    queryKey: ['notifications-unread-count', userId],
    enabled: Boolean(userId),
    queryFn: async (): Promise<number> => {
      const { count, error } = await getSupabase()
        .from('notifications')
        .select('*', { count: 'exact', head: true })
        .eq('recipient_id', userId as string)
        .is('read_at', null);
      if (error) throw error;
      return count ?? 0;
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
      queryClient.invalidateQueries({ queryKey: ['notifications-unread-count', data.recipient_id] });
    },
  });
}

/** Bulk read, for the inbox's "Mark all read" action -- the same RLS
 * policy that lets a recipient flip their own read_at one row at a time
 * (notifications_update_own_read_state) covers this unfiltered-by-id
 * update too, since it's still scoped to `recipient_id = auth.uid()`. */
export function useMarkAllNotificationsRead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (userId: string): Promise<void> => {
      const { error } = await getSupabase()
        .from('notifications')
        .update({ read_at: new Date().toISOString() })
        .eq('recipient_id', userId)
        .is('read_at', null);
      if (error) throw error;
    },
    onSuccess: (_data, userId) => {
      queryClient.invalidateQueries({ queryKey: ['notifications', userId] });
      queryClient.invalidateQueries({ queryKey: ['notifications-unread-count', userId] });
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

/** The free-text note/reason a renter attached to a decline, needs_info,
 * cancel or no_show action, if any -- notify_on_booking_event() merges the
 * triggering booking_events row's `metadata` (which is where
 * decline_booking/mark_booking_needs_info/cancel_booking/
 * mark_booking_no_show put it, see 20260821140003/20260821190001) straight
 * into the notification's payload, so it's already here; this just reads
 * it back, the same way BookingTimeline's eventNote() reads it off a
 * booking_events row. */
export function notificationNote(notification: NotificationRow): string | null {
  const payload = notification.payload as Record<string, unknown>;
  return typeof payload.note === 'string' && payload.note.length > 0 ? payload.note : null;
}
