import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Screen } from '../../../src/components/Screen';
import { minTouchTarget } from '../../../src/design-system/tokens';
import { useTheme } from '../../../src/design-system/ThemeProvider';
import { useAppShell } from '../../../src/lib/app-shell';

export default function CustomerProfile() {
  const theme = useTheme();
  const router = useRouter();
  const { selectExperience } = useAppShell();

  return (
    <Screen title="Profile" description="Documents and profile management land in later phases.">
      <View style={{ gap: theme.spacing.md }}>
        <Pressable
          onPress={() => {
            selectExperience(null);
            router.replace('/');
          }}
          accessibilityRole="button"
          accessibilityLabel="Sign out"
          style={({ pressed }) => [
            styles.button,
            { borderColor: theme.colors.border, borderRadius: theme.radii.md, opacity: pressed ? 0.7 : 1 },
          ]}
        >
          <Text style={{ color: theme.colors.textPrimary, fontWeight: '600' }}>Sign out</Text>
        </Pressable>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  button: {
    minHeight: minTouchTarget,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    alignSelf: 'flex-start',
    paddingHorizontal: 20,
  },
});
