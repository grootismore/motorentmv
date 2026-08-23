import { View } from 'react-native';

import { GroupedRow, GroupedSection } from '../../components/GroupedSection';
import { Body, Caption } from '../../components/Typography';
import { describeActivityEvent, type ActivityBookingEvent } from '../activity/queries';
import { formatMaldivesDateTime } from '../../lib/datetime';

export function RecentActivityCard({ events }: { events: ActivityBookingEvent[] }) {
  if (events.length === 0) {
    return (
      <GroupedSection title="Recent activity" testID="dashboard-recent-activity">
        <Caption>Nothing has happened yet — new requests, payments and handovers will appear here.</Caption>
      </GroupedSection>
    );
  }

  return (
    <GroupedSection title="Recent activity" testID="dashboard-recent-activity">
      <View>
        {events.map((event, index) => (
          <GroupedRow
            key={event.id}
            isLast={index === events.length - 1}
            testID={`activity-item-${event.id}`}
          >
            <Body>{describeActivityEvent(event)}</Body>
            <Caption>{formatMaldivesDateTime(event.created_at)}</Caption>
          </GroupedRow>
        ))}
      </View>
    </GroupedSection>
  );
}
