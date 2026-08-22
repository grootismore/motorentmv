import { Text, View } from 'react-native';

import { useTheme } from '../../design-system/ThemeProvider';
import { formatMaldivesDateTime } from '../../lib/datetime';
import { useBookingEvents } from './queries';

const sectionTitle = { fontSize: 18, fontWeight: '700' as const };

const EVENT_LABEL: Record<string, string> = {
  created: 'Requested',
  status_change: 'Status changed',
};

function eventNote(metadata: unknown): string | null {
  if (typeof metadata !== 'object' || metadata === null || Array.isArray(metadata)) return null;
  const note = (metadata as Record<string, unknown>).note;
  return typeof note === 'string' && note.length > 0 ? note : null;
}

/** Shared by both the renter and customer booking-detail screens — the
 * append-only booking_events audit trail (20260821120012/20260821140002)
 * reads the same either side of the transaction. */
export function BookingTimeline({ bookingId }: { bookingId: string }) {
  const theme = useTheme();
  const events = useBookingEvents(bookingId);

  if (!events.data || events.data.length === 0) return null;

  return (
    <View style={{ gap: theme.spacing.md }}>
      <Text style={[sectionTitle, { color: theme.colors.textPrimary }]}>History</Text>
      <View style={{ gap: theme.spacing.sm }} testID="booking-timeline">
        {events.data.map((event) => (
          <View key={event.id}>
            <Text style={{ color: theme.colors.textPrimary }}>
              {EVENT_LABEL[event.event_type] ?? event.event_type}
              {event.to_status ? ` → ${event.to_status}` : ''}
            </Text>
            <Text style={{ color: theme.colors.textSecondary, fontSize: 12 }}>
              {formatMaldivesDateTime(event.created_at)}
              {eventNote(event.metadata) ? ` — ${eventNote(event.metadata)}` : ''}
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
}
