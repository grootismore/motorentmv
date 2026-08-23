import { useRouter } from 'expo-router';
import { useState } from 'react';
import { FlatList, Pressable, View } from 'react-native';

import { Button } from '../../src/components/Button';
import { Screen } from '../../src/components/Screen';
import { EmptyState } from '../../src/components/states/EmptyState';
import { ErrorState } from '../../src/components/states/ErrorState';
import { LoadingState } from '../../src/components/states/LoadingState';
import { Body, Caption } from '../../src/components/Typography';
import { useTheme } from '../../src/design-system/ThemeProvider';
import { useAuth } from '../../src/features/auth/AuthProvider';
import { InlineAuthGate } from '../../src/features/auth/InlineAuthGate';
import { expoNotificationService } from '../../src/features/notifications/service';
import {
  notificationBookingId,
  useMarkNotificationRead,
  useNotifications,
  type NotificationRow,
} from '../../src/features/notifications/queries';
import { formatMaldivesDateTime } from '../../src/lib/datetime';

const TYPE_LABEL: Record<string, string> = {
  booking_requested: 'New booking request',
  booking_accepted: 'Booking accepted',
  booking_declined: 'Booking declined',
  booking_needs_info: 'More information requested',
  booking_ready: 'Booking marked ready',
  booking_active: 'Rental started',
  booking_completed: 'Rental completed',
  booking_cancelled: 'Booking cancelled',
  booking_no_show: 'Marked as a no-show',
  inspection_recorded: 'Inspection recorded',
  payment_recorded: 'Payment received',
  refund_recorded: 'Refund issued',
  adjustment_recorded: 'Adjustment recorded',
};

function NotificationRowItem({
  notification,
  onPress,
}: {
  notification: NotificationRow;
  onPress: () => void;
}) {
  const theme = useTheme();
  const isUnread = !notification.read_at;

  return (
    <Pressable
      testID={`notification-item-${notification.id}`}
      onPress={onPress}
      style={({ pressed }) => ({
        paddingVertical: theme.spacing.sm,
        borderBottomWidth: 1,
        borderBottomColor: theme.colors.divider,
        opacity: pressed ? 0.85 : 1,
      })}
    >
      <Body style={{ fontWeight: isUnread ? '700' : '400' }}>
        {TYPE_LABEL[notification.type] ?? notification.type}
        {isUnread ? ' •' : ''}
      </Body>
      <Caption>{formatMaldivesDateTime(notification.created_at)}</Caption>
    </Pressable>
  );
}

export default function Notifications() {
  const theme = useTheme();
  const router = useRouter();
  const { session } = useAuth();
  const notifications = useNotifications(session?.user.id);
  const markRead = useMarkNotificationRead();
  const [testNotificationMessage, setTestNotificationMessage] = useState<string | undefined>();

  if (session === undefined) {
    return <LoadingState label="Loading…" />;
  }

  if (session === null) {
    return (
      <Screen title="Notifications" scroll>
        <InlineAuthGate title="Sign in" description="Sign in to see your notifications." />
      </Screen>
    );
  }

  const handlePress = (notification: NotificationRow) => {
    if (!notification.read_at) {
      markRead.mutate(notification.id);
    }
    const bookingId = notificationBookingId(notification);
    if (bookingId) {
      router.push({ pathname: '/bookings/[bookingId]', params: { bookingId } });
    }
  };

  const handleSendTest = async () => {
    setTestNotificationMessage(undefined);
    const granted = await expoNotificationService.requestPermission();
    if (!granted) {
      setTestNotificationMessage('Notification permission was not granted.');
      return;
    }
    await expoNotificationService.scheduleTestNotification({
      title: 'RideFinder',
      body: 'This is a test notification — if you can see this, local notifications are working.',
    });
    setTestNotificationMessage('Test notification sent.');
  };

  return (
    <Screen title="Notifications" scroll={false}>
      <View style={{ gap: theme.spacing.md, flex: 1 }}>
        <Button
          testID="notifications-send-test"
          label="Send test notification"
          variant="secondary"
          onPress={handleSendTest}
        />
        {testNotificationMessage ? (
          <Caption testID="notifications-test-message">{testNotificationMessage}</Caption>
        ) : null}

        {notifications.isLoading ? <LoadingState label="Loading notifications…" /> : null}
        {notifications.isError ? (
          <ErrorState message={notifications.error.message} onRetry={() => notifications.refetch()} />
        ) : null}
        {notifications.data && notifications.data.length === 0 ? (
          <EmptyState
            icon="notifications-outline"
            title="No notifications yet"
            message="Activity on your bookings will show up here."
          />
        ) : null}
        {notifications.data && notifications.data.length > 0 ? (
          <FlatList
            testID="notifications-list"
            data={notifications.data}
            keyExtractor={(item) => item.id}
            onRefresh={() => notifications.refetch()}
            refreshing={notifications.isRefetching}
            renderItem={({ item }) => (
              <NotificationRowItem notification={item} onPress={() => handlePress(item)} />
            )}
          />
        ) : null}
      </View>
    </Screen>
  );
}
