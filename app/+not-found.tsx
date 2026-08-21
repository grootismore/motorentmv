import { Link } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { Screen } from '../src/components/Screen';
import { useTheme } from '../src/design-system/ThemeProvider';

export default function NotFound() {
  const theme = useTheme();

  return (
    <Screen title="Page not found" description="That screen doesn't exist.">
      <View style={[styles.link, { marginTop: theme.spacing.md }]}>
        <Link href="/" style={{ color: theme.colors.primary }}>
          Go to start
        </Link>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  link: {
    alignSelf: 'flex-start',
  },
});
