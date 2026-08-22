import { View } from 'react-native';

import { GroupedRow, GroupedSection } from '../../components/GroupedSection';
import { Body, Caption } from '../../components/Typography';
import { useTheme } from '../../design-system/ThemeProvider';
import { formatMaldivesDateTime } from '../../lib/datetime';
import { useBookingEvents } from './queries';

const EVENT_LABEL: Record<string, string> = {
  created: 'Requested',
  status_change: 'Status changed',
  inspection_recorded: 'Inspection recorded',
  inspection_acknowledged: 'Inspection acknowledged',
  payment_recorded: 'Payment recorded',
  refund_recorded: 'Refund recorded',
  adjustment_recorded: 'Adjustment recorded',
};

function eventNote(metadata: unknown): string | null {
  if (typeof metadata !== 'object' || metadata === null || Array.isArray(metadata)) return null;
  const note = (metadata as Record<string, unknown>).note;
  return typeof note === 'string' && note.length > 0 ? note : null;
}

/** Shared by both the renter and customer booking-detail screens — the
 * append-only booking_events audit trail (20260821120012/20260821140002)
 * reads the same either side of the transaction. A small filled dot per
 * row stands in for the reference's connected timeline markers — kept
 * simple rather than drawing literal connecting lines between rows. */
export function BookingTimeline({ bookingId }: { bookingId: string }) {
  const theme = useTheme();
  const events = useBookingEvents(bookingId);

  if (!events.data || events.data.length === 0) return null;

  return (
    <GroupedSection title="History">
      <View testID="booking-timeline">
        {events.data.map((event, index) => (
          <GroupedRow key={event.id} isLast={index === events.data.length - 1}>
            <View style={{ flexDirection: 'row', gap: theme.spacing.sm, alignItems: 'flex-start' }}>
              <View
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: theme.radii.full,
                  backgroundColor: theme.colors.lagoonPrimary,
                  marginTop: 6,
                }}
              />
              <View style={{ flex: 1 }}>
                <Body>
                  {EVENT_LABEL[event.event_type] ?? event.event_type}
                  {event.to_status ? ` → ${event.to_status}` : ''}
                </Body>
                <Caption>
                  {formatMaldivesDateTime(event.created_at)}
                  {eventNote(event.metadata) ? ` — ${eventNote(event.metadata)}` : ''}
                </Caption>
              </View>
            </View>
          </GroupedRow>
        ))}
      </View>
    </GroupedSection>
  );
}
