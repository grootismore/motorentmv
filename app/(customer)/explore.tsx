import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Link, useRouter } from 'expo-router';
import { Pressable, ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Body, LargeTitle } from '../../src/components/Typography';
import { useTheme } from '../../src/design-system/ThemeProvider';
import { SearchForm, type SearchFormValues } from '../../src/features/discovery/SearchForm';

/**
 * The one screen that bypasses the shared Screen shell: the Ocean Glass
 * reference gives Explore a full-bleed ocean-gradient hero header (title
 * + search panel both sitting on it), unlike every other screen's flat
 * pearl background + compact nav title. Every other customer/renter
 * screen still uses Screen.
 */
export default function Explore() {
  const theme = useTheme();
  const router = useRouter();

  const handleSubmit = (values: SearchFormValues) => {
    router.push({
      pathname: '/search',
      params: {
        location: values.location || undefined,
        startsAt: values.startsAtUtc,
        endsAt: values.endsAtUtc,
      },
    });
  };

  return (
    <SafeAreaView
      style={{ flex: 1, backgroundColor: theme.colors.pearlBackground }}
      edges={['top', 'left', 'right']}
    >
      <ScrollView contentContainerStyle={{ paddingBottom: 96 }}>
        <LinearGradient
          colors={[theme.colors.oceanBackground, theme.colors.oceanDeep]}
          style={{
            paddingHorizontal: 20,
            paddingTop: theme.spacing.md,
            paddingBottom: theme.spacing.xxl,
            borderBottomLeftRadius: theme.radii.sheet,
            borderBottomRightRadius: theme.radii.sheet,
          }}
        >
          <View
            style={{
              flexDirection: 'row',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: theme.spacing.xl,
            }}
          >
            <Body color={theme.colors.textInverse} style={{ fontWeight: '700' }}>
              MotoRent MV
            </Body>
            <Link href="/notifications" asChild>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Notifications"
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: theme.radii.full,
                  backgroundColor: 'rgba(255,255,255,0.16)',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Ionicons name="notifications-outline" size={18} color={theme.colors.textInverse} />
              </Pressable>
            </Link>
          </View>

          <LargeTitle color={theme.colors.textInverse} style={{ marginBottom: theme.spacing.lg }}>
            Find your ride
          </LargeTitle>

          <SearchForm onSubmit={handleSubmit} submitLabel="Search availability" />
        </LinearGradient>
      </ScrollView>
    </SafeAreaView>
  );
}
