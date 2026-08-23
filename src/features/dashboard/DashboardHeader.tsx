import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Alert, Pressable, View } from 'react-native';

import { minTouchTarget } from '../../design-system/tokens';
import { useTheme } from '../../design-system/ThemeProvider';
import { signOut } from '../auth/session';
import { Caption } from '../../components/Typography';

interface DashboardHeaderProps {
  businessName: string;
  location: string | null;
  unreadNotificationCount: number;
}

/**
 * The notification button and account menu live here, next to the
 * business name -- Screen's own title row (headerRight) is where these
 * render, not a separately-positioned floating bar, so there's no manual
 * safe-area math to get right.
 */
export function DashboardHeader({ businessName, location, unreadNotificationCount }: DashboardHeaderProps) {
  const theme = useTheme();
  const router = useRouter();

  const openAccountMenu = () => {
    // A native UIAlertController action list -- the same Alert.alert
    // pattern already used for sign-out confirmation elsewhere in this
    // app (app/(renter)/(tabs)/more/index.tsx), not a third-party context-
    // menu package: none is installed, and adding one for a single menu
    // wasn't justified (see AGENTS.md's "before adding a native
    // dependency" checklist). This IS the native list Apple/Android
    // present for an action sheet, not an imitation of one.
    Alert.alert(businessName, undefined, [
      { text: 'Staff', onPress: () => router.push('/more/staff') },
      {
        text: 'Sign out',
        style: 'destructive',
        onPress: () => {
          void signOut();
        },
      },
      { text: 'Cancel', style: 'cancel' },
    ]);
  };

  return (
    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
      <View
        accessibilityRole="button"
        accessibilityLabel="Notifications"
        accessibilityHint={
          unreadNotificationCount > 0 ? `${unreadNotificationCount} unread` : 'No unread notifications'
        }
      >
        <Pressable
          testID="dashboard-notifications-button"
          onPress={() => router.push('/notifications')}
          style={{
            minWidth: minTouchTarget,
            minHeight: minTouchTarget,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <View>
            <Ionicons name="notifications-outline" size={24} color={theme.colors.textPrimary} />
            {unreadNotificationCount > 0 ? (
              <View
                testID="dashboard-notifications-badge"
                style={{
                  position: 'absolute',
                  top: -2,
                  right: -2,
                  minWidth: 16,
                  height: 16,
                  borderRadius: theme.radii.full,
                  backgroundColor: theme.colors.destructive,
                  alignItems: 'center',
                  justifyContent: 'center',
                  paddingHorizontal: 3,
                }}
              >
                <Caption style={{ color: theme.colors.textInverse, fontSize: 10, lineHeight: 12 }}>
                  {unreadNotificationCount > 99 ? '99+' : unreadNotificationCount}
                </Caption>
              </View>
            ) : null}
          </View>
        </Pressable>
      </View>

      <Pressable
        testID="dashboard-account-menu-button"
        accessibilityRole="button"
        accessibilityLabel="Account menu"
        onPress={openAccountMenu}
        style={{
          minWidth: minTouchTarget,
          minHeight: minTouchTarget,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Ionicons name="person-circle-outline" size={26} color={theme.colors.textPrimary} />
      </Pressable>
    </View>
  );
}

/** Rendered above the title row by the dashboard screen itself (Screen's
 * title already carries the business name via `title`) -- this is just
 * the location line underneath it. Kept as a tiny standalone export so
 * the screen can place it exactly under the title without threading it
 * through Screen's own props. */
export function DashboardLocationLine({ location }: { location: string | null }) {
  const theme = useTheme();
  if (!location) return null;
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: theme.spacing.xxs,
        marginTop: -theme.spacing.xs,
      }}
    >
      <Ionicons name="location-outline" size={13} color={theme.colors.textTertiary} />
      <Caption>{location}</Caption>
    </View>
  );
}
